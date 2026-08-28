import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.common.tests.factories import UserFactory, VendorFactory, CategoryFactory, ProductFactory
from apps.vendors.models import VendorStatus
from apps.products.models import Product, ProductStatus

pytestmark = pytest.mark.django_db


class TestProductPermissions:
    def test_vendor_can_create_own_product(self):
        vendor = VendorFactory(status=VendorStatus.APPROVED)
        category = CategoryFactory()
        client = APIClient()
        client.force_authenticate(user=vendor.user)
        resp = client.post(reverse("vendor-product-list"), {
            "name": "New Gadget", "sku": "SKU-NEW-1", "description": "desc",
            "price": "199.99", "stock": 10, "category": str(category.id), "status": "ACTIVE",
        })
        assert resp.status_code == 201
        assert Product.objects.get(sku="SKU-NEW-1").vendor_id == vendor.id

    def test_unapproved_vendor_cannot_create_product(self):
        vendor = VendorFactory(status=VendorStatus.PENDING)
        category = CategoryFactory()
        client = APIClient()
        client.force_authenticate(user=vendor.user)
        resp = client.post(reverse("vendor-product-list"), {
            "name": "New Gadget", "sku": "SKU-NEW-2", "description": "desc",
            "price": "199.99", "stock": 10, "category": str(category.id), "status": "ACTIVE",
        })
        assert resp.status_code == 403

    def test_vendor_cannot_see_other_vendors_products_in_their_management_list(self):
        vendor_a = VendorFactory()
        vendor_b = VendorFactory()
        ProductFactory(vendor=vendor_a, name="Vendor A Product")
        ProductFactory(vendor=vendor_b, name="Vendor B Product")

        client = APIClient()
        client.force_authenticate(user=vendor_a.user)
        resp = client.get(reverse("vendor-product-list"))
        names = [p["name"] for p in resp.data["results"]]
        assert "Vendor A Product" in names
        assert "Vendor B Product" not in names

    def test_vendor_cannot_edit_another_vendors_product(self):
        vendor_a = VendorFactory()
        vendor_b = VendorFactory()
        product = ProductFactory(vendor=vendor_b, name="B's product")

        client = APIClient()
        client.force_authenticate(user=vendor_a.user)
        resp = client.patch(reverse("vendor-product-detail", args=[product.id]), {"name": "Hijacked"})
        # Not in vendor_a's queryset at all -> 404, proving cross-vendor isolation.
        assert resp.status_code == 404

    def test_customer_cannot_create_product(self):
        customer = UserFactory(role=Role.CUSTOMER)
        category = CategoryFactory()
        client = APIClient()
        client.force_authenticate(user=customer)
        resp = client.post(reverse("vendor-product-list"), {
            "name": "Hack", "sku": "SKU-X", "price": "10.00", "stock": 1, "category": str(category.id),
        })
        assert resp.status_code == 403

    def test_public_catalog_excludes_draft_products(self):
        ProductFactory(status=ProductStatus.DRAFT, name="Draft Product")
        ProductFactory(status=ProductStatus.ACTIVE, name="Live Product")
        client = APIClient()
        resp = client.get(reverse("product-list"))
        names = [p["name"] for p in resp.data["results"]]
        assert "Live Product" in names
        assert "Draft Product" not in names

    def test_public_catalog_excludes_unapproved_vendor_products(self):
        pending_vendor = VendorFactory(status=VendorStatus.PENDING)
        ProductFactory(vendor=pending_vendor, status=ProductStatus.ACTIVE, name="Pending Vendor Product")
        client = APIClient()
        resp = client.get(reverse("product-list"))
        names = [p["name"] for p in resp.data["results"]]
        assert "Pending Vendor Product" not in names

    def test_price_filtering(self):
        ProductFactory(price=Decimal("50.00"), name="Cheap")
        ProductFactory(price=Decimal("500.00"), name="Expensive")
        client = APIClient()
        resp = client.get(reverse("product-list"), {"min_price": 100})
        names = [p["name"] for p in resp.data["results"]]
        assert "Expensive" in names
        assert "Cheap" not in names
