package events

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ListenContentChanged connects to Postgres, runs LISTEN on content_changed,
// and forwards notifications to the Hub. Reconnects automatically on connection
// errors. Runs until ctx is cancelled. Intended to be called in a goroutine.
func ListenContentChanged(ctx context.Context, connString string, hub *Hub) error {
	for {
		if err := listenOnce(ctx, connString, hub); err != nil {
			if ctx.Err() != nil {
				return err
			}
			slog.Warn("events: listener disconnected, reconnecting in 2s", "error", err)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(2 * time.Second):
			}
		}
	}
}

func listenOnce(ctx context.Context, connString string, hub *Hub) error {
	conn, err := pgx.Connect(ctx, connString)
	if err != nil {
		return fmt.Errorf("events: connect for LISTEN: %w", err)
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, "LISTEN content_changed"); err != nil {
		return fmt.Errorf("events: LISTEN: %w", err)
	}

	slog.Info("events: listening on content_changed")

	for {
		notification, err := conn.WaitForNotification(ctx)
		if err != nil {
			return fmt.Errorf("events: WaitForNotification: %w", err)
		}

		userID, err := uuid.Parse(notification.Payload)
		if err != nil {
			slog.Warn("events: invalid user_id in notification", "payload", notification.Payload)
			continue
		}

		hub.NotifyUser(userID, "content_changed", notification.Payload)
	}
}
