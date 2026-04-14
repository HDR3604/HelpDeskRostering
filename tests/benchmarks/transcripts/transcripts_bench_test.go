package transcripts_test

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func transcriptsURL() string {
	if u := os.Getenv("TRANSCRIPTS_URL"); u != "" {
		return u
	}
	return "http://localhost:8002"
}

// testdataDir returns the absolute path to the testdata directory.
func testdataDir() string {
	_, f, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(f), "testdata")
}

// postPDF sends a multipart file upload to the extract endpoint.
func postPDF(client *http.Client, baseURL string, pdfBytes []byte) (int, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", "transcript.pdf")
	if err != nil {
		return 0, fmt.Errorf("create form file: %w", err)
	}
	if _, err := part.Write(pdfBytes); err != nil {
		return 0, fmt.Errorf("write pdf: %w", err)
	}
	w.Close()

	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/v1/transcripts/extract", &buf)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	return resp.StatusCode, nil
}

// loadTestPDF reads a PDF file from testdata/ or skips the benchmark.
func loadTestPDF(b *testing.B, name string) []byte {
	b.Helper()
	path := filepath.Join(testdataDir(), name)
	data, err := os.ReadFile(path)
	if err != nil {
		b.Skipf("test PDF %q not found at %s (generate with generate_fixtures.go): %v", name, path, err)
	}
	return data
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkTranscriptsHealthCheck(b *testing.B) {
	base := transcriptsURL()
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("transcripts service not reachable at %s: %v", base, err)
	}
	resp.Body.Close()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, err := client.Get(base + "/api/v1/healthy")
		if err != nil {
			b.Fatalf("health check: %v", err)
		}
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}
}

func BenchmarkExtractTranscript_SinglePage(b *testing.B) {
	benchExtractTranscript(b, "single_page.pdf")
}

func BenchmarkExtractTranscript_MultiPage(b *testing.B) {
	benchExtractTranscript(b, "multi_page.pdf")
}

func BenchmarkExtractTranscript_LargePDF(b *testing.B) {
	benchExtractTranscript(b, "large.pdf")
}

func benchExtractTranscript(b *testing.B, filename string) {
	b.Helper()
	base := transcriptsURL()
	client := &http.Client{Timeout: 30 * time.Second}

	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("transcripts service not reachable at %s: %v", base, err)
	}
	resp.Body.Close()

	pdfBytes := loadTestPDF(b, filename)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		code, err := postPDF(client, base, pdfBytes)
		if err != nil {
			b.Fatalf("post: %v", err)
		}
		if code != 200 {
			b.Fatalf("expected 200, got %d", code)
		}
	}
}

// ---------------------------------------------------------------------------
// Concurrent benchmark
// ---------------------------------------------------------------------------

func BenchmarkExtractTranscript_Concurrent(b *testing.B) {
	base := transcriptsURL()
	client := &http.Client{Timeout: 30 * time.Second}

	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("transcripts service not reachable at %s: %v", base, err)
	}
	resp.Body.Close()

	pdfBytes := loadTestPDF(b, "single_page.pdf")

	b.ReportAllocs()
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		localClient := &http.Client{Timeout: 30 * time.Second}
		for pb.Next() {
			code, err := postPDF(localClient, base, pdfBytes)
			if err != nil {
				b.Errorf("post: %v", err)
				return
			}
			if code != 200 {
				b.Errorf("expected 200, got %d", code)
				return
			}
		}
	})
}
