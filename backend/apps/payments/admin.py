from django.contrib import admin
from .models import Payment, PaymentTransactionLog


class TransactionLogInline(admin.TabularInline):
    model = PaymentTransactionLog
    extra = 0
    readonly_fields = ("event_type", "raw_payload", "resulted_status", "created_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "provider", "status", "amount", "reference_id", "created_at")
    list_filter = ("provider", "status")
    inlines = [TransactionLogInline]
