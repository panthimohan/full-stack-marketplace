from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, CustomerProfile


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "username", "role", "is_active", "is_email_verified", "date_joined")
    list_filter = ("role", "is_active", "is_email_verified")
    search_fields = ("email", "username")
    ordering = ("-date_joined",)
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Marketplace", {"fields": ("role", "phone_number", "profile_image", "is_email_verified")}),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "default_shipping_city")
