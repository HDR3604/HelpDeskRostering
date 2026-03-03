FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies first (better caching)
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

# Copy source code
COPY apps/backend/ .

# Copy migrations from repo root
COPY migrations/ ./migrations/

# Install goose for migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.27.0

# Build binaries with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o seed-admin ./cmd/seed-admin

# Production image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binaries
COPY --from=builder /app/server .
COPY --from=builder /app/seed-admin .
COPY --from=builder /go/bin/goose .

# Copy migrations
COPY --from=builder /app/migrations* ./migrations/

# Copy entrypoint script
COPY apps/backend/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
CMD ["./server"]