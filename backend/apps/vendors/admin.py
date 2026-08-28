from django.contrib import admin
from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("shop_name", "user", "status", "city", "created_at")
    list_filter = ("status", "country")
    search_fields = ("shop_name", "user__email")
    prepopulated_fields = {"slug": ("shop_name",)}
