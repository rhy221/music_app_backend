package com.musicapp.common.messaging;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares shared RabbitMQ topic exchanges and configures JSON message conversion.
 * Each service declares its own queues and bindings.
 */
@Configuration
public class RabbitConfig {

    @Bean
    public TopicExchange uploadExchange() {
        return new TopicExchange("events.upload", true, false);
    }

    @Bean
    public TopicExchange catalogExchange() {
        return new TopicExchange("events.catalog", true, false);
    }

    @Bean
    public TopicExchange streamingExchange() {
        return new TopicExchange("events.streaming", true, false);
    }

    @Bean
    public TopicExchange userExchange() {
        return new TopicExchange("events.user", true, false);
    }

    @Bean
    public TopicExchange playlistExchange() {
        return new TopicExchange("events.playlist", true, false);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
