package jobqueue

import (
	"context"
	"log/slog"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// riverLogger adapts zap.Logger to slog.Handler for River's logging interface.
func newRiverLogger(logger *zap.Logger) *slog.Logger {
	return slog.New(&zapSlogHandler{logger: logger.Named("river")})
}

type zapSlogHandler struct {
	logger *zap.Logger
	attrs  []slog.Attr
	group  string
}

func (h *zapSlogHandler) Enabled(_ context.Context, level slog.Level) bool {
	return h.logger.Core().Enabled(slogToZapLevel(level))
}

func (h *zapSlogHandler) Handle(_ context.Context, record slog.Record) error {
	fields := make([]zap.Field, 0, record.NumAttrs()+len(h.attrs))
	for _, attr := range h.attrs {
		fields = append(fields, slogAttrToZapField(attr))
	}
	record.Attrs(func(attr slog.Attr) bool {
		fields = append(fields, slogAttrToZapField(attr))
		return true
	})

	ce := h.logger.Check(slogToZapLevel(record.Level), record.Message)
	if ce != nil {
		ce.Write(fields...)
	}
	return nil
}

func (h *zapSlogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	copy(newAttrs[len(h.attrs):], attrs)
	return &zapSlogHandler{logger: h.logger, attrs: newAttrs, group: h.group}
}

func (h *zapSlogHandler) WithGroup(name string) slog.Handler {
	return &zapSlogHandler{logger: h.logger.Named(name), attrs: h.attrs, group: name}
}

func slogToZapLevel(level slog.Level) zapcore.Level {
	switch {
	case level >= slog.LevelError:
		return zapcore.ErrorLevel
	case level >= slog.LevelWarn:
		return zapcore.WarnLevel
	case level >= slog.LevelInfo:
		return zapcore.InfoLevel
	default:
		return zapcore.DebugLevel
	}
}

func slogAttrToZapField(attr slog.Attr) zap.Field {
	return zap.Any(attr.Key, attr.Value.Any())
}
