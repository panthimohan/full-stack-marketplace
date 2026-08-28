import random
import string
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from apps.common.models import BaseModel


class PaymentMethod(models.TextChoices):
    COD = "COD", "Cash on Delivery"
    ESEWA = "ESEWA", "eSewa"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class VendorOrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    PROCESSING = "PROCESSING", "Processing"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"


def generate_order_number():
    return "ORD-" + "".join(random.choices(string.digits, k=6)) + "-" + "".join(random.choices(string.ascii_uppercase, k=3))


class Order(BaseModel):
    """The parent, customer-facing order. May contain items from multiple vendors,
    each represented by a child VendorOrder so vendors only ever touch their own slice."""

    order_number = models.CharField(max_length=32, unique=True, default=generate_order_number, db_index=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")

    # Immutable snapshot of the shipping destination at time of order.
    shipping_full_name = models.CharField(max_length=150)
    shipping_phone = models.CharField(max_length=20)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True)

    class Meta:
        indexes = [models.Index(fields=["customer", "-created_at"]), models.Index(fields=["payment_status"])]
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number

    @property
    def overall_status(self):
        """Derived, human-facing summary of the parent order's fulfilment state."""
        statuses = list(self.vendor_orders.values_list("status", flat=True))
        if not statuses:
            return VendorOrderStatus.PENDING
        if all(s == VendorOrderStatus.DELIVERED for s in statuses):
            return VendorOrderStatus.DELIVERED
        if all(s == VendorOrderStatus.CANCELLED for s in statuses):
            return VendorOrderStatus.CANCELLED
        if any(s == VendorOrderStatus.SHIPPED for s in statuses):
            return VendorOrderStatus.SHIPPED
        if any(s == VendorOrderStatus.PROCESSING for s in statuses):
            return VendorOrderStatus.PROCESSING
        if any(s == VendorOrderStatus.CONFIRMED for s in statuses):
            return VendorOrderStatus.CONFIRMED
        return VendorOrderStatus.PENDING


class VendorOrder(BaseModel):
    """A single vendor's slice of a parent Order. Vendors manage only these."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="vendor_orders")
    vendor = models.ForeignKey("vendors.Vendor", on_delete=models.PROTECT, related_name="vendor_orders")
    status = models.CharField(max_length=12, choices=VendorOrderStatus.choices, default=VendorOrderStatus.PENDING, db_index=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        indexes = [models.Index(fields=["vendor", "status"]), models.Index(fields=["order"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order.order_number} / {self.vendor.shop_name}"


class OrderItem(BaseModel):
    """Preserves a historical snapshot of the purchased product — never reconstructed
    from the live Product record, so later product edits/deletes cannot alter past orders."""

    vendor_order = models.ForeignKey(VendorOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.SET_NULL, null=True, related_name="order_items")

    product_name = models.CharField(max_length=200)
    product_sku = models.CharField(max_length=64)
    vendor_name = models.CharField(max_length=150)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    line_subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"
