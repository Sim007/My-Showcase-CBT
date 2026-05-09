package nl.showcase.payment.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.*
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate

data class SoapAuthorizeResult(val transactionId: String, val approved: Boolean, val reason: String?)

@Component
class SoapClient(
    private val restTemplate: RestTemplate,
    @Value("\${soap.provider.url}") private val soapProviderUrl: String
) {
    // Roept externe betaalprovider aan conform contracts/payment-external/payment.wsdl
    fun authorize(orderId: String, amount: Double): SoapAuthorizeResult {
        val soapEnvelope = """
            <?xml version="1.0" encoding="UTF-8"?>
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                              xmlns:tns="http://showcase.nl/payment/external">
              <soapenv:Header/>
              <soapenv:Body>
                <tns:AuthorizeRequest>
                  <tns:orderId>$orderId</tns:orderId>
                  <tns:amount>$amount</tns:amount>
                </tns:AuthorizeRequest>
              </soapenv:Body>
            </soapenv:Envelope>
        """.trimIndent()

        val headers = HttpHeaders().apply {
            contentType = MediaType.TEXT_XML
            set("SOAPAction", "http://showcase.nl/payment/external/Authorize")
        }

        val response = restTemplate.exchange(
            soapProviderUrl,
            HttpMethod.POST,
            HttpEntity(soapEnvelope, headers),
            String::class.java
        )

        return parseSoapResponse(response.body ?: "")
    }

    private fun parseSoapResponse(xml: String): SoapAuthorizeResult {
        val transactionId = Regex("<tns:transactionId>(.*?)</tns:transactionId>").find(xml)?.groupValues?.get(1)
            ?: Regex("<transactionId>(.*?)</transactionId>").find(xml)?.groupValues?.get(1)
            ?: "unknown"
        val approved = Regex("<(?:tns:)?approved>(true|false)</(?:tns:)?approved>").find(xml)
            ?.groupValues?.get(1)?.toBoolean() ?: false
        val reason = Regex("<(?:tns:)?reason>(.*?)</(?:tns:)?reason>").find(xml)?.groupValues?.get(1)

        return SoapAuthorizeResult(transactionId, approved, reason)
    }
}
