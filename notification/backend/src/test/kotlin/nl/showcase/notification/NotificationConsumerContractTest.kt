package nl.showcase.notification

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.networknt.schema.JsonSchemaFactory
import com.networknt.schema.SpecVersion
import nl.showcase.notification.service.NotificationService
import nl.showcase.notification.service.PaymentNotification
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

// Onderdeel 3, consumerkant — valideert een inkomend RabbitMQ-bericht tegen het uit
// contracts/payment-notification/1.0.0/asyncapi.yaml geëxtraheerde JSON Schema. Geen live
// broker nodig (consistent met de vaste pijplijnvolgorde: contractverificatie loopt vóór
// compose-up) — het "bericht" is een rauwe JSON-string, zoals die letterlijk van de queue zou
// komen, vóór Spring AMQP's Jackson2JsonMessageConverter hem naar de getypeerde
// PaymentNotification omzet.
class NotificationConsumerContractTest {

    private val objectMapper = jacksonObjectMapper()
    private val schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7)
        .getSchema(
            File("../../contracts/payment-notification/1.0.0/schemas/payment-notification-payload.schema.json").toURI()
        )

    @Test
    fun `schema-conform bericht wordt correct verwerkt`() {
        val json = """
            {"notificationId":"notif-1","orderId":"order-123","type":"PAYMENT_APPROVED","message":"Betaling voor order order-123 is goedgekeurd","timestamp":"2026-01-01T00:00:00Z"}
        """.trimIndent()

        val errors = schema.validate(objectMapper.readTree(json))
        assertTrue(errors.isEmpty()) { "Schema-violations: $errors" }

        val notification = objectMapper.readValue(json, PaymentNotification::class.java)
        val service = NotificationService()
        service.receive(notification)

        assertEquals(1, service.getByOrderId("order-123").size)
        assertEquals("notif-1", service.getByOrderId("order-123").first().notificationId)
    }

    @Test
    fun `bericht zonder verplicht veld wordt door de schema-validator gevangen`() {
        // Bewust niet-conform: "notificationId" ontbreekt. Bewijst het detectiemechanisme,
        // symmetrisch aan de WireMock-consumertest uit onderdeel 2 (order-payment).
        val json = """
            {"orderId":"order-123","type":"PAYMENT_APPROVED","message":"Betaling voor order order-123 is goedgekeurd","timestamp":"2026-01-01T00:00:00Z"}
        """.trimIndent()

        val errors = schema.validate(objectMapper.readTree(json))
        assertTrue(errors.isNotEmpty(), "Verwachtte een violation voor het ontbrekende 'notificationId'-veld")
        assertTrue(errors.any { it.message.contains("notificationId") }) {
            "Verwachtte een violation over 'notificationId', kreeg: $errors"
        }
    }
}
