from django.contrib import admin
from .models import Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "vendor", "category", "price", "stock", "status")
    list_filter = ("status", "category")
    search_fields = ("name", "sku")
    inlines = [ProductImageInline]
