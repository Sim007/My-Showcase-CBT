package nl.showcase.payment.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.ws.client.core.WebServiceTemplate
import org.springframework.ws.client.support.interceptor.PayloadValidatingInterceptor

// Onderdeel 4, SOAP-grens: WebServiceTemplate + PayloadValidatingInterceptor valideren elk
// uitgaand Authorize-verzoek tegen src/main/resources/schemas/payment-external.xsd — een
// bewuste, met CLAUDE.md gedocumenteerde kopie van contracts/payment-external/1.0.0/schemas/
// payment-external.xsd. Rechtstreeks vanuit contracts/ bundelen (zoals eerst geprobeerd, via een
// extra pom.xml-<resource>-blok) werkt niet in productie: de Docker-buildcontext van dit
// deelsysteem is beperkt tot payment/backend/, dus contracts/ (buiten die context) is
// onbereikbaar tijdens `docker build`. Bij een WSDL-schemawijziging: beide bestanden bijwerken.
//
// Alleen requestvalidatie: de bestaande WireMock-fixtures voor de responses
// (CBT-D/wiremock/mappings/soap-authorize-*.json) gebruiken namespace-gequalificeerde
// child-elementen die niet overeenkomen met de (unqualified) WSDL-schema — responsvalidatie zou
// daar altijd op stuklopen. Zie CLAUDE.md.
@Configuration
class SoapConfig {

    @Bean
    fun paymentExternalValidatingInterceptor(): PayloadValidatingInterceptor =
        PayloadValidatingInterceptor().apply {
            setSchema(ClassPathResource("schemas/payment-external.xsd"))
            setValidateRequest(true)
            setValidateResponse(false)
        }

    @Bean
    fun webServiceTemplate(
        @Value("\${soap.provider.url}") soapProviderUrl: String,
        interceptor: PayloadValidatingInterceptor
    ): WebServiceTemplate = WebServiceTemplate().apply {
        defaultUri = soapProviderUrl
        interceptors = arrayOf(interceptor)
    }
}
