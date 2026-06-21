FROM golang:1.22-alpine AS builder
WORKDIR /app
ENV GOPROXY=https://goproxy.io,direct
COPY services/upload-service/go.mod services/upload-service/go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.19
WORKDIR /app
RUN apk update && apk add --no-cache ffmpeg
COPY --from=builder /app/main .
EXPOSE 8086
CMD ["./main"]