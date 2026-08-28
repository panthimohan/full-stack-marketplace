import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.common.tests.factories import UserFactory, VendorFactory
from apps.vendors.models import VendorStatus

pytestmark = pytest.mark.django_db


class TestVendorApproval:
    def test_new_vendor_starts_pending(self):
        vendor = VendorFactory(status=VendorStatus.PENDING)
        assert vendor.status == VendorStatus.PENDING
        assert not vendor.is_approved

    def test_admin_can_approve_vendor(self):
        admin = UserFactory(role=Role.ADMIN)
        vendor = VendorFactory(status=VendorStatus.PENDING)
        client = APIClient()
        client.force_authenticate(user=admin)
        resp = client.post(reverse("admin-vendor-update-status", args=[vendor.id]), {"status": "APPROVED"})
        assert resp.status_code == 200
        vendor.refresh_from_db()
        assert vendor.status == VendorStatus.APPROVED
        assert vendor.approved_at is not None

    def test_non_admin_cannot_approve_vendor(self):
        vendor_user = UserFactory(role=Role.VENDOR)
        vendor = VendorFactory(status=VendorStatus.PENDING)
        client = APIClient()
        client.force_authenticate(user=vendor_user)
        resp = client.post(reverse("admin-vendor-update-status", args=[vendor.id]), {"status": "APPROVED"})
        assert resp.status_code == 403

    def test_pending_vendors_hidden_from_public_listing(self):
        VendorFactory(status=VendorStatus.PENDING, shop_name="Hidden Shop")
        VendorFactory(status=VendorStatus.APPROVED, shop_name="Visible Shop")
        client = APIClient()
        resp = client.get(reverse("vendor-list"))
        names = [v["shop_name"] for v in resp.data["results"]]
        assert "Visible Shop" in names
        assert "Hidden Shop" not in names

    def test_vendor_can_view_own_profile(self):
        vendor = VendorFactory()
        client = APIClient()
        client.force_authenticate(user=vendor.user)
        resp = client.get(reverse("vendor-me"))
        assert resp.status_code == 200
        assert resp.data["shop_name"] == vendor.shop_name
