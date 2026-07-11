package events

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ListenContentChanged connects to Postgres, runs LISTEN on content_changed,
// and forwards notifications to the Hub. Runs until ctx is cancelled.
// Intended to be called in a goroutine.
func ListenContentChanged(ctx context.Context, connString string, hub *Hub) error {
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
