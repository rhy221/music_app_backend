package usecase

import (
	"time"

	"github.com/google/uuid"
	musicevents "music-app/music-events/events"
)

const serviceName = "upload-service"

func newHeader(eventType, correlationID string) musicevents.EventHeader {
	var corrPtr *string
	if correlationID != "" {
		c := correlationID
		corrPtr = &c
	}
	return musicevents.EventHeader{
		EventID:       uuid.New().String(),
		EventType:     eventType,
		Timestamp:     time.Now().UTC(),
		SourceService: serviceName,
		CorrelationID: corrPtr,
	}
}
