package nl.showcase.order.controller

import nl.showcase.order.service.OrderService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class CreateOrderRequest(val amount: Double)
data class OrderResponse(
    val orderId: String,
    val amount: Double,
    val paymentStatus: String,
    val approved: Boolean
)
data class ErrorResponse(val error: String, val message: String)

@RestController
@RequestMapping("/api/orders")
class OrderController(private val orderService: OrderService) {

    @PostMapping
    fun createOrder(@RequestBody request: CreateOrderRequest): ResponseEntity<Any> {
        if (request.amount <= 0) {
            return ResponseEntity.badRequest().body(
                ErrorResponse("INVALID_AMOUNT", "Bedrag moet groter zijn dan 0")
            )
        }
        val response = orderService.createOrder(request.amount)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{orderId}")
    fun getOrder(@PathVariable orderId: String): ResponseEntity<OrderResponse> {
        val response = orderService.getOrder(orderId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(response)
    }
}
