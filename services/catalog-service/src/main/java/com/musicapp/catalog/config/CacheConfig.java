package com.musicapp.catalog.config;

import com.musicapp.catalog.dto.response.TrackSummaryDto;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper om = JsonMapper.builder().build();
        TypeReference<List<TrackSummaryDto>> trackListType = new TypeReference<>() {};

        RedisSerializer<List<TrackSummaryDto>> serializer = new RedisSerializer<>() {
            @Override
            public byte[] serialize(List<TrackSummaryDto> value) throws SerializationException {
                if (value == null) return new byte[0];
                try {
                    return om.writeValueAsBytes(value);
                } catch (Exception e) {
                    throw new SerializationException("Could not write JSON: " + e.getMessage(), e);
                }
            }

            @Override
            public List<TrackSummaryDto> deserialize(byte[] bytes) throws SerializationException {
                if (bytes == null || bytes.length == 0) return null;
                try {
                    return om.readValue(bytes, trackListType);
                } catch (Exception e) {
                    throw new SerializationException("Could not read JSON: " + e.getMessage(), e);
                }
            }
        };

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .prefixCacheNameWith("c2:")
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                "tracks:popular",      defaultConfig.entryTtl(Duration.ofMinutes(5)),
                "tracks:new-releases", defaultConfig.entryTtl(Duration.ofMinutes(5))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
