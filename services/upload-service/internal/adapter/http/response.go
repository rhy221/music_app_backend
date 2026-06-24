package httpadapter

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"

	"music-app/upload-service/internal/domain"
)

func jsonResponse(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}

func handleDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		jsonError(w, http.StatusNotFound, "not found")
	case errors.Is(err, domain.ErrConflict):
		jsonError(w, http.StatusConflict, err.Error())
	case errors.Is(err, domain.ErrValidation):
		jsonError(w, http.StatusBadRequest, err.Error())
	default:
		fmt.Fprintf(os.Stderr, "unhandled error: %v\n", err)
		jsonError(w, http.StatusInternalServerError, "internal server error")
	}
}
