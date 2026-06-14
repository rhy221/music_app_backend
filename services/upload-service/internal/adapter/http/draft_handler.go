package httpadapter

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/usecase"
)

// ── Response DTOs ─────────────────────────────────────────────────────────────
// Domain structs have no json tags; these DTOs produce the camelCase shape the
// frontend expects (e.g. "id", "thumbnailUrl", "audioConfirmed").

type trackResponse struct {
	ID             string    `json:"id"`
	DraftID        string    `json:"draftId"`
	Title          string    `json:"title"`
	TrackNumber    int       `json:"trackNumber"`
	AudioConfirmed bool      `json:"audioConfirmed"`
	CreatedAt      time.Time `json:"createdAt"`
}

type draftResponse struct {
	ID           string          `json:"id"`
	UploaderID   string          `json:"uploaderId"`
	ReleaseType  string          `json:"releaseType"`
	Title        string          `json:"title"`
	Genre        *string         `json:"genre"`
	ThumbnailURL *string         `json:"thumbnailUrl"`
	ReleaseDate  *string         `json:"releaseDate"`
	Status       string          `json:"status"`
	Tracks       []trackResponse `json:"tracks"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

func toTrackResponse(t domain.DraftTrack) trackResponse {
	return trackResponse{
		ID:             t.ID,
		DraftID:        t.DraftID,
		Title:          t.Title,
		TrackNumber:    t.TrackNumber,
		AudioConfirmed: t.StorageURL != nil,
		CreatedAt:      t.CreatedAt,
	}
}

func toDraftResponse(d *domain.UploadDraft) draftResponse {
	tracks := make([]trackResponse, len(d.Tracks))
	for i, t := range d.Tracks {
		tracks[i] = toTrackResponse(t)
	}
	var releaseDate *string
	if d.ReleaseDate != nil {
		s := d.ReleaseDate.Format("2006-01-02")
		releaseDate = &s
	}
	return draftResponse{
		ID:           d.ID,
		UploaderID:   d.UploaderID,
		ReleaseType:  string(d.ReleaseType),
		Title:        d.Title,
		Genre:        d.Genre,
		ThumbnailURL: d.ThumbnailURL,
		ReleaseDate:  releaseDate,
		Status:       string(d.Status),
		Tracks:       tracks,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}

const maxThumbnailSize = 10 << 20 // 10 MB

type DraftHandler struct {
	prefix       string
	jwtSecret    string
	createDraft  *usecase.CreateDraftUseCase
	getDraft     *usecase.GetDraftUseCase
	addTrack     *usecase.AddTrackUseCase
	deleteTrack  *usecase.DeleteTrackUseCase
	audioURL     *usecase.GetAudioUploadURLUseCase
	confirmAudio *usecase.ConfirmAudioUseCase
	submitDraft  *usecase.SubmitDraftUseCase
	cancelDraft  *usecase.CancelDraftUseCase
}

func NewDraftHandler(
	prefix string,
	jwtSecret string,
	createDraft *usecase.CreateDraftUseCase,
	getDraft *usecase.GetDraftUseCase,
	addTrack *usecase.AddTrackUseCase,
	deleteTrack *usecase.DeleteTrackUseCase,
	audioURL *usecase.GetAudioUploadURLUseCase,
	confirmAudio *usecase.ConfirmAudioUseCase,
	submitDraft *usecase.SubmitDraftUseCase,
	cancelDraft *usecase.CancelDraftUseCase,
) *DraftHandler {
	return &DraftHandler{
		prefix:       prefix,
		jwtSecret:    jwtSecret,
		createDraft:  createDraft,
		getDraft:     getDraft,
		addTrack:     addTrack,
		deleteTrack:  deleteTrack,
		audioURL:     audioURL,
		confirmAudio: confirmAudio,
		submitDraft:  submitDraft,
		cancelDraft:  cancelDraft,
	}
}

func (h *DraftHandler) Register(mux *http.ServeMux) {
	auth := requireAuth(h.jwtSecret)
	mux.HandleFunc(h.prefix, auth(h.handleRoot))
	mux.HandleFunc(h.prefix+"/", auth(h.handleByID))
}

// handleRoot: POST /drafts (create draft)
func (h *DraftHandler) handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	h.handleCreate(w, r)
}

// handleByID dispatches all /drafts/{id}/... routes
// Supported paths (after prefix/):
//   {id}                              GET
//   {id}/submit                       POST
//   {id}/cancel                       POST
//   {id}/tracks                       POST
//   {id}/tracks/{trackId}             DELETE
//   {id}/tracks/{trackId}/audio-url   GET
//   {id}/tracks/{trackId}/confirm     POST
func (h *DraftHandler) handleByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, h.prefix+"/")
	parts := strings.Split(rest, "/")
	draftID := parts[0]
	if draftID == "" {
		jsonError(w, http.StatusNotFound, "not found")
		return
	}

	switch len(parts) {
	case 1:
		// GET /drafts/{id}
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.handleGet(w, r, draftID)

	case 2:
		// POST /drafts/{id}/submit|cancel|tracks
		segment := parts[1]
		if r.Method != http.MethodPost {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		switch segment {
		case "submit":
			h.handleSubmit(w, r, draftID)
		case "cancel":
			h.handleCancel(w, r, draftID)
		case "tracks":
			h.handleAddTrack(w, r, draftID)
		default:
			jsonError(w, http.StatusNotFound, "not found")
		}

	case 3:
		// DELETE /drafts/{id}/tracks/{trackId}
		if parts[1] != "tracks" {
			jsonError(w, http.StatusNotFound, "not found")
			return
		}
		if r.Method != http.MethodDelete {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.handleDeleteTrack(w, r, draftID, parts[2])

	case 4:
		// /drafts/{id}/tracks/{trackId}/{action}
		if parts[1] != "tracks" {
			jsonError(w, http.StatusNotFound, "not found")
			return
		}
		trackID := parts[2]
		action := parts[3]
		switch action {
		case "audio-url":
			if r.Method != http.MethodGet {
				jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			h.handleAudioURL(w, r, draftID, trackID)
		case "confirm":
			if r.Method != http.MethodPost {
				jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			h.handleConfirmAudio(w, r, draftID, trackID)
		default:
			jsonError(w, http.StatusNotFound, "not found")
		}

	default:
		jsonError(w, http.StatusNotFound, "not found")
	}
}

func (h *DraftHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxThumbnailSize+1<<20)
	if err := r.ParseMultipartForm(maxThumbnailSize); err != nil {
		jsonError(w, http.StatusRequestEntityTooLarge, "request too large (max 10MB)")
		return
	}

	releaseType := domain.ReleaseType(r.FormValue("release_type"))
	if releaseType != domain.ReleaseTypeAlbum {
		releaseType = domain.ReleaseTypeSingle
	}

	var releaseDate *time.Time
	if raw := strings.TrimSpace(r.FormValue("release_date")); raw != "" {
		if t, err := time.Parse("2006-01-02", raw); err == nil {
			releaseDate = &t
		}
	}

	in := usecase.CreateDraftInput{
		UploaderID:  userIDFromRequest(r),
		ReleaseType: releaseType,
		Title:       strings.TrimSpace(r.FormValue("title")),
		Genre:       nilIfEmpty(r.FormValue("genre")),
		ReleaseDate: releaseDate,
	}

	if f, fh, err := r.FormFile("thumbnail"); err == nil {
		defer f.Close()
		in.ThumbnailFilename = fh.Filename
		in.ThumbnailReader = f
		in.ThumbnailSize = fh.Size
	}

	draft, err := h.createDraft.Execute(r.Context(), in)
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusCreated, toDraftResponse(draft))
}

func (h *DraftHandler) handleGet(w http.ResponseWriter, r *http.Request, draftID string) {
	draft, err := h.getDraft.Execute(r.Context(), draftID, userIDFromRequest(r))
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, toDraftResponse(draft))
}

func (h *DraftHandler) handleAddTrack(w http.ResponseWriter, r *http.Request, draftID string) {
	var body struct {
		Title       string `json:"title"`
		TrackNumber int    `json:"trackNumber"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	track, err := h.addTrack.Execute(r.Context(), usecase.AddTrackInput{
		DraftID:     draftID,
		UploaderID:  userIDFromRequest(r),
		Title:       strings.TrimSpace(body.Title),
		TrackNumber: body.TrackNumber,
	})
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusCreated, toTrackResponse(*track))
}

