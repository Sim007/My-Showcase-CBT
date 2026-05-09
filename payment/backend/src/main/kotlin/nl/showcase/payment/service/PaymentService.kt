package nl.showcase.payment.service

import nl.showcase.payment.controller.PaymentResponse
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

data class PaymentNotification(
    val notificationId: String,
    val orderId: String,
    val type: String,
    val message: String,
    val timestamp: String
)

@Service
class PaymentService(
    private val soapClient: SoapClient,
    private val rabbitTemplate: RabbitTemplate,
    private val notificationClient: NotificationClient
) {
    // Queue naam conform contracts/payment-notification/asyncapi.yaml
    private val notificationQueue = "payment.notifications"

    fun processPayment(orderId: String, amount: Double): PaymentResponse {
        val soapResult = soapClient.authorize(orderId, amount)

        val status = if (soapResult.approved) "APPROVED" else "REJECTED"
        val paymentId = "pay-${UUID.randomUUID().toString().take(8)}"
        val type = if (soapResult.approved) "PAYMENT_APPROVED" else "PAYMENT_REJECTED"
        val message = "Betaling voor order $orderId is ${if (soapResult.approved) "goedgekeurd" else "afgewezen"}"

        // Type 2: async publiceren naar queue — contracts/payment-notification/asyncapi.yaml
        val queueNotification = PaymentNotification(
            notificationId = "notif-${UUID.randomUUID().toString().take(8)}",
            orderId = orderId,
            type = type,
            message = message,
            timestamp = Instant.now().toString()
        )
        rabbitTemplate.convertAndSend(notificationQueue, queueNotification)

        // Type 1: directe REST-aanroep naar Notification service — contracts/payment-notification-rest/openapi.yaml
        notificationClient.create(orderId, type, message)

        return PaymentResponse(
            paymentId = paymentId,
            orderId = orderId,
            status = status,
            approved = soapResult.approved
        )
    }
}
