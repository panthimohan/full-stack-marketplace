import logging

from django.shortcuts import get_object_or_404

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Product,
    ProductImage,
    ProductVariant,
    ProductStatus,
)
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    VendorProductWriteSerializer,
    ProductImageSerializer,
    ProductVariantSerializer,
    ProductVariantWriteSerializer,
)
from .filters import ProductFilter

from apps.common.permissions import IsVendorRole, IsAdminRole
from apps.vendors.models import VendorStatus


logger = logging.getLogger("marketplace")


class PublicProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public marketplace catalog.

    Customers can:
    - list products
    - search products
    - filter products
    - sort products
    - view product details

    Only products belonging to approved vendors are publicly visible.
    """

    permission_classes = [permissions.AllowAny]

    lookup_field = "slug"

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_class = ProductFilter

    search_fields = [
        "name",
        "description",
        "sku",
    ]

    ordering_fields = [
        "price",
        "created_at",
        "name",
    ]

    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Product.objects.filter(
                status__in=[
                    ProductStatus.ACTIVE,
                    ProductStatus.OUT_OF_STOCK,
                ],
                is_deleted=False,
                vendor__status=VendorStatus.APPROVED,
            )
            .select_related(
                "vendor",
                "category",
            )
            .prefetch_related(
                "images",
                "variants__images",
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer

        return ProductListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class VendorProductViewSet(viewsets.ModelViewSet):
    """
    Vendor product management.

    A vendor can only access products belonging to itself.
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsVendorRole,
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "status",
        "category",
    ]

    search_fields = [
        "name",
        "sku",
    ]

    ordering_fields = [
        "price",
        "created_at",
        "stock",
    ]

    def get_queryset(self):
        vendor = self.request.user.vendor_profile

        return (
            Product.objects.filter(
                vendor=vendor,
                is_deleted=False,
            )
            .select_related("category")
            .prefetch_related(
                "images",
                "variants__images",
            )
        )

    def get_serializer_class(self):
        if self.action in ("retrieve", "list"):
            return ProductDetailSerializer

        return VendorProductWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        vendor = self.request.user.vendor_profile

        if vendor.status != VendorStatus.APPROVED:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Your vendor account must be approved before adding products."
            )

        serializer.save(vendor=vendor)

        logger.info(
            "Vendor %s created product %s",
            vendor.shop_name,
            serializer.instance.name,
        )

    def perform_update(self, serializer):
        serializer.save()

        logger.info(
            "Vendor %s updated product %s",
            self.request.user.email,
            serializer.instance.name,
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.status = ProductStatus.INACTIVE

        instance.save(
            update_fields=[
                "is_deleted",
                "status",
            ]
        )

        logger.info(
            "Vendor %s archived product %s",
            self.request.user.email,
            instance.name,
        )

    # ---------------------------------------------------------
    # PRODUCT IMAGES
    # ---------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
        url_path="images",
    )
    def upload_image(self, request, pk=None):
        """
        Upload a general product image.

        This image is not attached to a specific variant.
        """

        product = self.get_object()

        image_file = request.FILES.get("image")

        if not image_file:
            return Response(
                {
                    "image": "No image file provided."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {
                    "image": "Image must be under 5MB."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.content_type not in (
            "image/jpeg",
            "image/png",
            "image/webp",
        ):
            return Response(
                {
                    "image": (
                        "Only JPEG, PNG, or WEBP images are allowed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_primary = not product.images.filter(
            variant__isnull=True
        ).exists()

        image = ProductImage.objects.create(
            product=product,
            variant=None,
            image=image_file,
            alt_text=request.data.get(
                "alt_text",
                "",
            ),
            is_primary=is_primary,
        )

        serializer = ProductImageSerializer(
            image,
            context={
                "request": request,
                "product": product,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>[^/.]+)",
    )
    def delete_image(
        self,
        request,
        pk=None,
        image_id=None,
    ):
        product = self.get_object()

        image = ProductImage.objects.filter(
            product=product,
            id=image_id,
        ).first()

        if not image:
            return Response(
                {
                    "detail": "Image not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        image.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    # ---------------------------------------------------------
    # PRODUCT VARIANTS
    # ---------------------------------------------------------

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="variants",
    )
    def variants(
        self,
        request,
        pk=None,
    ):
        """
        GET:
            Return all variants belonging to this product.

        POST:
            Create a new variant for this product.
        """

        product = self.get_object()

        if request.method == "GET":
            queryset = (
                product.variants
                .all()
                .prefetch_related("images")
            )

            serializer = ProductVariantSerializer(
                queryset,
                many=True,
                context={
                    "request": request,
                },
            )

            return Response(serializer.data)

        serializer = ProductVariantWriteSerializer(
            data=request.data,
            context={
                "request": request,
                "product": product,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        variant = serializer.save(
            product=product
        )

        logger.info(
            "Vendor %s created variant %s for product %s",
            request.user.email,
            variant.sku,
            product.name,
        )

        response_serializer = ProductVariantSerializer(
            variant,
            context={
                "request": request,
            },
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "patch", "put", "delete"],
        url_path=r"variants/(?P<variant_id>[^/.]+)",
    )
    def variant_detail(
        self,
        request,
        pk=None,
        variant_id=None,
    ):
        """
        Manage one variant belonging to the current vendor's product.
        """

        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant.objects.prefetch_related(
                "images"
            ),
            product=product,
            id=variant_id,
        )

        if request.method == "GET":
            serializer = ProductVariantSerializer(
                variant,
                context={
                    "request": request,
                },
            )

            return Response(serializer.data)

        if request.method in ("PATCH", "PUT"):
            serializer = ProductVariantWriteSerializer(
                variant,
                data=request.data,
                partial=request.method == "PATCH",
                context={
                    "request": request,
                    "product": product,
                },
            )

            serializer.is_valid(
                raise_exception=True
            )

            variant = serializer.save()

            response_serializer = ProductVariantSerializer(
                variant,
                context={
                    "request": request,
                },
            )

            return Response(
                response_serializer.data
            )

        variant.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    # ---------------------------------------------------------
    # VARIANT IMAGES
    # ---------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
        url_path=r"variants/(?P<variant_id>[^/.]+)/images",
    )
    def upload_variant_image(
        self,
        request,
        pk=None,
        variant_id=None,
    ):
        """
        Upload an image for a specific product variant.
        """

        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant,
            id=variant_id,
            product=product,
        )

        image_file = request.FILES.get("image")

        if not image_file:
            return Response(
                {
                    "image": "No image file provided."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {
                    "image": "Image must be under 5MB."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.content_type not in (
            "image/jpeg",
            "image/png",
            "image/webp",
        ):
            return Response(
                {
                    "image": (
                        "Only JPEG, PNG, or WEBP images are allowed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_primary = not variant.images.exists()

        image = ProductImage.objects.create(
            product=product,
            variant=variant,
            image=image_file,
            alt_text=request.data.get(
                "alt_text",
                "",
            ),
            is_primary=is_primary,
        )

        serializer = ProductImageSerializer(
            image,
            context={
                "request": request,
                "product": product,
            },
        )

        logger.info(
            "Vendor %s uploaded image for variant %s",
            request.user.email,
            variant.sku,
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"variants/(?P<variant_id>[^/.]+)/images/(?P<image_id>[^/.]+)",
    )
    def delete_variant_image(
        self,
        request,
        pk=None,
        variant_id=None,
        image_id=None,
    ):
        """
        Delete an image belonging to a specific variant.
        """

        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant,
            id=variant_id,
            product=product,
        )

        image = ProductImage.objects.filter(
            id=image_id,
            product=product,
            variant=variant,
        ).first()

        if not image:
            return Response(
                {
                    "detail": "Variant image not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        image.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class AdminProductViewSet(viewsets.ModelViewSet):
    """
    Admin: full visibility and control across all vendors.
    """

    permission_classes = [
        permissions.IsAuthenticated,
        IsAdminRole,
    ]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "status",
        "category",
        "vendor",
    ]

    search_fields = [
        "name",
        "sku",
        "vendor__shop_name",
    ]

    ordering_fields = [
        "price",
        "created_at",
        "stock",
    ]

    queryset = (
        Product.objects
        .select_related(
            "vendor",
            "category",
        )
        .prefetch_related(
            "images",
            "variants__images",
        )
        .all()
    )

    def get_serializer_class(self):
        if self.action in ("retrieve", "list"):
            return ProductDetailSerializer

        return VendorProductWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    # ---------------------------------------------------------
    # ADMIN VARIANTS
    # ---------------------------------------------------------

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="variants",
    )
    def variants(
        self,
        request,
        pk=None,
    ):
        """
        Admin variant listing/creation.
        """

        product = self.get_object()

        if request.method == "GET":
            queryset = (
                product.variants
                .all()
                .prefetch_related("images")
            )

            serializer = ProductVariantSerializer(
                queryset,
                many=True,
                context={
                    "request": request,
                },
            )

            return Response(serializer.data)

        serializer = ProductVariantWriteSerializer(
            data=request.data,
            context={
                "request": request,
                "product": product,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        variant = serializer.save(
            product=product
        )

        response_serializer = ProductVariantSerializer(
            variant,
            context={
                "request": request,
            },
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get", "patch", "put", "delete"],
        url_path=r"variants/(?P<variant_id>[^/.]+)",
    )
    def variant_detail(
        self,
        request,
        pk=None,
        variant_id=None,
    ):
        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant.objects.prefetch_related(
                "images"
            ),
            id=variant_id,
            product=product,
        )

        if request.method == "GET":
            serializer = ProductVariantSerializer(
                variant,
                context={
                    "request": request,
                },
            )

            return Response(serializer.data)

        if request.method in ("PATCH", "PUT"):
            serializer = ProductVariantWriteSerializer(
                variant,
                data=request.data,
                partial=request.method == "PATCH",
                context={
                    "request": request,
                    "product": product,
                },
            )

            serializer.is_valid(
                raise_exception=True
            )

            variant = serializer.save()

            response_serializer = ProductVariantSerializer(
                variant,
                context={
                    "request": request,
                },
            )

            return Response(
                response_serializer.data
            )

        variant.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
        url_path=r"variants/(?P<variant_id>[^/.]+)/images",
    )
    def upload_variant_image(
        self,
        request,
        pk=None,
        variant_id=None,
    ):
        """
        Admin variant image upload.
        """

        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant,
            id=variant_id,
            product=product,
        )

        image_file = request.FILES.get("image")

        if not image_file:
            return Response(
                {
                    "image": "No image file provided."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {
                    "image": "Image must be under 5MB."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.content_type not in (
            "image/jpeg",
            "image/png",
            "image/webp",
        ):
            return Response(
                {
                    "image": (
                        "Only JPEG, PNG, or WEBP images are allowed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_primary = not variant.images.exists()

        image = ProductImage.objects.create(
            product=product,
            variant=variant,
            image=image_file,
            alt_text=request.data.get(
                "alt_text",
                "",
            ),
            is_primary=is_primary,
        )

        serializer = ProductImageSerializer(
            image,
            context={
                "request": request,
                "product": product,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"variants/(?P<variant_id>[^/.]+)/images/(?P<image_id>[^/.]+)",
    )
    def delete_variant_image(
        self,
        request,
        pk=None,
        variant_id=None,
        image_id=None,
    ):
        product = self.get_object()

        variant = get_object_or_404(
            ProductVariant,
            id=variant_id,
            product=product,
        )

        image = ProductImage.objects.filter(
            id=image_id,
            product=product,
            variant=variant,
        ).first()

        if not image:
            return Response(
                {
                    "detail": "Variant image not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        image.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )