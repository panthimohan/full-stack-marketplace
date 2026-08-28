import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("marketplace")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "errors": response.data,
            "status_code": response.status_code,
        }
        if response.status_code >= 500:
            logger.error("Server error: %s", exc, exc_info=True)
        return response

    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return Response(
        {"success": False, "errors": {"detail": "An unexpected error occurred."}, "status_code": 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
