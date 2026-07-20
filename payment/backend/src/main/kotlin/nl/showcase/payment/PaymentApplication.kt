package nl.showcase.payment

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.amqp.core.Queue
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.web.client.RestTemplate

@SpringBootApplication
class PaymentApplication {

    @Bean
    fun restTemplate() = RestTemplate()

    // Queue naam conform contracts/payment-notification/1.0.0/asyncapi.yaml
    @Bean
    fun notificationQueue() = Queue("payment.notifications", true)

    @Bean
    fun messageConverter(objectMapper: ObjectMapper) = Jackson2JsonMessageConverter(objectMapper)

    @Bean
    fun rabbitTemplate(connectionFactory: ConnectionFactory, converter: Jackson2JsonMessageConverter): RabbitTemplate {
        val template = RabbitTemplate(connectionFactory)
        template.messageConverter = converter
        return template
    }
}

fun main(args: Array<String>) {
    runApplication<PaymentApplication>(*args)
}
