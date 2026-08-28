from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/admin/", views.AdminDashboardView.as_view(), name="dashboard-admin"),
    path("dashboard/vendor/", views.VendorDashboardView.as_view(), name="dashboard-vendor"),
    path("dashboard/customer/", views.CustomerDashboardView.as_view(), name="dashboard-customer"),
]
