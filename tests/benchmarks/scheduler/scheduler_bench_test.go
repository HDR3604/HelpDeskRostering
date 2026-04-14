package scheduler_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"
)

func schedulerURL() string {
	if u := os.Getenv("SCHEDULER_URL"); u != "" {
		return u
	}
	return "http://localhost:8001"
}

// ---------------------------------------------------------------------------
// Fixture types matching the scheduler API
// ---------------------------------------------------------------------------

type availability struct {
	DayOfWeek int    `json:"day_of_week"`
	Start     string `json:"start"`
	End       string `json:"end"`
}

type assistant struct {
	ID           string         `json:"id"`
	Courses      []string       `json:"courses"`
	Availability []availability `json:"availability"`
	MinHours     float64        `json:"min_hours"`
	MaxHours     *float64       `json:"max_hours,omitempty"`
	CostPerHour  float64        `json:"cost_per_hour"`
}

type courseDemand struct {
	CourseCode     string  `json:"course_code"`
	TutorsRequired int     `json:"tutors_required"`
	Weight         float64 `json:"weight"`
}

type shift struct {
	ID            string         `json:"id"`
	DayOfWeek     int            `json:"day_of_week"`
	Start         string         `json:"start"`
	End           string         `json:"end"`
	CourseDemands []courseDemand `json:"course_demands"`
	MinStaff      int            `json:"min_staff"`
	MaxStaff      *int           `json:"max_staff,omitempty"`
}

type scheduleRequest struct {
	Assistants      []assistant      `json:"assistants"`
	Shifts          []shift          `json:"shifts"`
	SchedulerConfig *schedulerConfig `json:"scheduler_config,omitempty"`
}

type schedulerConfig struct {
	BaselineHoursTarget int `json:"baseline_hours_target"`
}

// buildFixture creates a schedule request with n assistants and m shifts.
func buildFixture(numAssistants, numShifts int) scheduleRequest {
	courses := []string{"COMP 1601", "COMP 2603", "COMP 3603", "INFO 2602", "COMP 2605"}
	days := []int{0, 1, 2, 3, 4} // Mon-Fri

	assistants := make([]assistant, numAssistants)
	for i := range assistants {
		day := days[i%len(days)]
		myCourses := []string{courses[i%len(courses)], courses[(i+1)%len(courses)]}
		maxH := float64(12)
		assistants[i] = assistant{
			ID:      fmt.Sprintf("a%d", i),
			Courses: myCourses,
			Availability: []availability{
				{DayOfWeek: day, Start: "08:00:00", End: "16:00:00"},
				{DayOfWeek: (day + 2) % 5, Start: "09:00:00", End: "14:00:00"},
			},
			MinHours:    0,
			MaxHours:    &maxH,
			CostPerHour: 0,
		}
	}

	shifts := make([]shift, numShifts)
	for i := range shifts {
		day := days[i%len(days)]
		maxStaff := 4
		shifts[i] = shift{
			ID:        fmt.Sprintf("s%d", i),
			DayOfWeek: day,
			Start:     "09:00:00",
			End:       "12:00:00",
			CourseDemands: []courseDemand{
				{CourseCode: courses[i%len(courses)], TutorsRequired: 1, Weight: 1.0},
			},
			MinStaff: 1,
			MaxStaff: &maxStaff,
		}
	}

	return scheduleRequest{
		Assistants:      assistants,
		Shifts:          shifts,
		SchedulerConfig: &schedulerConfig{BaselineHoursTarget: 1},
	}
}

// postSchedule sends a generate request and returns the status code.
func postSchedule(client *http.Client, baseURL string, payload []byte) (int, error) {
	resp, err := client.Post(baseURL+"/api/v1/schedules/generate", "application/json", bytes.NewReader(payload))
	if err != nil {
		return 0, err
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	return resp.StatusCode, nil
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkSchedulerHealthCheck(b *testing.B) {
	base := schedulerURL()
	client := &http.Client{Timeout: 5 * time.Second}

	// Verify service is reachable
	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("scheduler not reachable at %s: %v", base, err)
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

func BenchmarkScheduleGenerate_Small(b *testing.B) {
	benchScheduleGenerate(b, 5, 5)
}

func BenchmarkScheduleGenerate_Medium(b *testing.B) {
	benchScheduleGenerate(b, 20, 15)
}

func BenchmarkScheduleGenerate_Large(b *testing.B) {
	benchScheduleGenerate(b, 50, 30)
}

func BenchmarkScheduleGenerate_XLarge(b *testing.B) {
	benchScheduleGenerate(b, 100, 50)
}

func benchScheduleGenerate(b *testing.B, numAssistants, numShifts int) {
	b.Helper()
	base := schedulerURL()
	client := &http.Client{Timeout: 120 * time.Second}

	// Verify reachable
	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("scheduler not reachable at %s: %v", base, err)
	}
	resp.Body.Close()

	fixture := buildFixture(numAssistants, numShifts)
	payload, err := json.Marshal(fixture)
	if err != nil {
		b.Fatalf("marshal: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		code, err := postSchedule(client, base, payload)
		if err != nil {
			b.Fatalf("post: %v", err)
		}
		if code != 201 {
			b.Fatalf("expected 201, got %d", code)
		}
	}
}

// ---------------------------------------------------------------------------
// Concurrent benchmark
// ---------------------------------------------------------------------------

func BenchmarkScheduleGenerate_Concurrent(b *testing.B) {
	base := schedulerURL()
	client := &http.Client{Timeout: 120 * time.Second}

	resp, err := client.Get(base + "/api/v1/healthy")
	if err != nil {
		b.Skipf("scheduler not reachable at %s: %v", base, err)
	}
	resp.Body.Close()

	fixture := buildFixture(10, 10)
	payload, _ := json.Marshal(fixture)

	b.ReportAllocs()
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		localClient := &http.Client{Timeout: 120 * time.Second}
		for pb.Next() {
			code, err := postSchedule(localClient, base, payload)
			if err != nil {
				b.Errorf("post: %v", err)
				return
			}
			if code != 201 {
				b.Errorf("expected 201, got %d", code)
				return
			}
		}
	})
}
