"""
eSewa ePay v2 payment provider integration.

Implements the flow documented at https://developer.esewa.com.np/pages/Epay
as of mid-2026:

  1. INITIATION — the merchant builds an HMAC-SHA256 signed form and the
     browser POSTs/redirects the customer to eSewa's hosted checkout.
  2. CALLBACK — after payment, eSewa redirects the customer back to our
     success_url with a base64-encoded, signed JSON payload in the `data`
     query parameter. We verify the signature before trusting anything in it.
  3. STATUS CHECK — regardless of what the callback says, we independently
     call eSewa's server-to-server status-check API and only mark a payment
     PAID if *that* call also reports COMPLETE. This defends against a
     forged or replayed callback.

Kept intentionally isolated from `apps.orders` — this module knows nothing
about carts or checkout; it only signs/verifies eSewa payloads and talks to
the eSewa HTTP API.
"""
import base64
import hashlib
import hmac
import json
import logging

import requests
from django.conf import settings

logger = logging.getLogger("marketplace")

SIGNED_FIELDS_INITIATION = "total_amount,transaction_uuid,product_code"


class EsewaError(Exception):
    pass


class EsewaPaymentService:
    def __init__(self):
        self.merchant_code = settings.ESEWA_MERCHANT_ID
        self.secret_key = settings.ESEWA_SECRET_KEY
        self.base_url = settings.ESEWA_BASE_URL.rstrip("/")

    # ------------------------------------------------------------------
    # Signing
    # ------------------------------------------------------------------
    def _sign(self, message: str) -> str:
        digest = hmac.new(self.secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
        return base64.b64encode(digest).decode("utf-8")

    # ------------------------------------------------------------------
    # 1. Payment initiation — build the signed form fields the frontend
    #    submits (via an auto-submitting form / redirect) to eSewa.
    # ------------------------------------------------------------------
    def build_payment_form(self, payment) -> dict:
        amount = str(payment.amount)
        tax_amount = "0"
        product_service_charge = "0"
        product_delivery_charge = "0"
        total_amount = str(payment.amount)
        transaction_uuid = str(payment.transaction_uuid)

        message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={self.merchant_code}"
        signature = self._sign(message)

        success_url = f"{settings.FRONTEND_URL}/checkout/esewa/success"
        failure_url = f"{settings.FRONTEND_URL}/checkout/esewa/failure"

        return {
            "action_url": f"{self.base_url}/api/epay/main/v2/form",
            "fields": {
                "amount": amount,
                "tax_amount": tax_amount,
                "total_amount": total_amount,
                "transaction_uuid": transaction_uuid,
                "product_code": self.merchant_code,
                "product_service_charge": product_service_charge,
                "product_delivery_charge": product_delivery_charge,
                "success_url": success_url,
                "failure_url": failure_url,
                "signed_field_names": SIGNED_FIELDS_INITIATION,
                "signature": signature,
            },
        }

    # ------------------------------------------------------------------
    # 2. Callback verification — verify the signature eSewa attached to the
    #    base64-encoded response before trusting any of its fields.
    # ------------------------------------------------------------------
    def decode_and_verify_callback(self, encoded_data: str) -> dict:
        try:
            decoded = base64.b64decode(encoded_data).decode("utf-8")
            payload = json.loads(decoded)
        except (ValueError, json.JSONDecodeError) as exc:
            raise EsewaError(f"Malformed eSewa callback payload: {exc}")

        signed_field_names = payload.get("signed_field_names", "")
        fields = signed_field_names.split(",")
        message = ",".join(f"{field}={payload.get(field, '')}" for field in fields)
        expected_signature = self._sign(message)

        if not hmac.compare_digest(expected_signature, payload.get("signature", "")):
            raise EsewaError("eSewa callback signature verification failed.")

        return payload

    # ------------------------------------------------------------------
    # 3. Server-to-server status check — the authoritative source of truth.
    #    Always call this before marking a payment PAID; never trust the
    #    redirect/callback alone.
    # ------------------------------------------------------------------
    def check_status(self, *, transaction_uuid: str, total_amount) -> dict:
        url = f"{self.base_url}/api/epay/transaction/status/"
        params = {
            "product_code": self.merchant_code,
            "transaction_uuid": transaction_uuid,
            "total_amount": str(total_amount),
        }
        try:
            resp = requests.get(url, params=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.error("eSewa status-check request failed: %s", exc)
            raise EsewaError(f"Unable to reach eSewa status-check API: {exc}")
