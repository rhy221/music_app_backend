package redis

import (
	"context"

	goredis "github.com/redis/go-redis/v9"
)

// PlayCounter implements domain.PlayCounter using Redis INCR.
type PlayCounter struct {
	client *goredis.Client
}

func NewPlayCounter(client *goredis.Client) *PlayCounter {
	return &PlayCounter{client: client}
}

func (c *PlayCounter) IncrPlayCount(ctx context.Context, trackID string) error {
	return c.client.Incr(ctx, "playcount:"+trackID).Err()
}
