package nl.showcase.payment.service

import org.springframework.stereotype.Component
import org.springframework.ws.WebServiceMessage
import org.springframework.ws.client.core.WebServiceMessageCallback
import org.springframework.ws.client.core.WebServiceTemplate
import org.springframework.ws.soap.SoapMessage
import java.io.StringReader
import java.io.StringWriter
import javax.xml.transform.stream.StreamResult
import javax.xml.transform.stream.StreamSource

data class SoapAuthorizeResult(val transactionId: String, val approved: Boolean, val reason: String?)

// Roept externe betaalprovider aan conform contracts/payment-external/1.0.0/payment.wsdl —
// via WebServiceTemplate (onderdeel 4) zodat PayloadValidatingInterceptor (zie SoapConfig.kt)
// het uitgaande verzoek tegen het WSDL-schema kan valideren. De payload is alleen de
// AuthorizeRequest-inhoud; Spring-WS bouwt zelf de SOAP-envelope.
@Component
class SoapClient(private val webServiceTemplate: WebServiceTemplate) {

    fun authorize(orderId: String, amount: Double): SoapAuthorizeResult {
        // Root-element namespace-gekwalificeerd (tns:), kinderen bewust ongekwalificeerd (geen
        // prefix, geen default xmlns) — de WSDL-schema heeft geen elementFormDefault="qualified",
        // dus lokale elementen (orderId/amount) horen zonder namespace te staan.
        val payload = """
            <tns:AuthorizeRequest xmlns:tns="http://showcase.nl/payment/external">
              <orderId>${orderId.escapeXml()}</orderId>
              <amount>$amount</amount>
            </tns:AuthorizeRequest>
        """.trimIndent()

        val resultWriter = StringWriter()
        webServiceTemplate.sendSourceAndReceiveToResult(
            StreamSource(StringReader(payload)),
            WebServiceMessageCallback { message: WebServiceMessage ->
                (message as SoapMessage).soapAction = "http://showcase.nl/payment/external/Authorize"
            },
            StreamResult(resultWriter)
        )

        return parseSoapResponse(resultWriter.toString())
    }

    private fun String.escapeXml(): String = this
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")

    private fun parseSoapResponse(xml: String): SoapAuthorizeResult {
        val transactionId = Regex("<(?:tns:)?transactionId>(.*?)</(?:tns:)?transactionId>").find(xml)
            ?.groupValues?.get(1) ?: "unknown"
        val approved = Regex("<(?:tns:)?approved>(true|false)</(?:tns:)?approved>").find(xml)
            ?.groupValues?.get(1)?.toBoolean() ?: false
        val reason = Regex("<(?:tns:)?reason>(.*?)</(?:tns:)?reason>").find(xml)?.groupValues?.get(1)

        return SoapAuthorizeResult(transactionId, approved, reason)
    }
}
