package ports

import "github.com/google/uuid"

// Event is a single notification delivered via the event bus.
type Event struct {
	Type string
	Data string
}

// EventBus provides a subscriber-only interface for receiving events.
// The HTTP handlers only need to Register (subscribe) and Unsubscribe.
type EventBus interface {
	Register(userID uuid.UUID) chan Event
	Unregister(userID uuid.UUID, ch chan Event)
}

// Notifier provides the producer-side of the event bus: broadcasting events
// to all subscribers for a given user and shutting down the bus.
type Notifier interface {
	NotifyUser(userID uuid.UUID, eventType, data string)
	Close()
}
