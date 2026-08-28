import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.common.tests.factories import UserFactory, VendorFactory, ProductFactory
from apps.cart.models import Cart, CartItem
from apps.orders.services import create_order_from_cart, CheckoutError
from apps.orders.models import PaymentMethod, Order

pytestmark = pytest.mark.django_db


def _shipping():
    return {"full_name": "Jane Doe", "phone": "9800000000", "address": "Somewhere", "city": "Kathmandu"}


class TestCheckoutService:
    def test_single_vendor_checkout_creates_one_vendor_order(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(price=Decimal("100.00"), stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=2)

        order = create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)
        assert order.total == Decimal("200.00")
        assert order.vendor_orders.count() == 1
        product.refresh_from_db()
        assert product.stock == 8  # decremented

    def test_multi_vendor_cart_splits_into_separate_vendor_orders(self):
        customer = UserFactory(role=Role.CUSTOMER)
        vendor_a = VendorFactory()
        vendor_b = VendorFactory()
        product_a = ProductFactory(vendor=vendor_a, price=Decimal("50.00"), stock=10)
        product_b = ProductFactory(vendor=vendor_b, price=Decimal("75.00"), stock=10)

        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product_a, quantity=1)
        CartItem.objects.create(cart=cart, product=product_b, quantity=2)

        order = create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)
        assert order.vendor_orders.count() == 2
        assert order.total == Decimal("200.00")  # 50 + 150

        vendor_ids = set(order.vendor_orders.values_list("vendor_id", flat=True))
        assert vendor_ids == {vendor_a.id, vendor_b.id}

    def test_checkout_fails_when_stock_insufficient(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=1)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=5)

        with pytest.raises(CheckoutError):
            create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

    def test_checkout_fails_on_empty_cart(self):
        customer = UserFactory(role=Role.CUSTOMER)
        Cart.objects.create(customer=customer)
        with pytest.raises(CheckoutError):
            create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

    def test_cart_is_cleared_after_successful_checkout(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=1)

        create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)
        assert cart.items.count() == 0

    def test_order_item_preserves_historical_snapshot(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(name="Original Name", price=Decimal("100.00"), stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        order = create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

        # Product later renamed/repriced — historical order data must not change.
        product.name = "Renamed Product"
        product.price = Decimal("999.00")
        product.save()

        item = order.vendor_orders.first().items.first()
        assert item.product_name == "Original Name"
        assert item.unit_price == Decimal("100.00")


class TestCheckoutAPI:
    def test_cod_checkout_end_to_end(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=10, price=Decimal("300.00"))
        client = APIClient()
        client.force_authenticate(user=customer)
        client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 1})

        resp = client.post(reverse("checkout"), {**_shipping(), "payment_method": "COD"})
        assert resp.status_code == 201
        assert resp.data["order"]["payment_method"] == "COD"
        assert Order.objects.filter(customer=customer).count() == 1

    def test_customer_can_view_own_order_history(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

        client = APIClient()
        client.force_authenticate(user=customer)
        resp = client.get(reverse("order-list"))
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_customer_cannot_view_other_customers_orders(self):
        customer_a = UserFactory(role=Role.CUSTOMER)
        customer_b = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=10)
        cart = Cart.objects.create(customer=customer_a)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        create_order_from_cart(customer=customer_a, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

        client = APIClient()
        client.force_authenticate(user=customer_b)
        resp = client.get(reverse("order-list"))
        assert resp.data["count"] == 0

    def test_vendor_only_sees_their_own_vendor_order_slice(self):
        customer = UserFactory(role=Role.CUSTOMER)
        vendor_a = VendorFactory()
        vendor_b = VendorFactory()
        product_a = ProductFactory(vendor=vendor_a, stock=10)
        product_b = ProductFactory(vendor=vendor_b, stock=10)

        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product_a, quantity=1)
        CartItem.objects.create(cart=cart, product=product_b, quantity=1)
        create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

        client = APIClient()
        client.force_authenticate(user=vendor_a.user)
        resp = client.get(reverse("vendor-order-list"))
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["vendor_name"] == vendor_a.shop_name

    def test_vendor_cannot_update_another_vendors_suborder(self):
        customer = UserFactory(role=Role.CUSTOMER)
        vendor_a = VendorFactory()
        vendor_b = VendorFactory()
        product_b = ProductFactory(vendor=vendor_b, stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product_b, quantity=1)
        order = create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)
        vendor_order = order.vendor_orders.first()

        client = APIClient()
        client.force_authenticate(user=vendor_a.user)
        resp = client.post(reverse("vendor-order-update-status", args=[vendor_order.id]), {"status": "SHIPPED"})
        assert resp.status_code == 404  # not visible in vendor_a's queryset at all

    def test_admin_sees_all_orders(self):
        customer = UserFactory(role=Role.CUSTOMER)
        admin = UserFactory(role=Role.ADMIN)
        product = ProductFactory(stock=10)
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.COD)

        client = APIClient()
        client.force_authenticate(user=admin)
        resp = client.get(reverse("admin-order-list"))
        assert resp.data["count"] == 1
