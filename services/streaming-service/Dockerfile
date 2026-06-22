FROM golang:1.23-alpine AS builder

WORKDIR /app
ENV GOPROXY=https://goproxy.io,direct

COPY . .

WORKDIR /app/services/streaming-service

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o /main .

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /main .

EXPOSE 8085

CMD ["./main"]