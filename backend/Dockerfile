# Multi-stage Docker build for Forge (API + Worker)
# Stage 1: Build
FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /build/api ./cmd/api && \
    CGO_ENABLED=0 GOOS=linux go build -o /build/worker ./cmd/worker

# Stage 2: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /build/api /usr/local/bin/api
COPY --from=builder /build/worker /usr/local/bin/worker
COPY migrations /migrations
EXPOSE 8080
CMD ["api"]
