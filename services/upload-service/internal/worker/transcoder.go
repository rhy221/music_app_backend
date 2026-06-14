package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	musicevents "music-app/music-events/events"
	"music-app/upload-service/internal/domain"
	"music-app/upload-service/internal/port"
)

const serviceName = "upload-service"

var transcodeBitrates = []int{128, 256, 320}

type TranscoderPool struct {
	jobs       chan port.TranscodeWork
	jobRepo    port.JobRepository
	taskRepo   port.TaskRepository
	outbox     port.OutboxRepository
	storage    port.FileStorage
	transactor port.Transactor
	log        zerolog.Logger
	workers    int
	activeJobs sync.Map // jobID → context.CancelFunc
}

func NewTranscoderPool(
	workers int,
	jobRepo port.JobRepository,
	taskRepo port.TaskRepository,
	outbox port.OutboxRepository,
	storage port.FileStorage,
	transactor port.Transactor,
	log zerolog.Logger,
) *TranscoderPool {
	return &TranscoderPool{
		jobs:       make(chan port.TranscodeWork, workers*4),
		jobRepo:    jobRepo,
		taskRepo:   taskRepo,
		outbox:     outbox,
		storage:    storage,
		transactor: transactor,
		log:        log.With().Str("component", "transcoder").Logger(),
		workers:    workers,
	}
}

// CancelJob implements port.Dispatcher — signals the running FFmpeg process to stop.
func (p *TranscoderPool) CancelJob(jobID string) {
	if v, ok := p.activeJobs.Load(jobID); ok {
		v.(context.CancelFunc)()
	}
}

func (p *TranscoderPool) Start(ctx context.Context) {
	for i := 0; i < p.workers; i++ {
		go p.run(ctx)
	}
}

// Submit implements port.Dispatcher.
func (p *TranscoderPool) Submit(work port.TranscodeWork) {
	p.jobs <- work
}

func (p *TranscoderPool) run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case work, ok := <-p.jobs:
			if !ok {
				return
			}
			p.process(ctx, work)
		}
	}
}

func (p *TranscoderPool) process(ctx context.Context, work port.TranscodeWork) {
	log := p.log.With().Str("jobId", work.JobID).Logger()

	// Per-job context — cancelled by CancelJob() to kill the FFmpeg process.
	jobCtx, cancelJob := context.WithCancel(ctx)
	p.activeJobs.Store(work.JobID, cancelJob)
	defer func() {
		p.activeJobs.Delete(work.JobID)
		cancelJob()
	}()

	if err := p.jobRepo.UpdateStatus(ctx, work.JobID, domain.JobStatusTranscoding, nil); err != nil {
		log.Error().Err(err).Msg("update status to TRANSCODING")
		return
	}

	localIn, err := p.storage.DownloadOriginal(ctx, work.StorageKey)
	if err != nil {
		log.Error().Err(err).Msg("download original")
		p.failJob(ctx, work, "failed to download original: "+err.Error())
		return
	}
	defer os.Remove(localIn)

	durationMs, format := ffprobe(localIn)
	if durationMs > 0 {
		if err := p.jobRepo.UpdateMetadata(ctx, work.JobID, durationMs, format); err != nil {
			log.Warn().Err(err).Msg("update metadata")
		}
	}

	taskIDs := make([]string, len(transcodeBitrates))
	for i, br := range transcodeBitrates {
		taskIDs[i] = uuid.New().String()
		if err := p.taskRepo.Insert(ctx, &domain.TranscodeTask{
			ID:            taskIDs[i],
			JobID:         work.JobID,
			TargetBitrate: br,
			Status:        domain.TaskStatusProcessing,
		}); err != nil {
			log.Error().Err(err).Int("bitrate", br).Msg("insert task")
		}
	}

	var assets []musicevents.AudioAsset
	for i, br := range transcodeBitrates {
		taskID := taskIDs[i]
		tmpOut, err := os.CreateTemp("", fmt.Sprintf("transcode-%s-%dk-*.mp3", work.JobID, br))
		if err != nil {
			_ = p.taskRepo.UpdateFailed(ctx, taskID, "create temp: "+err.Error())
			continue
		}
		tmpOut.Close()
		defer os.Remove(tmpOut.Name())

		cmd := exec.CommandContext(jobCtx,
			"ffmpeg", "-y", "-i", localIn,
			"-vn", "-acodec", "libmp3lame",
			"-b:a", fmt.Sprintf("%dk", br),
			"-f", "mp3", tmpOut.Name(),
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			_ = p.taskRepo.UpdateFailed(ctx, taskID, fmt.Sprintf("ffmpeg: %s", string(out)))
			log.Error().Err(err).Int("bitrate", br).Msg("ffmpeg failed")
			continue
		}

		key, sizeBytes, err := p.storage.StoreTranscoded(ctx, work.JobID, br, tmpOut.Name())
		if err != nil {
			_ = p.taskRepo.UpdateFailed(ctx, taskID, "store: "+err.Error())
			log.Error().Err(err).Int("bitrate", br).Msg("store transcoded")
			continue
		}
		_ = p.taskRepo.UpdateCompleted(ctx, taskID, key, sizeBytes)
		assets = append(assets, musicevents.AudioAsset{
			Bitrate:    br,
			Format:     musicevents.AudioFormatMP3,
			StorageURL: key,
			SizeBytes:  sizeBytes,
		})
	}

	// If the job was cancelled while FFmpeg was running, stop here — do not publish event.
	if jobCtx.Err() != nil {
		log.Info().Msg("job cancelled during transcode, skipping event publish")
		return
	}

	if len(assets) == 0 {
		p.failJob(ctx, work, "all transcode bitrates failed")
		return
	}

	var waveformURL *string
	waveformTmp, err := os.CreateTemp("", "waveform-"+work.JobID+"-*.png")
	if err == nil {
		waveformTmp.Close()
		defer os.Remove(waveformTmp.Name())
		waveCmd := exec.CommandContext(jobCtx,
			"ffmpeg", "-y", "-i", localIn,
			"-filter_complex", "showwavespic=s=640x120:colors=0x1DB954",
			"-frames:v", "1", waveformTmp.Name(),
		)
		if _, err := waveCmd.CombinedOutput(); err == nil {
			if key, err := p.storage.StoreWaveform(ctx, work.JobID, waveformTmp.Name()); err == nil {
				waveformURL = &key
				_ = p.jobRepo.UpdateWaveform(ctx, work.JobID, key)
			}
		}
	}

	payload, _ := json.Marshal(musicevents.TranscodeCompletedEvent{
		Header: buildHeader(musicevents.EventTypeTranscodeCompleted, ""),
		Data: musicevents.TranscodeCompletedData{
			UploadJobID:  work.JobID,
			UploaderID:   work.UploaderID,
			Title:        work.Title,
			Genre:        work.Genre,
			AlbumID:      work.AlbumID,
			AlbumTitle:   work.AlbumTitle,
			ReleaseDate:  work.ReleaseDate,
			DurationMs:   durationMs,
			ThumbnailURL: work.ThumbnailURL,
			WaveformURL:  waveformURL,
			Assets:       assets,
		},
	})
	err = p.transactor.RunInTx(ctx, func(ctx context.Context) error {
		if err := p.jobRepo.UpdateStatus(ctx, work.JobID, domain.JobStatusPublishing, nil); err != nil {
			return err
		}
		return p.outbox.Insert(ctx, &domain.OutboxEvent{
			ID:         uuid.New().String(),
			EventType:  musicevents.EventTypeTranscodeCompleted,
			Exchange:   musicevents.Exchanges.Upload,
			RoutingKey: musicevents.RoutingKeys.TranscodeCompleted,
			Payload:    payload,
			CreatedAt:  time.Now().UTC(),
		})
	})
	if err != nil {
		log.Error().Err(err).Msg("persist transcode completed outbox")
	}
}

