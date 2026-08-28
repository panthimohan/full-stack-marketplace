import uuid
from django.db import models
from apps.common.models import BaseModel


class PaymentProvider(models.TextChoices):
    ESEWA = "ESEWA", "eSewa"
    COD = "COD", "Cash on Delivery"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class Payment(BaseModel):
    """Provider-agnostic payment record. One per Order (COD or eSewa)."""

    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="payment")
    provider = models.CharField(max_length=10, choices=PaymentProvider.choices)
    transaction_uuid = models.CharField(max_length=64, unique=True, default=uuid.uuid4, editable=False, db_index=True)
    reference_id = models.CharField(max_length=64, blank=True)  # provider's own transaction/ref id
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="NPR")
    status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status"]), models.Index(fields=["provider"])]

    def __str__(self):
        return f"Payment<{self.order.order_number}:{self.provider}:{self.status}>"


class PaymentTransactionLog(BaseModel):
    """Append-only audit log of every callback/verification attempt received
    from a payment provider — used for duplicate-callback protection and audits."""

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="transaction_logs")
    event_type = models.CharField(max_length=32)  # e.g. CALLBACK, STATUS_CHECK
    raw_payload = models.JSONField(default=dict)
    resulted_status = models.CharField(max_length=10, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} for {self.payment_id}"
