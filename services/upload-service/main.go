package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	jobId := fmt.Sprintf("job-%d", time.Now().UnixMilli())
	jsonResponse(w, http.StatusAccepted, map[string]any{
		"jobId":     jobId,
		"status":    "PENDING",
		"createdAt": time.Now().UTC().Format(time.RFC3339),
		"message":   "Upload received, transcoding queued",
	})
}

func handleJobs(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]any{
		"items": []map[string]any{
			{
				"jobId":     "job-001",
				"fileName":  "my-track.mp3",
				"status":    "COMPLETED",
				"progress":  100,
				"createdAt": "2024-06-04T10:00:00Z",
				"updatedAt": "2024-06-04T10:05:00Z",
			},
			{
				"jobId":     "job-002",
				"fileName":  "new-track.flac",
				"status":    "PROCESSING",
				"progress":  60,
				"createdAt": "2024-06-05T08:00:00Z",
				"updatedAt": "2024-06-05T08:03:00Z",
			},
		},
		"total": 2,
		"page":  0,
		"size":  20,
	})
}

func handleJobDetail(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	jobId := parts[len(parts)-1]

	switch r.Method {
	case http.MethodGet:
		jsonResponse(w, http.StatusOK, map[string]any{
			"jobId":    jobId,
			"fileName": "my-track.mp3",
			"status":   "COMPLETED",
			"progress": 100,
			"tasks": []map[string]any{
				{"taskId": "task-001", "format": "MP3_128", "status": "COMPLETED", "outputUrl": "https://cdn.example.com/tracks/track-001-128.mp3"},
				{"taskId": "task-002", "format": "FLAC", "status": "COMPLETED", "outputUrl": "https://cdn.example.com/tracks/track-001.flac"},
			},
			"createdAt": "2024-06-04T10:00:00Z",
			"updatedAt": "2024-06-04T10:05:00Z",
		})
	default:
		http.NotFound(w, r)
	}
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/upload", handleUpload)

	mux.HandleFunc("/api/v1/upload/jobs", handleJobs)

	mux.HandleFunc("/api/v1/upload/jobs/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/retry") {
			parts := strings.Split(strings.TrimSuffix(path, "/retry"), "/")
			jobId := parts[len(parts)-1]
			jsonResponse(w, http.StatusAccepted, map[string]any{"jobId": jobId, "status": "PENDING", "message": "Job retry queued"})
			return
		}
		if strings.HasSuffix(path, "/cancel") {
			parts := strings.Split(strings.TrimSuffix(path, "/cancel"), "/")
			jobId := parts[len(parts)-1]
			jsonResponse(w, http.StatusOK, map[string]any{"jobId": jobId, "status": "CANCELLED"})
			return
		}
		handleJobDetail(w, r)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, map[string]any{"status": "ok", "service": "upload-service"})
	})

	port := "8086"
	fmt.Printf("upload-service listening on :%s\n", port)
	http.ListenAndServe(":"+port, mux)
}
