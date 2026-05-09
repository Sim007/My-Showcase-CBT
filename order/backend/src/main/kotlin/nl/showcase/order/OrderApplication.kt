package nl.showcase.order

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.web.client.RestTemplate

@SpringBootApplication
class OrderApplication {
    @Bean
    fun restTemplate() = RestTemplate()
}

fun main(args: Array<String>) {
    runApplication<OrderApplication>(*args)
}
