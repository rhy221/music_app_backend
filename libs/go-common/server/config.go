// Package server provides configuration loading and graceful shutdown for HTTP services.
package server

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all common environment-based configuration for a Go microservice.
type Config struct {
	Port           string
	DatabaseURL    string
	RabbitURL      string
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioUseSSL    bool
	JWTSecret      string
	LogLevel       string
	ServiceName    string
}

// LoadConfig reads configuration from environment variables and validates required fields.
func LoadConfig() (*Config, error) {
	c := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		RabbitURL:      os.Getenv("RABBIT_URL"),
		MinioEndpoint:  os.Getenv("MINIO_ENDPOINT"),
		MinioAccessKey: os.Getenv("MINIO_ACCESS_KEY"),
		MinioSecretKey: os.Getenv("MINIO_SECRET_KEY"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		ServiceName:    getEnv("SERVICE_NAME", "unknown"),
	}

	if raw := os.Getenv("MINIO_USE_SSL"); raw != "" {
		v, err := strconv.ParseBool(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid MINIO_USE_SSL value %q: %w", raw, err)
		}
		c.MinioUseSSL = v
	}

	required := map[string]string{
		"DATABASE_URL":     c.DatabaseURL,
		"RABBIT_URL":       c.RabbitURL,
		"MINIO_ENDPOINT":   c.MinioEndpoint,
		"MINIO_ACCESS_KEY": c.MinioAccessKey,
		"MINIO_SECRET_KEY": c.MinioSecretKey,
		"JWT_SECRET":       c.JWTSecret,
	}
	var missing []string
	for k, v := range required {
		if v == "" {
			missing = append(missing, k)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}
	return c, nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
