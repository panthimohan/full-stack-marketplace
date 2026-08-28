from django.conf import settings
from django.db import models
from django.utils.text import slugify
from apps.common.models import BaseModel


class VendorStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    SUSPENDED = "SUSPENDED", "Suspended"


def vendor_logo_path(instance, filename):
    ext = filename.split(".")[-1]
    return f"vendors/{instance.id}/logo.{ext}"


class Vendor(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendor_profile")
    shop_name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to=vendor_logo_path, blank=True, null=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Nepal")
    status = models.CharField(max_length=10, choices=VendorStatus.choices, default=VendorStatus.PENDING, db_index=True)
    status_reason = models.CharField(max_length=255, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return self.shop_name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.shop_name)
            slug = base_slug
            counter = 1
            while Vendor.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def is_approved(self):
        return self.status == VendorStatus.APPROVED
