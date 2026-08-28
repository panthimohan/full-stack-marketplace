from decimal import Decimal

from rest_framework import serializers

from .models import (
    Product,
    ProductImage,
    ProductVariant,
)
from apps.vendors.serializers import VendorPublicSerializer
from apps.categories.serializers import CategorySerializer


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image",
            "alt_text",
            "is_primary",
            "sort_order",
            "variant",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        """
        A variant image must belong to the same product as the image's
        parent product.
        """
        variant = attrs.get("variant")

        if variant:
            product = self.context.get("product")

            if product and variant.product_id != product.id:
                raise serializers.ValidationError(
                    {
                        "variant": (
                            "This variant does not belong to the selected product."
                        )
                    }
                )

        return attrs


class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a product variant.
    """

    images = ProductImageSerializer(many=True, read_only=True)

    effective_price = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "color_name",
            "color_code",
            "size",
            "sku",
            "price",
            "effective_price",
            "stock",
            "in_stock",
            "is_active",
            "images",
            "created_at",
            "updated_at",
        ]

    def get_effective_price(self, obj):
        """
        Variant price overrides product price when provided.
        """
        if obj.price is not None:
            return obj.price

        return obj.product.price

    def get_in_stock(self, obj):
        return obj.stock > 0 and obj.is_active


class ProductListSerializer(serializers.ModelSerializer):
    vendor = VendorPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    primary_image = serializers.SerializerMethodField()

    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "price",
            "compare_at_price",
            "stock",
            "status",
            "vendor",
            "category",
            "primary_image",
            "variants",
            "created_at",
        ]

    def get_primary_image(self, obj):
        """
        Prefer a general product image.

        If no general product image exists, fall back to the first
        available variant image.
        """
        images = list(
            obj.images.filter(variant__isnull=True)
        )

        if not images:
            images = list(obj.images.all())

        if not images:
            return None

        primary = next(
            (image for image in images if image.is_primary),
            images[0],
        )

        request = self.context.get("request")

        if not primary.image:
            return None

        url = primary.image.url

        return (
            request.build_absolute_uri(url)
            if request
            else url
        )


class ProductDetailSerializer(serializers.ModelSerializer):
    vendor = VendorPublicSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    images = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "sku",
            "description",
            "price",
            "compare_at_price",
            "stock",
            "status",
            "vendor",
            "category",
            "images",
            "variants",
            "created_at",
            "updated_at",
        ]

    def get_images(self, obj):
        """
        Return general product images only.

        Variant images are returned inside each variant.
        """
        images = obj.images.filter(
            variant__isnull=True
        )

        serializer = ProductImageSerializer(
            images,
            many=True,
            context=self.context,
        )

        return serializer.data


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    """
    Used by vendors/admins to create and update product variants.
    """

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "color_name",
            "color_code",
            "size",
            "sku",
            "price",
            "stock",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value is not None and value <= Decimal("0"):
            raise serializers.ValidationError(
                "Variant price must be greater than zero."
            )

        return value

    def validate_sku(self, value):
        qs = ProductVariant.objects.filter(sku=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A variant with this SKU already exists."
            )

        return value

    def validate_color_code(self, value):
        if value and not value.startswith("#"):
            raise serializers.ValidationError(
                "Color code must be a hexadecimal value such as #FF0000."
            )

        if value and len(value) != 7:
            raise serializers.ValidationError(
                "Color code must contain exactly 7 characters, e.g. #FF0000."
            )

        return value.upper() if value else value

    def validate(self, attrs):
        product = self.context.get("product")

        color_name = attrs.get(
            "color_name",
            self.instance.color_name if self.instance else "",
        )

        size = attrs.get(
            "size",
            self.instance.size if self.instance else "",
        )

        if not color_name and not size:
            raise serializers.ValidationError(
                "A variant must have at least a color or size."
            )

        if product:
            qs = ProductVariant.objects.filter(
                product=product,
                color_name=color_name,
                size=size,
            )

            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    "This color and size combination already exists for this product."
                )

        return attrs


class VendorProductWriteSerializer(serializers.ModelSerializer):
    """
    Used by vendors/admins to create and update products.

    Variants are managed separately through the variant endpoints.
    """

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "description",
            "price",
            "compare_at_price",
            "stock",
            "status",
            "category",
        ]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError(
                "Price must be greater than zero."
            )

        return value

    def validate_sku(self, value):
        qs = Product.objects.filter(sku=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A product with this SKU already exists."
            )

        return value