package nl.showcase.payment.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

data class CreateNotificationRequest(val orderId: String, val type: String, val message: String)
data class NotificationResponse(
    val notificationId: String,
    val orderId: String,
    val type: String,
    val message: String,
    val timestamp: String
)

// Type 1: Payment roept Notification aan via REST — contracts/payment-notification-rest/openapi.yaml
@Component
class NotificationClient(
    private val restTemplate: RestTemplate,
    @Value("\${notification.service.url}") private val notificationServiceUrl: String
) {
    fun create(orderId: String, type: String, message: String): NotificationResponse? =
        runCatching {
            restTemplate.postForObject(
                "$notificationServiceUrl/api/notifications",
                CreateNotificationRequest(orderId, type, message),
                NotificationResponse::class.java
            )
        }.getOrNull()
}