func (p *TranscoderPool) failJob(ctx context.Context, work port.TranscodeWork, msg string) {
	payload, _ := json.Marshal(musicevents.TranscodeFailedEvent{
		Header: buildHeader(musicevents.EventTypeTranscodeFailed, ""),
		Data: musicevents.TranscodeFailedData{
			UploadJobID:        work.JobID,
			UploaderID:         work.UploaderID,
			ErrorMessage:       msg,
			OriginalStorageURL: work.StorageKey,
		},
	})
	_ = p.transactor.RunInTx(ctx, func(ctx context.Context) error {
		if err := p.jobRepo.UpdateStatus(ctx, work.JobID, domain.JobStatusFailed, &msg); err != nil {
			return err
		}
		return p.outbox.Insert(ctx, &domain.OutboxEvent{
			ID:         uuid.New().String(),
			EventType:  musicevents.EventTypeTranscodeFailed,
			Exchange:   musicevents.Exchanges.Upload,
			RoutingKey: musicevents.RoutingKeys.TranscodeFailed,
			Payload:    payload,
			CreatedAt:  time.Now().UTC(),
		})
	})
}

type ffprobeResult struct {
	Format struct {
		FormatName string `json:"format_name"`
		Duration   string `json:"duration"`
	} `json:"format"`
}

func ffprobe(filePath string) (durationMs int, format string) {
	out, err := exec.Command(
		"ffprobe", "-v", "quiet",
		"-print_format", "json",
		"-show_format", filePath,
	).Output()
	if err != nil {
		return 0, ""
	}
	var result ffprobeResult
	if err := json.Unmarshal(out, &result); err != nil {
		return 0, ""
	}
	if sec, err := strconv.ParseFloat(strings.TrimSpace(result.Format.Duration), 64); err == nil {
		durationMs = int(sec * 1000)
	}
	return durationMs, result.Format.FormatName
}

func buildHeader(eventType, correlationID string) musicevents.EventHeader {
	var corrPtr *string
	if correlationID != "" {
		c := correlationID
		corrPtr = &c
	}
	return musicevents.EventHeader{
		EventID:       uuid.New().String(),
		EventType:     eventType,
		Timestamp:     time.Now().UTC(),
		SourceService: serviceName,
		CorrelationID: corrPtr,
	}
}
