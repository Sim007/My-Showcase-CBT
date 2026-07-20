package nl.showcase.notification

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.amqp.core.Queue
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean

@SpringBootApplication
class NotificationApplication {

    // Queue naam conform contracts/payment-notification/1.0.0/asyncapi.yaml
    @Bean
    fun notificationQueue() = Queue("payment.notifications", true)

    @Bean
    fun messageConverter(objectMapper: ObjectMapper) = Jackson2JsonMessageConverter(objectMapper)

    @Bean
    fun rabbitListenerContainerFactory(
        connectionFactory: ConnectionFactory,
        converter: Jackson2JsonMessageConverter
    ): SimpleRabbitListenerContainerFactory {
        val factory = SimpleRabbitListenerContainerFactory()
        factory.setConnectionFactory(connectionFactory)
        factory.setMessageConverter(converter)
        return factory
    }
}

fun main(args: Array<String>) {
    runApplication<NotificationApplication>(*args)
}
