package nl.showcase.notification.controller

import nl.showcase.notification.service.NotificationService
import nl.showcase.notification.service.PaymentNotification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

// Type 1 request body — contracts/payment-notification-rest/openapi.yaml
data class CreateNotificationRequest(val orderId: String, val type: String, val message: String)
data class ErrorResponse(val error: String, val message: String)

@RestController
@RequestMapping("/api/notifications")
class NotificationController(private val notificationService: NotificationService) {

    // Type 1: directe REST-aanmaak door Payment service
    @PostMapping
    fun createNotification(@RequestBody request: CreateNotificationRequest): ResponseEntity<Any> {
        if (request.orderId.isBlank() || request.message.isBlank()) {
            return ResponseEntity.badRequest().body(
                ErrorResponse("INVALID_INPUT", "orderId en message zijn verplicht")
            )
        }
        val allowedTypes = setOf("PAYMENT_APPROVED", "PAYMENT_REJECTED")
        if (request.type !in allowedTypes) {
            return ResponseEntity.badRequest().body(
                ErrorResponse("INVALID_TYPE", "type moet PAYMENT_APPROVED of PAYMENT_REJECTED zijn")
            )
        }
        val notification = notificationService.create(request.orderId, request.type, request.message)
        return ResponseEntity.status(201).body(notification)
    }

    // Type 2 + Type 0: opvragen van notificaties
    @GetMapping
    fun getNotifications(@RequestParam orderId: String): ResponseEntity<List<PaymentNotification>> {
        val notifications = notificationService.getByOrderId(orderId)
        return ResponseEntity.ok(notifications)
    }
}
