package httpadapter

import (
	"net/http"
	"path/filepath"
	"strings"

	"music-app/upload-service/internal/usecase"
)

const maxUploadSize = 200 << 20 // 200 MB

var allowedExts = map[string]bool{
	".mp3":  true,
	".flac": true,
	".wav":  true,
	".aac":  true,
}

type UploadHandler struct {
	upload *usecase.UploadTrackUseCase
}

func NewUploadHandler(upload *usecase.UploadTrackUseCase) *UploadHandler {
	return &UploadHandler{upload: upload}
}

func (h *UploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	requireAuth(h.handle)(w, r)
}

func (h *UploadHandler) handle(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		jsonError(w, http.StatusRequestEntityTooLarge, "file too large (max 200MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		jsonError(w, http.StatusBadRequest, "file field required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		jsonError(w, http.StatusBadRequest, "unsupported file format; allowed: mp3, flac, wav, aac")
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		jsonError(w, http.StatusBadRequest, "title is required")
		return
	}

	var genre *string
	if g := r.FormValue("genre"); g != "" {
		genre = &g
	}
	var albumID *string
	if a := r.FormValue("albumId"); a != "" {
		albumID = &a
	}

	uploaderID := userIDFromRequest(r)
	requestID := r.Header.Get("X-Request-Id")

	job, err := h.upload.Execute(r.Context(), usecase.UploadTrackInput{
		UploaderID: uploaderID,
		Title:      title,
		Genre:      genre,
		AlbumID:    albumID,
		Filename:   header.Filename,
		SizeBytes:  header.Size,
		Content:    file,
		RequestID:  requestID,
	})
	if err != nil {
		handleDomainError(w, err)
		return
	}

	jsonResponse(w, http.StatusAccepted, job)
}
