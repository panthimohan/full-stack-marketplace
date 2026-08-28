from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("admin/payments", views.AdminPaymentViewSet, basename="admin-payment")

urlpatterns = [
    path("payments/esewa/callback/", views.EsewaCallbackView.as_view(), name="esewa-callback"),
    path("payments/esewa/failure/", views.EsewaFailureView.as_view(), name="esewa-failure"),
    path("payments/<str:transaction_uuid>/status/", views.PaymentStatusView.as_view(), name="payment-status"),
] + router.urls
