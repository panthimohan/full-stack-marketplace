from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.accounts.models import User, Role
from apps.vendors.models import Vendor, VendorStatus
from apps.products.models import Product, ProductStatus
from apps.orders.models import Order, VendorOrder, VendorOrderStatus, PaymentStatus
from apps.common.permissions import IsAdminRole, IsVendorRole, IsCustomerRole


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        paid_orders = Order.objects.filter(payment_status=PaymentStatus.PAID)
        total_sales = paid_orders.aggregate(total=Sum("total"))["total"] or 0

        recent_orders = Order.objects.select_related("customer").order_by("-created_at")[:10]
        recent_vendors = Vendor.objects.order_by("-created_at")[:10]

        data = {
            "total_customers": User.objects.filter(role=Role.CUSTOMER).count(),
            "total_vendors": Vendor.objects.count(),
            "pending_vendors": Vendor.objects.filter(status=VendorStatus.PENDING).count(),
            "total_products": Product.objects.filter(is_deleted=False).count(),
            "total_orders": Order.objects.count(),
            "pending_orders": VendorOrder.objects.filter(status=VendorOrderStatus.PENDING).count(),
            "total_sales": total_sales,
            "recent_orders": [
                {"order_number": o.order_number, "customer": o.customer.email,
                 "total": o.total, "status": o.payment_status, "created_at": o.created_at}
                for o in recent_orders
            ],
            "recent_vendors": [
                {"shop_name": v.shop_name, "status": v.status, "created_at": v.created_at}
                for v in recent_vendors
            ],
        }
        return Response(data)


class VendorDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user.vendor_profile
        products = Product.objects.filter(vendor=vendor, is_deleted=False)
        vendor_orders = VendorOrder.objects.filter(vendor=vendor)
        paid_vendor_orders = vendor_orders.filter(order__payment_status=PaymentStatus.PAID)

        data = {
            "total_products": products.count(),
            "active_products": products.filter(status=ProductStatus.ACTIVE).count(),
            "low_stock_products": products.filter(stock__lte=5, stock__gt=0).count(),
            "out_of_stock_products": products.filter(stock=0).count(),
            "total_orders": vendor_orders.count(),
            "pending_orders": vendor_orders.filter(status=VendorOrderStatus.PENDING).count(),
            "total_sales": paid_vendor_orders.aggregate(total=Sum("subtotal"))["total"] or 0,
            "recent_orders": [
                {"order_number": vo.order.order_number, "status": vo.status,
                 "subtotal": vo.subtotal, "created_at": vo.created_at}
                for vo in vendor_orders.select_related("order").order_by("-created_at")[:10]
            ],
        }
        return Response(data)


class CustomerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get(self, request):
        orders = Order.objects.filter(customer=request.user)
        data = {
            "total_orders": orders.count(),
            "pending_orders": orders.exclude(payment_status=PaymentStatus.PAID).count(),
            "recent_orders": [
                {"order_number": o.order_number, "total": o.total,
                 "payment_status": o.payment_status, "created_at": o.created_at}
                for o in orders.order_by("-created_at")[:5]
            ],
        }
        return Response(data)
