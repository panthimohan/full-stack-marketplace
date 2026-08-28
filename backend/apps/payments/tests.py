import base64
import json
import pytest
from decimal import Decimal
from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.common.tests.factories import UserFactory, ProductFactory
from apps.cart.models import Cart, CartItem
from apps.orders.services import create_order_from_cart
from apps.orders.models import PaymentMethod, PaymentStatus as OrderPaymentStatus
from apps.payments.models import Payment, PaymentProvider, PaymentStatus
from apps.payments.services.esewa import EsewaPaymentService, EsewaError

pytestmark = pytest.mark.django_db


def _shipping():
    return {"full_name": "Jane Doe", "phone": "9800000000", "address": "Somewhere", "city": "Kathmandu"}


class TestEsewaSigning:
    def test_build_payment_form_produces_valid_signature(self):
        service = EsewaPaymentService()
        payment = Payment(
            order=None, provider=PaymentProvider.ESEWA, amount=Decimal("1000.00"),
            transaction_uuid="test-uuid-123",
        )
        form = service.build_payment_form(payment)
        fields = form["fields"]

        message = f"total_amount={fields['total_amount']},transaction_uuid={fields['transaction_uuid']},product_code={fields['product_code']}"
        expected_sig = service._sign(message)
        assert fields["signature"] == expected_sig

    def test_verify_callback_rejects_tampered_signature(self):
        service = EsewaPaymentService()
        payload = {
            "transaction_uuid": "abc-123", "status": "COMPLETE", "total_amount": "100.0",
            "signed_field_names": "transaction_uuid,status,total_amount",
            "signature": "invalid-signature-value",
        }
        encoded = base64.b64encode(json.dumps(payload).encode()).decode()
        with pytest.raises(EsewaError):
            service.decode_and_verify_callback(encoded)

    def test_verify_callback_accepts_correctly_signed_payload(self):
        service = EsewaPaymentService()
        fields = {"transaction_uuid": "abc-123", "status": "COMPLETE", "total_amount": "100.0"}
        signed_field_names = "transaction_uuid,status,total_amount"
        message = ",".join(f"{k}={fields[k]}" for k in signed_field_names.split(","))
        signature = service._sign(message)
        payload = {**fields, "signed_field_names": signed_field_names, "signature": signature}
        encoded = base64.b64encode(json.dumps(payload).encode()).decode()

        result = service.decode_and_verify_callback(encoded)
        assert result["status"] == "COMPLETE"


class TestEsewaCallbackFlow:
    def _make_esewa_order(self, customer):
        product = ProductFactory(stock=10, price=Decimal("500.00"))
        cart = Cart.objects.create(customer=customer)
        CartItem.objects.create(cart=cart, product=product, quantity=1)
        order = create_order_from_cart(customer=customer, shipping_info=_shipping(), payment_method=PaymentMethod.ESEWA)
        payment = Payment.objects.create(order=order, provider=PaymentProvider.ESEWA, amount=order.total)
        return order, payment

    def _signed_callback_payload(self, payment, status="COMPLETE"):
        service = EsewaPaymentService()
        fields = {
            "transaction_uuid": str(payment.transaction_uuid),
            "status": status,
            "total_amount": str(payment.amount),
        }
        signed_field_names = "transaction_uuid,status,total_amount"
        message = ",".join(f"{k}={fields[k]}" for k in signed_field_names.split(","))
        signature = service._sign(message)
        payload = {**fields, "signed_field_names": signed_field_names, "signature": signature}
        return base64.b64encode(json.dumps(payload).encode()).decode()

    @patch("apps.payments.services.esewa.EsewaPaymentService.check_status")
    def test_successful_callback_marks_order_paid(self, mock_check_status):
        customer = UserFactory(role=Role.CUSTOMER)
        order, payment = self._make_esewa_order(customer)
        mock_check_status.return_value = {"status": "COMPLETE", "ref_id": "REF123"}

        encoded = self._signed_callback_payload(payment)
        client = APIClient()
        resp = client.post(reverse("esewa-callback"), {"data": encoded})

        assert resp.status_code == 200
        payment.refresh_from_db()
        order.refresh_from_db()
        assert payment.status == PaymentStatus.PAID
        assert order.payment_status == OrderPaymentStatus.PAID
        assert payment.reference_id == "REF123"

    @patch("apps.payments.services.esewa.EsewaPaymentService.check_status")
    def test_duplicate_callback_does_not_double_process(self, mock_check_status):
        customer = UserFactory(role=Role.CUSTOMER)
        order, payment = self._make_esewa_order(customer)
        mock_check_status.return_value = {"status": "COMPLETE", "ref_id": "REF123"}

        encoded = self._signed_callback_payload(payment)
        client = APIClient()
        client.post(reverse("esewa-callback"), {"data": encoded})
        assert mock_check_status.call_count == 1

        # Second, duplicate callback for the same transaction.
        resp = client.post(reverse("esewa-callback"), {"data": encoded})
        assert resp.status_code == 200
        # check_status should NOT be called again since payment is already PAID.
        assert mock_check_status.call_count == 1

    @patch("apps.payments.services.esewa.EsewaPaymentService.check_status")
    def test_failed_status_check_releases_stock(self, mock_check_status):
        customer = UserFactory(role=Role.CUSTOMER)
        order, payment = self._make_esewa_order(customer)
        item = order.vendor_orders.first().items.first()
        product = item.product
        stock_after_reservation = product.stock

        mock_check_status.return_value = {"status": "PENDING"}
        encoded = self._signed_callback_payload(payment, status="PENDING")
        client = APIClient()
        resp = client.post(reverse("esewa-callback"), {"data": encoded})

        assert resp.status_code == 200
        payment.refresh_from_db()
        product.refresh_from_db()
        assert payment.status == PaymentStatus.FAILED
        assert product.stock == stock_after_reservation + item.quantity  # released

    def test_callback_with_bad_signature_rejected(self):
        client = APIClient()
        bad_payload = base64.b64encode(json.dumps({
            "transaction_uuid": "x", "signed_field_names": "transaction_uuid", "signature": "bad",
        }).encode()).decode()
        resp = client.post(reverse("esewa-callback"), {"data": bad_payload})
        assert resp.status_code == 400
