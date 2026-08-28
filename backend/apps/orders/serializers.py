from rest_framework import serializers
from .models import Order, VendorOrder, OrderItem, PaymentMethod


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "product_sku", "vendor_name",
                  "unit_price", "quantity", "line_subtotal"]


class VendorOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source="vendor.shop_name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.CharField(source="order.shipping_full_name", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    payment_status = serializers.CharField(source="order.payment_status", read_only=True)

    class Meta:
        model = VendorOrder
        fields = ["id", "order_number", "vendor_name", "status", "subtotal", "items",
                  "customer_name", "payment_method", "payment_status", "created_at", "updated_at"]


class VendorOrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])


class OrderSerializer(serializers.ModelSerializer):
    vendor_orders = VendorOrderSerializer(many=True, read_only=True)
    overall_status = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "order_number", "shipping_full_name", "shipping_phone", "shipping_address",
                  "shipping_city", "subtotal", "shipping_cost", "discount_total", "total",
                  "payment_method", "payment_status", "overall_status", "vendor_orders",
                  "created_at", "updated_at"]


class CheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
