from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator

from apps.common.models import BaseModel


class ProductStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    OUT_OF_STOCK = "OUT_OF_STOCK", "Out of stock"


class Product(BaseModel):
    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        related_name="products",
    )

    name = models.CharField(max_length=200)

    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        db_index=True,
    )

    sku = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
    )

    description = models.TextField(blank=True)

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    stock = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=15,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
    )

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["vendor", "status"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["price"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.vendor.shop_name})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1

            while Product.objects.filter(
                slug=slug
            ).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        if self.stock <= 0 and self.status == ProductStatus.ACTIVE:
            self.status = ProductStatus.OUT_OF_STOCK

        super().save(*args, **kwargs)

    @property
    def in_stock(self):
        return self.stock > 0

    @property
    def is_publicly_visible(self):
        return (
            self.status in (
                ProductStatus.ACTIVE,
                ProductStatus.OUT_OF_STOCK,
            )
            and not self.is_deleted
        )


class ProductVariant(BaseModel):
    """
    A purchasable variation of a product.

    Examples:
        Red / M
        Red / L
        Blue / M
        Blue / L
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )

    color_name = models.CharField(
        max_length=50,
        blank=True,
    )

    color_code = models.CharField(
        max_length=7,
        blank=True,
        help_text="Hex color code, e.g. #FF0000",
    )

    size = models.CharField(
        max_length=50,
        blank=True,
    )

    sku = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    stock = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["product", "color_name", "size"],
                name="unique_product_variant_option",
            )
        ]

    def __str__(self):
        options = " / ".join(
            value
            for value in [self.color_name, self.size]
            if value
        )

        return f"{self.product.name} - {options or self.sku}"


def product_image_path(instance, filename):
    """
    Store product images.

    Variant image:
        products/<product_id>/variants/<variant_id>/<image_id>.jpg

    General product image:
        products/<product_id>/<image_id>.jpg
    """

    ext = filename.rsplit(".", 1)[-1].lower()

    if instance.variant_id:
        return (
            f"products/{instance.product_id}/"
            f"variants/{instance.variant_id}/"
            f"{instance.id}.{ext}"
        )

    return (
        f"products/{instance.product_id}/"
        f"{instance.id}.{ext}"
    )


class ProductImage(BaseModel):
    """
    An image can belong to either:
    - the general product, or
    - a specific product variant.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )

    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="images",
        null=True,
        blank=True,
    )

    image = models.ImageField(
        upload_to=product_image_path,
    )

    alt_text = models.CharField(
        max_length=150,
        blank=True,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    sort_order = models.PositiveSmallIntegerField(
        default=0,
    )

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        if self.variant:
            return (
                f"Image for {self.product.name} - "
                f"{self.variant.color_name}"
            )

        return f"Image for {self.product.name}"