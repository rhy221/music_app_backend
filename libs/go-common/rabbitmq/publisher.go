package rabbitmq

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Publisher sends events to a RabbitMQ exchange.
type Publisher struct {
	conn *Connection
}

// NewPublisher creates a Publisher backed by the given Connection.
func NewPublisher(conn *Connection) *Publisher {
	return &Publisher{conn: conn}
}

// Publish marshals event as JSON and sends it to exchange/routingKey with persistent delivery.
func (p *Publisher) Publish(exchange, routingKey string, event any) error {
	return p.publish(exchange, routingKey, event, "")
}

// PublishWithCorrelation is like Publish but sets CorrelationId for distributed tracing.
func (p *Publisher) PublishWithCorrelation(exchange, routingKey string, event any, correlationId string) error {
	return p.publish(exchange, routingKey, event, correlationId)
}

func (p *Publisher) publish(exchange, routingKey string, event any, correlationId string) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	msg := amqp.Publishing{
		ContentType:   "application/json",
		DeliveryMode:  amqp.Persistent,
		MessageId:     uuid.New().String(),
		Timestamp:     time.Now(),
		CorrelationId: correlationId,
		Body:          body,
	}

	ch := p.conn.Channel()
	if err := ch.Publish(exchange, routingKey, false, false, msg); err != nil {
		return fmt.Errorf("failed to publish to %s/%s: %w", exchange, routingKey, err)
	}
	return nil
}
