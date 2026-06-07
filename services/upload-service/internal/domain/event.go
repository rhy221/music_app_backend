package domain

import "time"

// OutboxEvent is an event pending delivery to the message broker.
// It is persisted in the same DB transaction as the business operation
// to guarantee at-least-once delivery (Outbox Pattern).
type OutboxEvent struct {
	ID          string
	EventType   string
	Exchange    string
	RoutingKey  string
	Payload     []byte
	CreatedAt   time.Time
	ProcessedAt *time.Time
	Error       *string
}
