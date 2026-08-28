"""
Checkout / order-creation service layer.

Business-critical rules enforced here:
  * The backend is the sole source of truth for prices and totals — the
    frontend never supplies a price, and nothing here trusts client input
    beyond product IDs and quantities.
  * Stock is locked with select_for_update() and decremented atomically to
    prevent overselling under concurrent checkouts.
  * A single customer cart may span several vendors; we fan the cart out into
    one VendorOrder per vendor under a shared parent Order, so each vendor
    only ever sees/manages their own slice.
"""
import logging
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Order, VendorOrder, OrderItem, PaymentMethod, PaymentStatus
from apps.products.models import Product
from apps.cart.models import Cart

logger = logging.getLogger("marketplace")


class CheckoutError(Exception):
    pass


@transaction.atomic
def create_order_from_cart(*, customer, shipping_info: dict, payment_method: str) -> Order:
    try:
        cart = Cart.objects.select_related("customer").get(customer=customer)
    except Cart.DoesNotExist:
        raise CheckoutError("Your cart is empty.")

    cart_items = list(cart.items.select_related("product", "product__vendor").order_by("id"))
    if not cart_items:
        raise CheckoutError("Your cart is empty.")

    # Lock every product row involved to guard against concurrent stock changes.
    product_ids = [item.product_id for item in cart_items]
    locked_products = {
        p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)
    }

    subtotal = Decimal("0.00")
    items_by_vendor = {}

    for cart_item in cart_items:
        product = locked_products[cart_item.product_id]
        if not product.is_publicly_visible:
            raise CheckoutError(f"'{product.name}' is no longer available.")
        if cart_item.quantity > product.stock:
            raise CheckoutError(f"Only {product.stock} unit(s) of '{product.name}' left in stock.")

        line_subtotal = product.price * cart_item.quantity
        subtotal += line_subtotal
        items_by_vendor.setdefault(product.vendor_id, []).append((product, cart_item.quantity, line_subtotal))

    shipping_cost = Decimal("0.00")  # flat-rate free shipping; extend here if needed
    total = subtotal + shipping_cost

    order = Order.objects.create(
        customer=customer,
        shipping_full_name=shipping_info["full_name"],
        shipping_phone=shipping_info["phone"],
        shipping_address=shipping_info["address"],
        shipping_city=shipping_info["city"],
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=total,
        payment_method=payment_method,
        payment_status=PaymentStatus.PENDING,
    )

    for vendor_id, entries in items_by_vendor.items():
        vendor_subtotal = sum((line for _, _, line in entries), start=Decimal("0.00"))
        vendor_order = VendorOrder.objects.create(order=order, vendor_id=vendor_id, subtotal=vendor_subtotal)
        for product, qty, line_subtotal in entries:
            OrderItem.objects.create(
                vendor_order=vendor_order,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                vendor_name=product.vendor.shop_name,
                unit_price=product.price,
                quantity=qty,
                line_subtotal=line_subtotal,
            )
            # Decrement stock now to prevent overselling; COD orders reserve stock
            # immediately, eSewa orders reserve it too and are released on failure.
            product.stock -= qty
            product.save(update_fields=["stock", "status"])

    cart.items.all().delete()

    if payment_method == PaymentMethod.COD:
        order.payment_status = PaymentStatus.PENDING  # settled on delivery
        order.save(update_fields=["payment_status"])
        for vo in order.vendor_orders.all():
            vo.status = "CONFIRMED"
            vo.save(update_fields=["status"])

    logger.info("Order %s created for %s (%s vendors, total=%s, method=%s)",
                order.order_number, customer.email, len(items_by_vendor), total, payment_method)
    return order


@transaction.atomic
def release_stock_for_failed_order(order: Order):
    """Restore stock and cancel an order whose payment ultimately failed."""
    from django.db.models import F

    for vendor_order in order.vendor_orders.select_related("vendor"):
        for item in vendor_order.items.select_related("product"):
            if item.product_id:
                Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
        vendor_order.status = "CANCELLED"
        vendor_order.save(update_fields=["status"])
    order.payment_status = PaymentStatus.FAILED
    order.save(update_fields=["payment_status"])
    logger.warning("Order %s marked FAILED; stock released.", order.order_number)
