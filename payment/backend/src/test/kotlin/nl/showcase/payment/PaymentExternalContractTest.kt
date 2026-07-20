package nl.showcase.payment

import com.github.tomakehurst.wiremock.client.WireMock.aResponse
import com.github.tomakehurst.wiremock.client.WireMock.matchingXPath
import com.github.tomakehurst.wiremock.client.WireMock.post
import com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import com.github.tomakehurst.wiremock.junit5.WireMockExtension
import nl.showcase.payment.service.SoapClient
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.RegisterExtension
import org.springframework.core.io.ClassPathResource
import org.springframework.ws.client.core.WebServiceTemplate
import org.springframework.ws.client.support.interceptor.PayloadValidatingInterceptor
import org.springframework.ws.client.support.interceptor.WebServiceValidationException
import java.io.StringReader
import java.io.StringWriter
import javax.xml.transform.stream.StreamResult
import javax.xml.transform.stream.StreamSource

// Onderdeel 4, consumerkant (type 3 — buiten de tribe, alleen consumerkant) — bewijst dat
// PayloadValidatingInterceptor uitgaande Authorize-verzoeken tegen
// contracts/payment-external/1.0.0/schemas/payment-external.xsd valideert. In-process WireMock
// speelt de bestaande CBT-D/wiremock/mappings/soap-authorize-*.json-logica na (approved default,
// rejected bij orderId 999) — geen live docker-compose nodig, consistent met de vaste
// pijplijnvolgorde (contractverificatie loopt vóór compose-up).
class PaymentExternalContractTest {

    private val interceptor = PayloadValidatingInterceptor().apply {
        setSchema(ClassPathResource("schemas/payment-external.xsd"))
        setValidateRequest(true)
        setValidateResponse(false)
        // Normaal roept Spring's bean-lifecycle dit aan (InitializingBean) — hier buiten een
        // Spring-context, dus expliciet nodig om de XmlValidator te bouwen.
        afterPropertiesSet()
    }

    private fun webServiceTemplate(): WebServiceTemplate = WebServiceTemplate().apply {
        defaultUri = "http://localhost:${WIREMOCK.port}/soap/payment"
        interceptors = arrayOf(interceptor)
    }

    private fun stubApprovedAndRejected() {
        WIREMOCK.stubFor(
            post(urlEqualTo("/soap/payment"))
                .atPriority(2)
                .withRequestBody(matchingXPath("//*[local-name()='orderId' and not(text()='999')]"))
                .willReturn(
                    aResponse().withStatus(200).withHeader("Content-Type", "text/xml;charset=UTF-8").withBody(
                        """<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://showcase.nl/payment/external"><soapenv:Header/><soapenv:Body><tns:AuthorizeResponse><tns:transactionId>txn-approved</tns:transactionId><tns:approved>true</tns:approved></tns:AuthorizeResponse></soapenv:Body></soapenv:Envelope>"""
                    )
                )
        )
        WIREMOCK.stubFor(
            post(urlEqualTo("/soap/payment"))
                .atPriority(1)
                .withRequestBody(matchingXPath("//*[local-name()='orderId' and text()='999']"))
                .willReturn(
                    aResponse().withStatus(200).withHeader("Content-Type", "text/xml;charset=UTF-8").withBody(
                        """<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://showcase.nl/payment/external"><soapenv:Header/><soapenv:Body><tns:AuthorizeResponse><tns:transactionId>txn-rejected-999</tns:transactionId><tns:approved>false</tns:approved><tns:reason>Order 999 is geblokkeerd door fraudedetectie</tns:reason></tns:AuthorizeResponse></soapenv:Body></soapenv:Envelope>"""
                    )
                )
        )
    }

    @Test
    fun `approved betaling stuurt een schema-conform verzoek`() {
        stubApprovedAndRejected()
        val client = SoapClient(webServiceTemplate())

        val result = client.authorize("order-123", 49.95)

        assertEquals("txn-approved", result.transactionId)
        assertTrue(result.approved)
    }

    @Test
    fun `rejected betaling (orderId 999) stuurt ook een schema-conform verzoek`() {
        stubApprovedAndRejected()
        val client = SoapClient(webServiceTemplate())

        val result = client.authorize("999", 10.0)

        assertEquals("txn-rejected-999", result.transactionId)
        assertTrue(!result.approved)
        assertEquals("Order 999 is geblokkeerd door fraudedetectie", result.reason)
    }

    @Test
    fun `een niet-conform verzoek zonder verplicht veld wordt door de interceptor gevangen`() {
        // Bewust niet-conform: "amount" ontbreekt. SoapClient zelf bouwt altijd een geldig
        // verzoek (zie de twee tests hierboven) — deze test bewijst dat de interceptor het zou
        // vangen mocht dat ooit veranderen, symmetrisch aan de niet-conform-testgevallen uit
        // onderdeel 2/3.
        val payload = """
            <tns:AuthorizeRequest xmlns:tns="http://showcase.nl/payment/external">
              <orderId>order-123</orderId>
            </tns:AuthorizeRequest>
        """.trimIndent()

        val exception = assertThrows(WebServiceValidationException::class.java) {
            webServiceTemplate().sendSourceAndReceiveToResult(
                StreamSource(StringReader(payload)),
                StreamResult(StringWriter())
            )
        }
        assertTrue(exception.message?.contains("amount") == true) {
            "Verwachtte een violation over het ontbrekende 'amount'-veld, kreeg: ${exception.message}"
        }
    }

    companion object {
        @RegisterExtension
        @JvmField
        val WIREMOCK: WireMockExtension = WireMockExtension.newInstance()
            .options(wireMockConfig().dynamicPort())
            .build()
    }
}
