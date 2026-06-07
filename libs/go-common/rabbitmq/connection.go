// Package rabbitmq provides AMQP connection management with auto-reconnect.
package rabbitmq

import (
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Connection wraps an AMQP connection and channel with auto-reconnect support.
type Connection struct {
	url    string
	conn   *amqp.Connection
	ch     *amqp.Channel
	mu     sync.RWMutex
	closed bool
}

// NewConnection establishes an AMQP connection with up to 3 retry attempts (2 s backoff).
// A background goroutine monitors the connection and reconnects on drop.
func NewConnection(url string) (*Connection, error) {
	c := &Connection{url: url}
	if err := c.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect rabbitmq: %w", err)
	}
	go c.monitorConnection()
	return c, nil
}

func (c *Connection) connect() error {
	var lastErr error
	for i := 0; i < 3; i++ {
		conn, err := amqp.Dial(c.url)
		if err != nil {
			lastErr = err
			time.Sleep(2 * time.Second)
			continue
		}
		ch, err := conn.Channel()
		if err != nil {
			_ = conn.Close()
			lastErr = err
			time.Sleep(2 * time.Second)
			continue
		}
		c.mu.Lock()
		c.conn = conn
		c.ch = ch
		c.mu.Unlock()
		return nil
	}
	return fmt.Errorf("failed after 3 attempts: %w", lastErr)
}

func (c *Connection) monitorConnection() {
	for {
		c.mu.RLock()
		if c.closed {
			c.mu.RUnlock()
			return
		}
		closeCh := c.conn.NotifyClose(make(chan *amqp.Error, 1))
		c.mu.RUnlock()

		<-closeCh

		c.mu.RLock()
		closed := c.closed
		c.mu.RUnlock()
		if closed {
			return
		}
		_ = c.connect()
	}
}

// Channel returns the shared AMQP channel. Thread-safe via read-lock.
func (c *Connection) Channel() *amqp.Channel {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.ch
}

// Close gracefully shuts down the channel and connection.
func (c *Connection) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closed = true
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		_ = c.conn.Close()
	}
}
