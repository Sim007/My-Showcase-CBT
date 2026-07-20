package nl.showcase.order

import com.atlassian.oai.validator.wiremock.junit5.OpenApiValidationException
import com.atlassian.oai.validator.wiremock.junit5.OpenApiValidator
import com.github.tomakehurst.wiremock.client.WireMock.okJson
import com.github.tomakehurst.wiremock.client.WireMock.post
import com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import com.github.tomakehurst.wiremock.junit5.WireMockExtension
import nl.showcase.order.service.OrderService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.RegisterExtension
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.client.RestTemplate

// Onderdeel 2, consumerkant — WireMock-stub voor Payment, response opgebouwd uit de
// property-examples in contracts/order-payment/1.0.0/openapi.yaml, met OpenApiValidator (WireMock
// PostServeAction): elk verzoek dat Order stuurt wordt tegen de spec gevalideerd. Geen Spring-context nodig:
// OrderService heeft buiten RestTemplate + de payment-URL geen andere dependencies, dus
// rechtstreeks geïnstantieerd — sneller en zonder het ordeningsrisico van
// @DynamicPropertySource rond een pas-tijdens-de-testrun bekende WireMock-poort.
class OrderPaymentConsumerContractTest {

    private lateinit var orderService: OrderService

    @BeforeEach
    fun setup() {
        orderService = OrderService(RestTemplate(), "http://localhost:${WIREMOCK.port}")
    }

    @AfterEach
    fun resetValidation() {
        VALIDATION_LISTENER.reset()
    }

    @Test
    fun `Order stuurt een spec-conform verzoek naar Payment`() {
        WIREMOCK.stubFor(
            post(urlEqualTo("/api/payments"))
                .willReturn(
                    okJson(
                        """{"paymentId":"pay-abc-001","orderId":"order-123","status":"APPROVED","approved":true}"""
                    )
                )
        )

        orderService.createOrder(49.95)

        // PostServeAction-validatie draait asynchroon, ná het versturen van de respons — even
        // wachten voordat het rapport wordt uitgelezen.
        Thread.sleep(300)
        VALIDATION_LISTENER.assertValidationPassed()
    }

    @Test
    fun `een niet-conform verzoek zonder verplicht veld wordt door de validator gevangen`() {
        WIREMOCK.stubFor(
            post(urlEqualTo("/api/payments"))
                .willReturn(
                    okJson(
                        """{"paymentId":"pay-abc-001","orderId":"order-123","status":"APPROVED","approved":true}"""
                    )
                )
        )

        // Bewust niet-conform: verplicht veld "orderId" ontbreekt. Order's eigen implementatie
        // stuurt vandaag altijd een geldig verzoek (zie de vorige test) — deze test bewijst dat
        // de gate het zou vangen mocht dat ooit veranderen (demo-scenario 2's mechanisme).
        val headers = HttpHeaders().apply { contentType = MediaType.APPLICATION_JSON }
        RestTemplate().postForEntity(
            "http://localhost:${WIREMOCK.port}/api/payments",
            HttpEntity("""{"amount":49.95}""", headers),
            String::class.java
        )

        Thread.sleep(300)
        val exception = assertThrows(OpenApiValidationException::class.java) {
            VALIDATION_LISTENER.assertValidationPassed()
        }
        assertTrue(exception.message?.contains("orderId") == true) {
            "Verwachtte een violation over het ontbrekende 'orderId'-veld, kreeg: ${exception.message}"
        }
    }

    companion object {
        private val VALIDATION_LISTENER = OpenApiValidator(
            "../../contracts/order-payment/1.0.0/openapi.yaml"
        )

        @RegisterExtension
        @JvmField
        val WIREMOCK: WireMockExtension = WireMockExtension.newInstance()
            .options(wireMockConfig().dynamicPort().extensions(VALIDATION_LISTENER))
            .build()
    }
}
