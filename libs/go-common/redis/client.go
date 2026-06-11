// Package redis provides a Redis client helper for Go microservices.
package redis

import (
	"context"
	"fmt"

	goredis "github.com/redis/go-redis/v9"
)

// NewClient connects to Redis. addr may be a redis:// URL (with optional auth)
// or a plain host:port address.
func NewClient(addr string) (*goredis.Client, error) {
	var opts *goredis.Options
	if len(addr) >= 8 && addr[:8] == "redis://" {
		var err error
		opts, err = goredis.ParseURL(addr)
		if err != nil {
			return nil, fmt.Errorf("redis parse url: %w", err)
		}
	} else {
		opts = &goredis.Options{Addr: addr, DB: 0}
	}
	client := goredis.NewClient(opts)
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping %s: %w", addr, err)
	}
	return client, nil
}

// Ping checks Redis connectivity. Suitable for health checks.
func Ping(ctx context.Context, client *goredis.Client) error {
	return client.Ping(ctx).Err()
}
