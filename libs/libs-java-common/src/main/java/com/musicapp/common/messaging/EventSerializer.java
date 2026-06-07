package com.musicapp.common.messaging;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

/**
 * Configures Jackson for RabbitMQ message serialisation with Java 8 time support
 * and backward-compatible unknown-field handling.
 */
public class EventSerializer {

    /**
     * Builds a {@link Jackson2JsonMessageConverter} with ISO-8601 dates and unknown-field tolerance.
     */
    public Jackson2JsonMessageConverter messageConverter() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return new Jackson2JsonMessageConverter(mapper);
    }
}
