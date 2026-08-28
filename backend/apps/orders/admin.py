from django.contrib import admin
from .models import Order, VendorOrder, OrderItem


class VendorOrderInline(admin.TabularInline):
    model = VendorOrder
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer", "total", "payment_method", "payment_status", "created_at")
    list_filter = ("payment_method", "payment_status")
    search_fields = ("order_number", "customer__email")
    inlines = [VendorOrderInline]


@admin.register(VendorOrder)
class VendorOrderAdmin(admin.ModelAdmin):
    list_display = ("order", "vendor", "status", "subtotal")
    list_filter = ("status",)
