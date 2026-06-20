FROM golang:1.23-alpine AS build

WORKDIR /workspace

COPY go.work go.work

COPY libs/go-common/go.mod libs/go-common/go.sum libs/go-common/
COPY libs/events/go/music-events/go.mod libs/events/go/music-events/
COPY libs/api-clients/go/upload-api-client/go.mod libs/api-clients/go/upload-api-client/
COPY libs/api-clients/go/streaming-api-client/go.mod libs/api-clients/go/streaming-api-client/
COPY services/upload-service/go.mod services/upload-service/go.sum services/upload-service/
COPY services/streaming-service/go.mod services/streaming-service/go.sum services/streaming-service/

RUN cd services/upload-service && go mod download

COPY libs/go-common/ libs/go-common/
COPY libs/events/go/music-events/ libs/events/go/music-events/
COPY libs/api-clients/go/upload-api-client/ libs/api-clients/go/upload-api-client/
COPY libs/api-clients/go/streaming-api-client/ libs/api-clients/go/streaming-api-client/
COPY services/upload-service/ services/upload-service/
COPY services/streaming-service/ services/streaming-service/

RUN cd services/upload-service && CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/upload-service .

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=build /app/upload-service .

EXPOSE 8086

ENTRYPOINT ["./upload-service"]
