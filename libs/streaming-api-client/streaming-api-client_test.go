package streamingapiclient

import (
	"testing"
)

func TestStreamingApiClient(t *testing.T) {
	result := StreamingApiClient("works")
	if result != "StreamingApiClient works" {
		t.Error("Expected StreamingApiClient to append 'works'")
	}
}
