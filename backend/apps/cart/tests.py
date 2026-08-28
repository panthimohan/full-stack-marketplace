import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.common.tests.factories import UserFactory, ProductFactory

pytestmark = pytest.mark.django_db


class TestCart:
    def test_add_item_to_cart(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=10)
        client = APIClient()
        client.force_authenticate(user=customer)
        resp = client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 3})
        assert resp.status_code == 201
        assert resp.data["item_count"] == 3

    def test_cannot_add_more_than_available_stock(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=2)
        client = APIClient()
        client.force_authenticate(user=customer)
        resp = client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 5})
        assert resp.status_code == 400

    def test_backend_computes_authoritative_subtotal(self):
        """The client never supplies price; total is always computed server-side."""
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(price="250.00", stock=10)
        client = APIClient()
        client.force_authenticate(user=customer)
        resp = client.post(reverse("cart-item-add"), {
            "product_id": str(product.id), "quantity": 2, "unit_price": "1.00",  # attempted price injection
        })
        assert resp.status_code == 201
        assert resp.data["subtotal"] == "500.00"  # 250 * 2, ignoring the injected price

    def test_update_quantity_respects_stock(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=5)
        client = APIClient()
        client.force_authenticate(user=customer)
        add_resp = client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 1})
        item_id = add_resp.data["items"][0]["id"]
        resp = client.patch(reverse("cart-item-detail", args=[item_id]), {"quantity": 100})
        assert resp.status_code == 400

    def test_remove_item_from_cart(self):
        customer = UserFactory(role=Role.CUSTOMER)
        product = ProductFactory(stock=5)
        client = APIClient()
        client.force_authenticate(user=customer)
        add_resp = client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 1})
        item_id = add_resp.data["items"][0]["id"]
        resp = client.delete(reverse("cart-item-detail", args=[item_id]))
        assert resp.status_code == 200
        assert resp.data["item_count"] == 0

    def test_vendor_cannot_use_customer_cart(self):
        vendor_user = UserFactory(role=Role.VENDOR)
        product = ProductFactory(stock=5)
        client = APIClient()
        client.force_authenticate(user=vendor_user)
        resp = client.post(reverse("cart-item-add"), {"product_id": str(product.id), "quantity": 1})
        assert resp.status_code == 403
