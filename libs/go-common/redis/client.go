// Package redis provides a Redis client helper for Go microservices.
package redis

import (
	"context"
	"fmt"

	goredis "github.com/redis/go-redis/v9"
)

// NewClient connects to Redis at addr (host:port) and verifies connectivity with a Ping.
func NewClient(addr string) (*goredis.Client, error) {
	client := goredis.NewClient(&goredis.Options{
		Addr: addr,
		DB:   0,
	})
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping %s: %w", addr, err)
	}
	return client, nil
}

// Ping checks Redis connectivity. Suitable for health checks.
func Ping(ctx context.Context, client *goredis.Client) error {
	return client.Ping(ctx).Err()
}
