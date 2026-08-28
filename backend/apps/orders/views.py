import logging
from rest_framework import generics, permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Order, VendorOrder, PaymentMethod
from .serializers import OrderSerializer, VendorOrderSerializer, VendorOrderStatusUpdateSerializer, CheckoutSerializer
from .services import create_order_from_cart, CheckoutError
from .tasks import send_order_confirmation_email
from apps.common.permissions import IsCustomerRole, IsVendorRole, IsAdminRole
from apps.payments.services.esewa import EsewaPaymentService
from apps.payments.models import Payment, PaymentProvider

logger = logging.getLogger("marketplace")


class CheckoutView(APIView):
    """Creates the order from the cart. For eSewa, also returns the signed
    payment-initiation payload the frontend must POST/redirect to eSewa with."""
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            order = create_order_from_cart(
                customer=request.user,
                shipping_info={
                    "full_name": data["full_name"], "phone": data["phone"],
                    "address": data["address"], "city": data["city"],
                },
                payment_method=data["payment_method"],
            )
        except CheckoutError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        send_order_confirmation_email.delay(str(order.id))
        response = {"order": OrderSerializer(order).data}

        if data["payment_method"] == PaymentMethod.ESEWA:
            payment = Payment.objects.create(
                order=order, provider=PaymentProvider.ESEWA, amount=order.total, currency="NPR",
            )
            esewa_service = EsewaPaymentService()
            response["esewa_payment_form"] = esewa_service.build_payment_form(payment)

        return Response(response, status=status.HTTP_201_CREATED)


class CustomerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer: view own order history."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related(
            "vendor_orders__items", "vendor_orders__vendor"
        )


class VendorOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Vendor: manage only their own slice of any order."""
    serializer_class = VendorOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        vendor = self.request.user.vendor_profile
        return VendorOrder.objects.filter(vendor=vendor).select_related("order", "vendor").prefetch_related("items")

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        vendor_order = self.get_object()
        serializer = VendorOrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor_order.status = serializer.validated_data["status"]
        vendor_order.save(update_fields=["status"])
        logger.info("VendorOrder %s status -> %s by %s", vendor_order.id, vendor_order.status, request.user.email)
        return Response(VendorOrderSerializer(vendor_order).data)


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: platform-wide order monitoring."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["payment_status", "payment_method"]
    queryset = Order.objects.select_related("customer").prefetch_related("vendor_orders__items", "vendor_orders__vendor").all()
