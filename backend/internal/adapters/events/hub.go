// Package events provides a per-user SSE event hub backed by Postgres LISTEN/NOTIFY.
package events

import (
	"sync"

	"github.com/google/uuid"
)

// Event is a single SSE event delivered to a client.
type Event struct {
	Type string
	Data string
}

// Hub manages per-user SSE client channels and fan-out.
type Hub struct {
	mu      sync.RWMutex
	clients map[uuid.UUID]map[chan Event]struct{}
}

// NewHub creates an empty Hub.
func NewHub() *Hub {
	return &Hub{
		clients: make(map[uuid.UUID]map[chan Event]struct{}),
	}
}

// Register adds a client channel for the given user and returns it.
func (h *Hub) Register(userID uuid.UUID) chan Event {
	ch := make(chan Event, 8)
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[chan Event]struct{})
	}
	h.clients[userID][ch] = struct{}{}
	return ch
}

// Unregister removes a client channel for the given user and closes it.
func (h *Hub) Unregister(userID uuid.UUID, ch chan Event) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[userID]; ok {
		delete(clients, ch)
		close(ch)
		if len(clients) == 0 {
			delete(h.clients, userID)
		}
	}
}

// NotifyUser sends an event to all connected clients for the given user.
// Returns immediately — slow clients that fill their buffer will drop events.
func (h *Hub) NotifyUser(userID uuid.UUID, eventType, data string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range h.clients[userID] {
		select {
		case ch <- Event{Type: eventType, Data: data}:
		default:
			// Client too slow — drop event
		}
	}
}

// Close removes all clients and closes all channels.
func (h *Hub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, clients := range h.clients {
		for ch := range clients {
			close(ch)
		}
	}
	h.clients = make(map[uuid.UUID]map[chan Event]struct{})
}
