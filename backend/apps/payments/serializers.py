from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "order_number", "provider", "transaction_uuid", "reference_id",
                  "amount", "currency", "status", "created_at", "updated_at"]


class EsewaCallbackSerializer(serializers.Serializer):
    data = serializers.CharField()
