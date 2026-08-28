import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.common.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class TestRegistrationAndAuth:
    def test_customer_registration_creates_customer_profile(self):
        client = APIClient()
        resp = client.post(reverse("auth-register"), {
            "email": "newcustomer@test.local", "username": "newcustomer",
            "password": "StrongPass@123", "password_confirm": "StrongPass@123",
            "role": "CUSTOMER",
        })
        assert resp.status_code == 201
        assert resp.data["user"]["role"] == "CUSTOMER"
        assert "access" in resp.data and "refresh" in resp.data

    def test_vendor_registration_requires_shop_name(self):
        client = APIClient()
        resp = client.post(reverse("auth-register"), {
            "email": "newvendor@test.local", "username": "newvendor",
            "password": "StrongPass@123", "password_confirm": "StrongPass@123",
            "role": "VENDOR",
        })
        assert resp.status_code == 400
        assert "shop_name" in resp.data["errors"]

    def test_password_mismatch_rejected(self):
        client = APIClient()
        resp = client.post(reverse("auth-register"), {
            "email": "x@test.local", "username": "x",
            "password": "StrongPass@123", "password_confirm": "Different@123",
        })
        assert resp.status_code == 400

    def test_login_returns_jwt_and_role_claim(self):
        UserFactory(email="loginuser@test.local", password="StrongPass@123")
        client = APIClient()
        resp = client.post(reverse("auth-login"), {"email": "loginuser@test.local", "password": "StrongPass@123"})
        assert resp.status_code == 200
        assert "access" in resp.data
        assert resp.data["user"]["email"] == "loginuser@test.local"

    def test_login_with_wrong_password_fails(self):
        UserFactory(email="wrongpass@test.local", password="StrongPass@123")
        client = APIClient()
        resp = client.post(reverse("auth-login"), {"email": "wrongpass@test.local", "password": "nope"})
        assert resp.status_code == 401

    def test_me_endpoint_requires_authentication(self):
        client = APIClient()
        resp = client.get(reverse("auth-me"))
        assert resp.status_code == 401

    def test_me_endpoint_returns_current_user(self):
        user = UserFactory(email="meuser@test.local", password="StrongPass@123")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get(reverse("auth-me"))
        assert resp.status_code == 200
        assert resp.data["email"] == "meuser@test.local"

    def test_password_reset_request_does_not_leak_existence(self):
        client = APIClient()
        resp = client.post(reverse("auth-password-reset"), {"email": "doesnotexist@test.local"})
        assert resp.status_code == 200  # same response whether or not the account exists
