import logging
from rest_framework import permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction

from .models import Payment, PaymentStatus, PaymentTransactionLog
from .serializers import PaymentSerializer, EsewaCallbackSerializer
from .services.esewa import EsewaPaymentService, EsewaError
from apps.orders.models import PaymentStatus as OrderPaymentStatus, VendorOrderStatus
from apps.orders.services import release_stock_for_failed_order
from apps.common.permissions import IsAdminRole

logger = logging.getLogger("marketplace")


def _mark_paid(payment: Payment, reference_id: str):
    payment.status = PaymentStatus.PAID
    payment.reference_id = reference_id
    payment.save(update_fields=["status", "reference_id"])
    order = payment.order
    order.payment_status = OrderPaymentStatus.PAID
    order.save(update_fields=["payment_status"])
    for vo in order.vendor_orders.all():
        if vo.status == VendorOrderStatus.PENDING:
            vo.status = VendorOrderStatus.CONFIRMED
            vo.save(update_fields=["status"])
    logger.info("Payment for order %s marked PAID (ref=%s)", order.order_number, reference_id)


class EsewaCallbackView(APIView):
    """
    Handles eSewa's redirect back to our success_url. The `data` query param
    is a base64-encoded, HMAC-signed JSON payload. We verify the signature,
    then independently confirm with eSewa's server-to-server status-check API
    before ever marking the order paid — the redirect itself is never trusted
    as proof of payment.
    """
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = EsewaCallbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        esewa = EsewaPaymentService()

        try:
            payload = esewa.decode_and_verify_callback(serializer.validated_data["data"])
        except EsewaError as exc:
            logger.warning("eSewa callback rejected: %s", exc)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        transaction_uuid = payload.get("transaction_uuid")
        try:
            payment = Payment.objects.select_for_update().get(transaction_uuid=transaction_uuid)
        except Payment.DoesNotExist:
            return Response({"detail": "Unknown transaction."}, status=status.HTTP_404_NOT_FOUND)

        PaymentTransactionLog.objects.create(
            payment=payment, event_type="CALLBACK", raw_payload=payload, resulted_status=payload.get("status", "")
        )

        # Duplicate-callback protection: if we've already settled this payment, no-op.
        if payment.status == PaymentStatus.PAID:
            return Response(PaymentSerializer(payment).data)

        # Defence in depth: independently verify with eSewa's status API rather
        # than trusting the callback payload's "status" field alone.
        try:
            status_result = esewa.check_status(transaction_uuid=transaction_uuid, total_amount=payment.amount)
        except EsewaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        PaymentTransactionLog.objects.create(
            payment=payment, event_type="STATUS_CHECK", raw_payload=status_result,
            resulted_status=status_result.get("status", ""),
        )

        if status_result.get("status") == "COMPLETE":
            _mark_paid(payment, status_result.get("ref_id", ""))
        else:
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status"])
            release_stock_for_failed_order(payment.order)

        return Response(PaymentSerializer(payment).data)


class EsewaFailureView(APIView):
    """Called when the frontend routes here after eSewa's failure_url redirect."""
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        transaction_uuid = request.data.get("transaction_uuid")
        try:
            payment = Payment.objects.select_for_update().get(transaction_uuid=transaction_uuid)
        except Payment.DoesNotExist:
            return Response({"detail": "Unknown transaction."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != PaymentStatus.PAID:
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status"])
            release_stock_for_failed_order(payment.order)
        return Response(PaymentSerializer(payment).data)


class PaymentStatusView(APIView):
    """Lets the authenticated customer poll their own payment's current status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, transaction_uuid):
        try:
            payment = Payment.objects.select_related("order").get(
                transaction_uuid=transaction_uuid, order__customer=request.user
            )
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentSerializer(payment).data)


class AdminPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminRole]
    queryset = Payment.objects.select_related("order").all()
