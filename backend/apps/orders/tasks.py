import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger("marketplace")


@shared_task
def send_order_confirmation_email(order_id: str):
    from .models import Order
    try:
        order = Order.objects.select_related("customer").get(pk=order_id)
    except Order.DoesNotExist:
        logger.warning("send_order_confirmation_email: order %s not found", order_id)
        return
    send_mail(
        subject=f"Order confirmed — {order.order_number}",
        message=(
            f"Hi {order.shipping_full_name},\n\n"
            f"Your order {order.order_number} for a total of {order.total} has been placed successfully.\n"
            f"Payment method: {order.payment_method}.\n\nThank you for shopping with us!"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.customer.email],
        fail_silently=True,
    )
    logger.info("Order confirmation email queued for %s", order.customer.email)
