package httpadapter

import (
	"net/http"
	"strconv"
	"strings"

	"music-app/upload-service/internal/usecase"
)

type JobsHandler struct {
	listJobs   *usecase.ListJobsUseCase
	getJob     *usecase.GetJobUseCase
	retryJob   *usecase.RetryJobUseCase
	cancelJob  *usecase.CancelJobUseCase
}

func NewJobsHandler(
	listJobs *usecase.ListJobsUseCase,
	getJob *usecase.GetJobUseCase,
	retryJob *usecase.RetryJobUseCase,
	cancelJob *usecase.CancelJobUseCase,
) *JobsHandler {
	return &JobsHandler{listJobs: listJobs, getJob: getJob, retryJob: retryJob, cancelJob: cancelJob}
}

// Register mounts job routes on mux under the given prefix (e.g. "/api/v1/upload/jobs").
func (h *JobsHandler) Register(mux *http.ServeMux, prefix string) {
	// GET /jobs  (list)
	mux.HandleFunc(prefix, requireAuth(h.listHandler))
	// GET /jobs/{id}
	// POST /jobs/{id}/retry
	// POST /jobs/{id}/cancel
	mux.HandleFunc(prefix+"/", requireAuth(h.routeByID))
}

func (h *JobsHandler) listHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	size, _ := strconv.Atoi(q.Get("size"))
	if size < 1 || size > 100 {
		size = 20
	}
	var status *string
	if s := q.Get("status"); s != "" {
		status = &s
	}

	result, err := h.listJobs.Execute(r.Context(), usecase.ListJobsInput{
		UploaderID: userIDFromRequest(r),
		Status:     status,
		Page:       page,
		Size:       size,
	})
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, result)
}

func (h *JobsHandler) routeByID(w http.ResponseWriter, r *http.Request) {
	// path: /api/v1/upload/jobs/{id}[/action]
	// Strip the prefix + leading slash
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/v1/upload/jobs/"), "/")
	jobID := parts[0]
	if jobID == "" {
		jsonError(w, http.StatusNotFound, "not found")
		return
	}

	if len(parts) == 1 {
		if r.Method != http.MethodGet {
			jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.getJobHandler(w, r, jobID)
		return
	}

	action := parts[1]
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	switch action {
	case "retry":
		h.retryHandler(w, r, jobID)
	case "cancel":
		h.cancelHandler(w, r, jobID)
	default:
		jsonError(w, http.StatusNotFound, "not found")
	}
}

func (h *JobsHandler) getJobHandler(w http.ResponseWriter, r *http.Request, jobID string) {
	result, err := h.getJob.Execute(r.Context(), jobID, userIDFromRequest(r))
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, result)
}

func (h *JobsHandler) retryHandler(w http.ResponseWriter, r *http.Request, jobID string) {
	job, err := h.retryJob.Execute(r.Context(), jobID, userIDFromRequest(r))
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusAccepted, job)
}

func (h *JobsHandler) cancelHandler(w http.ResponseWriter, r *http.Request, jobID string) {
	job, err := h.cancelJob.Execute(r.Context(), jobID, userIDFromRequest(r))
	if err != nil {
		handleDomainError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, job)
}
