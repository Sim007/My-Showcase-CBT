package nl.showcase.payment.controller

import nl.showcase.payment.service.PaymentService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

// Contract: contracts/order-payment/1.0.0/openapi.yaml
data class PaymentRequest(val orderId: String, val amount: Double)
data class PaymentResponse(
    val paymentId: String,
    val orderId: String,
    val status: String,
    val approved: Boolean
)
data class ErrorResponse(val error: String, val message: String)

@RestController
@RequestMapping("/api/payments")
class PaymentController(private val paymentService: PaymentService) {

    @PostMapping
    fun processPayment(@RequestBody request: PaymentRequest): ResponseEntity<Any> {
        if (request.amount <= 0) {
            return ResponseEntity.badRequest().body(
                ErrorResponse("INVALID_AMOUNT", "Bedrag moet groter zijn dan 0")
            )
        }
        val response = paymentService.processPayment(request.orderId, request.amount)
        return ResponseEntity.ok(response)
    }
}
