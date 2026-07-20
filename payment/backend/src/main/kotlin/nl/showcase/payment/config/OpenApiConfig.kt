package nl.showcase.payment.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.servers.Server
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

// Onderdeel 2, springdoc-drift-check: info/servers moeten exact overeenkomen met
// contracts/order-payment/1.0.0/openapi.yaml, anders faalt ci/contract-verify.sh (--side
// provider) op de oasdiff-vergelijking tussen gepubliceerde en gegenereerde spec.
@Configuration
class OpenApiConfig {

    @Bean
    fun paymentOpenApi(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("Payment API")
                .description("Contract tussen Order-service (consumer) en Payment-service (provider)")
                .version("1.0.0")
        )
        .servers(listOf(Server().url("http://localhost:8081")))
}
