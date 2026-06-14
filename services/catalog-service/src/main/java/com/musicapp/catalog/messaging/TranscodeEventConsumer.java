package com.musicapp.catalog.messaging;

import com.company.events.track.TranscodeCompletedEvent;
import com.musicapp.catalog.dto.request.PublishTrackRequest;
import com.musicapp.catalog.service.AlbumService;
import com.musicapp.catalog.service.TrackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TranscodeEventConsumer {

    private final TrackService trackService;
    private final AlbumService albumService;

    @RabbitListener(queues = "${catalog.queues.transcode-completed}")
    public void handleTranscodeCompleted(TranscodeCompletedEvent event) {
        log.info("Received TranscodeCompletedEvent uploadJobId={}", event.data().uploadJobId());
        try {
            if (event.data().albumId() != null) {
                albumService.ensureAlbumExists(
                        UUID.fromString(event.data().albumId()),
                        event.data().albumTitle(),
                        event.data().thumbnailUrl(),
                        UUID.fromString(event.data().uploaderId())
                );
            }

            List<PublishTrackRequest.AssetRequest> assets = event.data().assets().stream()
                    .map(a -> new PublishTrackRequest.AssetRequest(
                            a.bitrate(), a.format(), a.storageUrl(), a.sizeBytes()))
                    .toList();

            LocalDate releaseDate = event.data().releaseDate() != null
                    ? LocalDate.parse(event.data().releaseDate())
                    : null;

            PublishTrackRequest req = new PublishTrackRequest(
                    event.data().uploadJobId(),
                    UUID.fromString(event.data().uploaderId()),
                    event.data().title(),
                    event.data().durationMs(),
                    event.data().genre(),
                    event.data().albumId() != null ? UUID.fromString(event.data().albumId()) : null,
                    event.data().thumbnailUrl(),
                    event.data().waveformUrl(),
                    releaseDate,
                    assets
            );

            trackService.publishTrack(req);
            log.info("Track published from upload job={}", event.data().uploadJobId());
        } catch (Exception e) {
            log.error("Failed to publish track from upload job={}: {}",
                    event.data().uploadJobId(), e.getMessage(), e);
            throw e;
        }
    }
}
