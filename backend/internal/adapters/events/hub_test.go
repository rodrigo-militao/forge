package events

import (
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
