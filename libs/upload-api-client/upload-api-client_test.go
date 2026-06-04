package uploadapiclient

import (
	"testing"
)

func TestUploadApiClient(t *testing.T) {
	result := UploadApiClient("works")
	if result != "UploadApiClient works" {
		t.Error("Expected UploadApiClient to append 'works'")
	}
}
