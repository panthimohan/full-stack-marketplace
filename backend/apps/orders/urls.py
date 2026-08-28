from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("orders", views.CustomerOrderViewSet, basename="order")
router.register("vendor/orders", views.VendorOrderViewSet, basename="vendor-order")
router.register("admin/orders", views.AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
] + router.urls