func (h *DraftHandler) handleDeleteTrack(w http.ResponseWriter, r *http.Request, draftID, trackID string) {
	if err := h.deleteTrack.Execute(r.Context(), draftID, trackID, userIDFromRequest(r)); err != nil {
		handleDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DraftHandler) handleAudioURL(w http.ResponseWriter, r *http.Request, draftID, trackID string) {
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		jsonError(w, http.StatusBadRequest, "filename query parameter required")
		return
	}
	result, err := h.audioURL.Execute(r.Context(), draftID, trackID, userIDFromRequest(r), filename)
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, result)
}

func (h *DraftHandler) handleConfirmAudio(w http.ResponseWriter, r *http.Request, draftID, trackID string) {
	var body struct {
		ObjectKey string `json:"objectKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ObjectKey == "" {
		jsonError(w, http.StatusBadRequest, "objectKey is required")
		return
	}
	draft, err := h.confirmAudio.Execute(r.Context(), draftID, trackID, userIDFromRequest(r), body.ObjectKey)
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, toDraftResponse(draft))
}

func (h *DraftHandler) handleSubmit(w http.ResponseWriter, r *http.Request, draftID string) {
	jobs, err := h.submitDraft.Execute(r.Context(), draftID, userIDFromRequest(r))
	if err != nil {
		handleDomainError(w, err)
		return
	}
	summaries := make([]jobSummaryResponse, len(jobs))
	for i, j := range jobs {
		summaries[i] = toJobSummary(j)
	}
	jsonResponse(w, http.StatusOK, summaries)
}

func (h *DraftHandler) handleCancel(w http.ResponseWriter, r *http.Request, draftID string) {
	if err := h.cancelDraft.Execute(r.Context(), draftID, userIDFromRequest(r)); err != nil {
		handleDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func nilIfEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
