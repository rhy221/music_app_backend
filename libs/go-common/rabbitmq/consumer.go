package rabbitmq

import (
	"context"
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

// ConsumerOption configures a Consumer.
type ConsumerOption func(*consumerConfig)

type consumerConfig struct {
	prefetchCount      int
	retryCount         int
	deadLetterExchange string
}

func defaultConsumerConfig() consumerConfig {
	return consumerConfig{prefetchCount: 10, retryCount: 3}
}

// WithPrefetchCount sets the channel QoS prefetch count.
func WithPrefetchCount(n int) ConsumerOption {
	return func(c *consumerConfig) { c.prefetchCount = n }
}

// WithRetryCount sets the maximum delivery retries before routing to the DLQ.
func WithRetryCount(n int) ConsumerOption {
	return func(c *consumerConfig) { c.retryCount = n }
}

// WithDeadLetterExchange sets the dead-letter exchange name for rejected messages.
func WithDeadLetterExchange(exchange string) ConsumerOption {
	return func(c *consumerConfig) { c.deadLetterExchange = exchange }
}

// Consumer receives AMQP messages from a queue and dispatches them to a handler function.
type Consumer struct {
	conn    *Connection
	queue   string
	handler func([]byte) error
	cfg     consumerConfig
	cancel  context.CancelFunc
}

// NewConsumer creates a Consumer for the given queue. Opts are applied in order.
func NewConsumer(conn *Connection, queue string, handler func([]byte) error, opts ...ConsumerOption) *Consumer {
	cfg := defaultConsumerConfig()
	for _, o := range opts {
		o(&cfg)
	}
	return &Consumer{conn: conn, queue: queue, handler: handler, cfg: cfg}
}

// Start begins consuming messages. Blocks until ctx is cancelled or Stop is called.
func (c *Consumer) Start(ctx context.Context) error {
	ch := c.conn.Channel()
	if err := ch.Qos(c.cfg.prefetchCount, 0, false); err != nil {
		return fmt.Errorf("failed to set qos: %w", err)
	}

	msgs, err := ch.Consume(c.queue, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("failed to consume from %s: %w", c.queue, err)
	}

	ctx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-msgs:
			if !ok {
				return nil
			}
			c.process(msg)
		}
	}
}

func (c *Consumer) process(msg amqp.Delivery) {
	if err := c.handler(msg.Body); err != nil {
		retries, _ := msg.Headers["x-retry-count"].(int32)
		if int(retries) >= c.cfg.retryCount {
			_ = msg.Reject(false)
		} else {
			_ = msg.Nack(false, true)
		}
		return
	}
	_ = msg.Ack(false)
}

// Stop cancels the consumer context, draining in-flight messages.
func (c *Consumer) Stop() {
	if c.cancel != nil {
		c.cancel()
	}
}
