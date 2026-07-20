package nl.showcase.payment

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.networknt.schema.JsonSchemaFactory
import com.networknt.schema.SpecVersion
import nl.showcase.payment.service.NotificationClient
import nl.showcase.payment.service.PaymentService
import nl.showcase.payment.service.SoapAuthorizeResult
import nl.showcase.payment.service.SoapClient
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.anyDouble
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verify
import org.springframework.amqp.rabbit.core.RabbitTemplate
import java.io.File

// Onderdeel 3, producerkant — valideert het bericht dat Payment daadwerkelijk naar de
// "payment.notifications"-queue publiceert tegen het uit
// contracts/payment-notification/1.0.0/asyncapi.yaml geëxtraheerde JSON Schema. Geen
// Spring-context nodig: PaymentService heeft alleen constructor-dependencies, dus
// rechtstreeks geïnstantieerd met Mockito-mocks (zelfde stijl als onderdeel 2's
// PaymentProviderContractTest — geen live RabbitMQ/SOAP/Notification nodig, consistent met de
// vaste pijplijnvolgorde: contractverificatie loopt vóór compose-up).
class PaymentNotificationProducerContractTest {

    private val objectMapper = jacksonObjectMapper()
    private val schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7)
        .getSchema(
            File("../../contracts/payment-notification/1.0.0/schemas/payment-notification-payload.schema.json").toURI()
        )

    private fun publishedNotification(approved: Boolean): Any {
        val soapClient = mock(SoapClient::class.java)
        val notificationClient = mock(NotificationClient::class.java)
        val rabbitTemplate = mock(RabbitTemplate::class.java)
        `when`(soapClient.authorize(anyString(), anyDouble()))
            .thenReturn(SoapAuthorizeResult("tx-1", approved, if (approved) null else "fraude"))

        val service = PaymentService(soapClient, rabbitTemplate, notificationClient)
        service.processPayment("order-123", 49.95)

        val captor = ArgumentCaptor.forClass(Any::class.java)
        verify(rabbitTemplate).convertAndSend(org.mockito.ArgumentMatchers.eq("payment.notifications"), captor.capture())
        return captor.value
    }

    private fun assertSchemaConform(message: Any) {
        val json = objectMapper.writeValueAsString(message)
        val node = objectMapper.readTree(json)
        val errors = schema.validate(node)
        assertTrue(errors.isEmpty()) { "Schema-violations: $errors (bericht: $json)" }
    }

    @Test
    fun `approved betaling publiceert een schema-conforme notificatie`() {
        assertSchemaConform(publishedNotification(approved = true))
    }

    @Test
    fun `rejected betaling publiceert een schema-conforme notificatie`() {
        assertSchemaConform(publishedNotification(approved = false))
    }
}
