package nl.showcase.payment.controller

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import nl.showcase.payment.service.PaymentService
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.*

// Contract: contracts/order-payment/1.0.0/openapi.yaml — annotaties hieronder moeten de
// gegenereerde spec (/v3/api-docs) exact laten matchen met dat bestand, anders faalt de
// springdoc-drift-check in ci/contract-verify.sh (onderdeel 2).
data class PaymentRequest(
    @field:Schema(example = "order-123")
    val orderId: String,
    @field:Schema(example = "49.95", minimum = "0.01")
    val amount: Double
)

data class PaymentResponse(
    @field:Schema(example = "pay-abc-001")
    val paymentId: String,
    @field:Schema(example = "order-123")
    val orderId: String,
    @field:Schema(example = "APPROVED", allowableValues = ["APPROVED", "REJECTED"])
    val status: String,
    @field:Schema(example = "true")
    val approved: Boolean
)

data class ErrorResponse(val error: String, val message: String)

@RestController
@RequestMapping("/api/payments")
class PaymentController(private val paymentService: PaymentService) {

    @Operation(summary = "Verwerk een betaling voor een order")
    @ApiResponses(
        ApiResponse(
            responseCode = "200",
            description = "Betaling verwerkt",
            content = [Content(schema = Schema(implementation = PaymentResponse::class))]
        ),
        ApiResponse(
            responseCode = "400",
            description = "Ongeldige invoer",
            content = [Content(schema = Schema(implementation = ErrorResponse::class))]
        )
    )
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
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

// Onderdeel 5 — gevonden door een Playwright-scenario (ontbrekend verplicht request-veld):
// zonder deze handler geeft een niet-deserialiseerbaar verzoek (bv. ontbrekend orderId) Spring's
// eigen foutlichaam terug, dat geen "message"-veld heeft — niet-conform met het gepinde
// ErrorResponse-schema (required: [error, message], zie contracts/order-payment/1.0.0/openapi.yaml).
@RestControllerAdvice
class PaymentExceptionHandler {
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadableRequest(ex: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse("INVALID_REQUEST", "Verzoek mist een verplicht veld of is ongeldig JSON")
        )
}
