package nl.showcase.payment

import com.atlassian.oai.validator.OpenApiInteractionValidator
import com.atlassian.oai.validator.model.Request
import com.atlassian.oai.validator.model.SimpleRequest
import com.atlassian.oai.validator.model.SimpleResponse
import nl.showcase.payment.service.NotificationClient
import nl.showcase.payment.service.SoapAuthorizeResult
import nl.showcase.payment.service.SoapClient
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyDouble
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.io.File

// Onderdeel 2, providerkant — verificatie tegen contracts/order-payment/1.0.0/openapi.yaml.
// Gebruikt swagger-request-validator-core rechtstreeks (niet de -mockmvc-adapter, zie CLAUDE.md)
// via een echte HTTP-aanroep op een random-port context; externe dependencies (SOAP, RabbitMQ,
// Notification-REST) zijn gemockt zodat deze test los van de gecomponeerde stack draait — precies
// zoals de vaste pijplijnvolgorde vereist (contractverificatie loopt vóór compose up).
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PaymentProviderContractTest {

    @LocalServerPort
    private var port: Int = 0

    @MockitoBean
    private lateinit var soapClient: SoapClient

    @MockitoBean
    private lateinit var notificationClient: NotificationClient

    @MockitoBean
    private lateinit var rabbitTemplate: RabbitTemplate

    private val restTemplate = TestRestTemplate()

    private fun baseUrl() = "http://localhost:$port"

    private fun jsonHeaders() = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }

    private fun validate(method: Request.Method, path: String, requestBody: String?, status: Int, responseBody: String?) {
        val request = SimpleRequest.Builder(method, path)
            .withHeader("Content-Type", "application/json")
            .apply { if (requestBody != null) withBody(requestBody) }
            .build()
        val response = SimpleResponse.Builder(status)
            .withHeader("Content-Type", "application/json")
            .apply { if (responseBody != null) withBody(responseBody) }
            .build()

        val report = validator.validate(request, response)
        assertFalse(report.hasErrors()) { "Spec-violations: ${report.messages}" }
    }

    @Test
    fun `approved betaling voldoet aan contract`() {
        `when`(soapClient.authorize(anyString(), anyDouble()))
            .thenReturn(SoapAuthorizeResult("tx-1", approved = true, reason = null))

        val requestBody = """{"orderId":"order-123","amount":49.95}"""
        val response = restTemplate.postForEntity(
            "${baseUrl()}/api/payments",
            HttpEntity(requestBody, jsonHeaders()),
            String::class.java
        )

        assertTrue(response.statusCode.is2xxSuccessful)
        validate(Request.Method.POST, "/api/payments", requestBody, response.statusCode.value(), response.body)
    }

    @Test
    fun `rejected betaling voldoet aan contract`() {
        `when`(soapClient.authorize(anyString(), anyDouble()))
            .thenReturn(SoapAuthorizeResult("tx-2", approved = false, reason = "fraude"))

        val requestBody = """{"orderId":"order-999","amount":10.0}"""
        val response = restTemplate.postForEntity(
            "${baseUrl()}/api/payments",
            HttpEntity(requestBody, jsonHeaders()),
            String::class.java
        )

        assertTrue(response.statusCode.is2xxSuccessful)
        validate(Request.Method.POST, "/api/payments", requestBody, response.statusCode.value(), response.body)
    }

    @Test
    fun `ongeldig bedrag geeft 400 conform ErrorResponse-schema`() {
        // amount=0 schendt zelf ook de spec (minimum: 0.01) — dat is precies waarom Payment hem
        // afwijst. Hier valideren we daarom alleen de respons tegen het schema, niet het
        // volledige verzoek+respons-paar (dat zou de bewust ongeldige request ook als violation
        // melden, wat hier niet is wat we testen).
        val requestBody = """{"orderId":"order-123","amount":0}"""
        val response = restTemplate.postForEntity(
            "${baseUrl()}/api/payments",
            HttpEntity(requestBody, jsonHeaders()),
            String::class.java
        )

        assertTrue(response.statusCode.value() == 400)

        val simpleResponse = SimpleResponse.Builder(response.statusCode.value())
            .withHeader("Content-Type", "application/json")
            .withBody(response.body)
            .build()
        val report = validator.validateResponse("/api/payments", Request.Method.POST, simpleResponse)
        assertFalse(report.hasErrors()) { "Spec-violations: ${report.messages}" }
    }

    // Onderdeel 2, springdoc-drift-check: dumpt de live-gegenereerde spec zodat
    // ci/contract-verify.sh die met oasdiff tegen de gepinde spec kan leggen. Faalt bij
    // afwijking (niet alleen bij breaking changes — dat is diff-gate.sh's taak).
    // JSON i.p.v. /v3/api-docs.yaml: die laatste triggert een bekende springdoc/JAXB-crash
    // (OAS 3.1-conversiepad zoekt javax.xml.bind, dat niet meer op de JDK-classpath zit) —
    // oasdiff vergelijkt JSON en YAML probleemloos, dus dit is functioneel gelijkwaardig.
    @Test
    fun `genereerde openapi-spec wordt gedumpt voor de drift-check`() {
        val response = restTemplate.getForEntity("${baseUrl()}/v3/api-docs", String::class.java)
        assertTrue(response.statusCode.is2xxSuccessful, "Onverwachte status ${response.statusCode}: ${response.body}")

        val outFile = File("target/generated-openapi.json")
        outFile.parentFile.mkdirs()
        outFile.writeText(response.body ?: "")
        assertTrue(outFile.length() > 0, "Gegenereerde spec is leeg")
    }

    companion object {
        private lateinit var validator: OpenApiInteractionValidator

        @BeforeAll
        @JvmStatic
        fun setupValidator() {
            validator = OpenApiInteractionValidator
                .createFor("../../contracts/order-payment/1.0.0/openapi.yaml")
                .build()
        }
    }
}
