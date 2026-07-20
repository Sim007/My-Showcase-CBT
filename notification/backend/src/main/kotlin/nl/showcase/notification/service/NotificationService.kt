package nl.showcase.notification.service

import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class PaymentNotification(
    val notificationId: String,
    val orderId: String,
    val type: String,
    val message: String,
    val timestamp: String
)

@Service
class NotificationService {
    private val store = ConcurrentHashMap<String, MutableList<PaymentNotification>>()

    // Type 2: ontvangt via RabbitMQ queue (async) — contracts/payment-notification/1.0.0/asyncapi.yaml
    @RabbitListener(queues = ["payment.notifications"])
    fun receive(notification: PaymentNotification) {
        store.getOrPut(notification.orderId) { mutableListOf() }.add(notification)
    }

    // Type 1: directe REST-aanmaak — contracts/payment-notification-rest/1.0.0/openapi.yaml
    fun create(orderId: String, type: String, message: String): PaymentNotification {
        val notification = PaymentNotification(
            notificationId = "notif-${UUID.randomUUID().toString().take(8)}",
            orderId = orderId,
            type = type,
            message = message,
            timestamp = Instant.now().toString()
        )
        store.getOrPut(orderId) { mutableListOf() }.add(notification)
        return notification
    }

    fun getByOrderId(orderId: String): List<PaymentNotification> =
        store[orderId] ?: emptyList()
}
