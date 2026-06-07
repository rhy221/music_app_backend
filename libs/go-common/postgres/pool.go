// Package postgres provides pgxpool helpers for PostgreSQL connectivity.
package postgres

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a pgxpool.Pool with production-ready defaults.
// MaxConns and MinConns are overridable via DB_MAX_CONNS / DB_MIN_CONNS env vars.
func NewPool(connString string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse pool config: %w", err)
	}

	cfg.MaxConns = int32(envInt("DB_MAX_CONNS", 20))
	cfg.MinConns = int32(envInt("DB_MIN_CONNS", 5))
	cfg.HealthCheckPeriod = 30 * time.Second
	cfg.ConnConfig.ConnectTimeout = 5 * time.Second

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}
	return pool, nil
}

// Ping performs a health-check against the pool connection.
func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("postgres ping failed: %w", err)
	}
	return nil
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
