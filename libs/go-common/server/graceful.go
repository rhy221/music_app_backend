package server

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// GracefulShutdown waits for SIGINT or SIGTERM, then shuts the server down within 30 s
// and calls cleanup to close database and message-queue connections.
func GracefulShutdown(server *http.Server, cleanup func()) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}

	if cleanup != nil {
		cleanup()
	}
	log.Println("server stopped")
}
