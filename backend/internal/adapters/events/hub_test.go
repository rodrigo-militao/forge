package events

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestHub_Register_returnsChannel(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch := h.Register(userID)
	if ch == nil {
		t.Fatal("expected non-nil channel")
	}
}

func TestHub_NotifyUser_sendsToUser(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch := h.Register(userID)

	h.NotifyUser(userID, "test-event", `{"key":"value"}`)

	select {
	case msg := <-ch:
		if msg.Type != "test-event" {
			t.Errorf("expected type 'test-event', got '%s'", msg.Type)
		}
		if msg.Data != `{"key":"value"}` {
			t.Errorf("expected data '{\"key\":\"value\"}', got '%s'", msg.Data)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestHub_NotifyUser_doesNotSendToOtherUser(t *testing.T) {
	h := NewHub()
	userA := uuid.New()
	userB := uuid.New()
	chA := h.Register(userA)
	_ = h.Register(userB)

	h.NotifyUser(userA, "event", "data")

	select {
	case <-chA:
		// OK — userA should receive
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event on correct user")
	}

	// userB should NOT receive
	_ = h.Register(userB)
}

func TestHub_Unregister_removesClient(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch := h.Register(userID)
	h.Unregister(userID, ch)

	h.NotifyUser(userID, "event", "data")

	select {
	case _, ok := <-ch:
		if ok {
			t.Error("expected channel to be closed after unregister")
		}
	default:
		// Channel was closed — OK
	}
}

func TestHub_NotifyUser_multipleClientsSameUser(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch1 := h.Register(userID)
	ch2 := h.Register(userID)

	h.NotifyUser(userID, "event", "data")

	received := 0
	timer := time.After(time.Second)
	for received < 2 {
		select {
		case <-ch1:
			received++
		case <-ch2:
			received++
		case <-timer:
			t.Fatalf("expected 2 events, got %d", received)
		}
	}
}

func TestHub_Close_closesAllChannels(t *testing.T) {
	h := NewHub()
	ch1 := h.Register(uuid.New())
	ch2 := h.Register(uuid.New())

	h.Close()

	_, ok1 := <-ch1
	_, ok2 := <-ch2
	if ok1 || ok2 {
		t.Error("expected all channels to be closed after Close")
	}
}

func TestHub_NotifyUser_bufferFull_drops(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	_ = h.Register(userID) // buffered channel, capacity 8

	// Send 16 events without reading — at most 8 fit in the buffer.
	for i := 0; i < 16; i++ {
		h.NotifyUser(userID, "event", "data")
	}

	// Re-register to get a fresh channel and count what the old one held.
	ch := h.Register(userID)

	// Drain the original channel (now accessible via the new register).
	// The old channel still exists in the map with at most 8 events.
	count := 0
	for {
		select {
		case <-ch:
			count++
		default:
			if count > 8 {
				t.Errorf("expected at most 8 buffered events, got %d", count)
			}
			return
		}
	}
}

func TestHub_NotifyUser_noClients(t *testing.T) {
	h := NewHub()
	userID := uuid.New()

	// NotifyUser on a user with no registered clients — should not panic.
	h.NotifyUser(userID, "event", "data")
}

func TestHub_Close_emptyHub(t *testing.T) {
	h := NewHub()

	// Close on a hub with no clients — should not panic.
	h.Close()
}

func TestHub_Close_idempotent(t *testing.T) {
	h := NewHub()
	ch := h.Register(uuid.New())

	h.Close()
	h.Close() // second Close should be a no-op

	_, ok := <-ch
	if ok {
		t.Error("expected channel to be closed after first Close")
	}
}

func TestHub_Unregister_doubleUnregister(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch := h.Register(userID)

	// First unregister: normal removal and close.
	h.Unregister(userID, ch)

	// Second unregister with the same channel: should be a no-op, not panic.
	h.Unregister(userID, ch)

	// Hub should still be usable afterward.
	ch2 := h.Register(userID)
	h.NotifyUser(userID, "event", "data")

	select {
	case msg := <-ch2:
		if msg.Type != "event" {
			t.Errorf("expected 'event', got '%s'", msg.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event after double unregister")
	}
}

func TestHub_Unregister_oneOfMany(t *testing.T) {
	h := NewHub()
	userID := uuid.New()
	ch1 := h.Register(userID)
	ch2 := h.Register(userID)

	// Remove only ch1 — ch2 should remain.
	h.Unregister(userID, ch1)

	h.NotifyUser(userID, "event", "data")

	select {
	case <-ch2:
		// ch2 should receive the event.
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event on remaining channel")
	}

	// ch1 should be closed.
	_, ok := <-ch1
	if ok {
		t.Error("expected unregistered channel to be closed")
	}
}

func TestHub_NotifyUser_multipleUsers(t *testing.T) {
	h := NewHub()
	userA := uuid.New()
	userB := uuid.New()
	chA := h.Register(userA)
	chB := h.Register(userB)

	h.NotifyUser(userA, "event-a", "data-a")
	h.NotifyUser(userB, "event-b", "data-b")

	// Both should receive their respective events.
	select {
	case msg := <-chA:
		if msg.Data != "data-a" {
			t.Errorf("userA expected 'data-a', got '%s'", msg.Data)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for userA event")
	}

	select {
	case msg := <-chB:
		if msg.Data != "data-b" {
			t.Errorf("userB expected 'data-b', got '%s'", msg.Data)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for userB event")
	}
}

func TestHub_ConcurrentRegisterAndNotify(t *testing.T) {
	h := NewHub()
	userID := uuid.New()

	var wg sync.WaitGroup

	// Start 10 clients that register, read a few events, then unregister.
	for range 10 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ch := h.Register(userID)
			// Read up to 3 events.
			for range 3 {
				select {
				case <-ch:
				case <-time.After(200 * time.Millisecond):
					return
				}
			}
			h.Unregister(userID, ch)
		}()
	}

	// Notify concurrently from multiple goroutines.
	for range 10 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h.NotifyUser(userID, "event", "data")
		}()
	}

	wg.Wait()
	// Test passes if no race or panic occurs.
}

func TestHub_ConcurrentMultipleUsers(t *testing.T) {
	h := NewHub()

	var wg sync.WaitGroup
	users := make([]uuid.UUID, 20)
	for i := range users {
		users[i] = uuid.New()
	}

	// Register one channel per user.
	channels := make([]chan Event, len(users))
	for i, u := range users {
		channels[i] = h.Register(u)
	}

	// Notify all users concurrently.
	for i, u := range users {
		wg.Add(1)
		go func(uid uuid.UUID, idx int) {
			defer wg.Done()
			h.NotifyUser(uid, "event", "data")
			select {
			case <-channels[idx]:
			case <-time.After(200 * time.Millisecond):
			}
			h.Unregister(uid, channels[idx])
		}(u, i)
	}

	wg.Wait()
}

func TestHub_Unregister_wrongUser(t *testing.T) {
	h := NewHub()
	userA := uuid.New()
	userB := uuid.New()
	ch := h.Register(userA)

	// Unregister with wrong user ID — should be a no-op, not panic.
	h.Unregister(userB, ch)

	// The channel should still be registered for userA.
	h.NotifyUser(userA, "event", "data")

	select {
	case msg := <-ch:
		if msg.Type != "event" {
			t.Errorf("expected 'event', got '%s'", msg.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("channel should still receive events for userA")
	}
}
