import logging
from django.utils import timezone
from rest_framework import generics, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Vendor, VendorStatus
from .serializers import VendorSerializer, VendorPublicSerializer, VendorStatusUpdateSerializer
from apps.common.permissions import IsAdminRole

logger = logging.getLogger("marketplace")


class PublicVendorListView(generics.ListAPIView):
    """Public: browse approved vendor shops."""
    serializer_class = VendorPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["shop_name", "description", "city"]
    ordering_fields = ["created_at", "shop_name"]

    def get_queryset(self):
        return Vendor.objects.filter(status=VendorStatus.APPROVED).order_by("-created_at")


class PublicVendorDetailView(generics.RetrieveAPIView):
    serializer_class = VendorPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Vendor.objects.filter(status=VendorStatus.APPROVED)


class MyVendorProfileView(generics.RetrieveUpdateAPIView):
    """Vendor: manage own shop profile."""
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        vendor = self.request.user.vendor_profile
        return vendor


class AdminVendorViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: manage all vendors (approve/reject/suspend)."""
    serializer_class = VendorSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["shop_name", "user__email"]
    ordering_fields = ["created_at", "shop_name", "status"]
    queryset = Vendor.objects.select_related("user").all()

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        vendor = self.get_object()
        serializer = VendorStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "")

        vendor.status = new_status
        vendor.status_reason = reason
        if new_status == VendorStatus.APPROVED:
            vendor.approved_at = timezone.now()
        vendor.save()
        logger.info("Vendor %s status changed to %s by admin %s", vendor.shop_name, new_status, request.user.email)
        return Response(VendorSerializer(vendor).data)
