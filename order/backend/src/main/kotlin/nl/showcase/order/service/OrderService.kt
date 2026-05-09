package nl.showcase.order.service

import nl.showcase.order.controller.OrderResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class PaymentRequest(val orderId: String, val amount: Double)
data class PaymentResponse(val paymentId: String, val orderId: String, val status: String, val approved: Boolean)

@Service
class OrderService(
    private val restTemplate: RestTemplate,
    @Value("\${payment.service.url}") private val paymentServiceUrl: String
) {
    private val orders = ConcurrentHashMap<String, OrderResponse>()

    fun createOrder(amount: Double): OrderResponse {
        val orderId = "order-${UUID.randomUUID().toString().take(8)}"

        // Roep Payment service aan conform contracts/order-payment/openapi.yaml
        val paymentRequest = PaymentRequest(orderId = orderId, amount = amount)
        val paymentResponse = restTemplate.postForObject(
            "$paymentServiceUrl/api/payments",
            paymentRequest,
            PaymentResponse::class.java
        ) ?: throw RuntimeException("Geen respons van Payment service")

        val order = OrderResponse(
            orderId = orderId,
            amount = amount,
            paymentStatus = paymentResponse.status,
            approved = paymentResponse.approved
        )
        orders[orderId] = order
        return order
    }

    fun getOrder(orderId: String): OrderResponse? = orders[orderId]
}
