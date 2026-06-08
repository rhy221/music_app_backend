package com.musicapp.user.config;

import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StorageUrlResolver {

    @Value("${minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${minio.bucket.images:images}")
    private String imagesBucket;

    @Named("resolveAvatarUrl")
    public String resolveAvatarUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return null;
        if (objectKey.startsWith("http")) return objectKey;
        return endpoint.stripTrailing() + "/" + imagesBucket + "/" + objectKey;
    }
}
