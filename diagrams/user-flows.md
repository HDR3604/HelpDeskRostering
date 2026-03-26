# User Flow Diagrams

## 1. Student Registration Flow

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Frontend
    participant BE as Backend API
    participant TR as Transcripts Service
    participant EM as Email Service
    participant DB as PostgreSQL

    S->>FE: Navigate to /auth/sign-up

    Note over FE: Step 0 — Upload Transcript
    S->>FE: Upload PDF transcript
    FE->>BE: POST /api/v1/transcripts/extract
    BE->>TR: Forward PDF file
    TR-->>BE: Extracted metadata (student_id, name, GPA, courses, degree)
    BE-->>FE: Transcript metadata

    Note over FE: Step 1 — Verify Details
    S->>FE: Confirm extracted student ID, name, GPA, courses

    Note over FE: Step 2 — Contact Info
    S->>FE: Enter email (@my.uwi.edu) + phone number

    Note over FE: Step 3 — Email Verification
    FE->>BE: POST /api/v1/verification/send-code
    BE->>EM: Send OTP code to email
    EM-->>S: Email with verification code
    S->>FE: Enter OTP code
    FE->>BE: POST /api/v1/verification/verify-code
    BE-->>FE: Code verified

    Note over FE: Step 4 — Availability
    S->>FE: Select available hours (Mon-Fri grid)
    S->>FE: Set min/max weekly hours

    Note over FE: Step 5 — Review
    S->>FE: Review all information

    Note over FE: Step 6 — Submit
    FE->>BE: POST /api/v1/students
    BE->>DB: INSERT student (status: pending)
    DB-->>BE: Student created
    BE-->>FE: 201 Created (StudentResponse)
    FE->>S: Application submitted successfully
```

## 2. Student Onboarding Flow

```mermaid
sequenceDiagram
    actor A as Admin
    actor S as Student
    participant FE as Frontend
    participant BE as Backend API
    participant EM as Email Service
    participant DB as PostgreSQL

    Note over A,DB: Admin Accepts Student
    A->>FE: Click "Accept" on student application
    FE->>BE: PATCH /api/v1/students/{id}/accept
    BE->>DB: SET accepted_at = NOW()
    BE->>DB: INSERT user (impossible password hash)
    BE->>DB: INSERT auth_token (type: onboarding, TTL: 7 days)
    BE->>EM: Send onboarding email
    EM-->>S: Email with link: /auth/onboarding?token=...
    BE-->>FE: 200 OK

    Note over S,DB: Student Completes Onboarding
    S->>FE: Click onboarding link in email
    FE->>BE: POST /api/v1/auth/validate-onboarding-token
    BE->>DB: Validate token (not expired, not used)
    BE-->>FE: Token valid

    Note over FE: Step 1 — Set Password
    S->>FE: Enter password (8+ chars, uppercase, lowercase, digit, special)
    S->>FE: Confirm password

    Note over FE: Step 2 — Banking Details
    S->>FE: Enter bank name, branch, account type, account number

    S->>FE: Submit
    FE->>BE: POST /api/v1/auth/complete-onboarding
    BE->>DB: Validate token again
    BE->>DB: SET password hash on user
    BE->>DB: SET email_verified_at = NOW()
    BE->>DB: INSERT banking_details (encrypted)
    BE->>DB: Mark token as used
    BE-->>FE: { access_token, refresh_token, user }

    FE->>FE: Store tokens, set auth state
    FE->>S: Redirect to Student Dashboard
```

## 3. Admin Student Accept/Reject Flow

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend
    participant BE as Backend API
    participant EM as Email Service
    participant DB as PostgreSQL

    Note over A,DB: View Applications
    A->>FE: Navigate to /applications
    FE->>BE: GET /api/v1/students?status=pending
    BE->>DB: SELECT students WHERE accepted_at IS NULL AND rejected_at IS NULL
    DB-->>BE: List of pending students
    BE-->>FE: StudentResponse[]
    FE->>A: Display pending applications

    Note over A,DB: Review Application
    A->>FE: Click on student application
    FE->>BE: GET /api/v1/students/{id}
    BE->>DB: SELECT student by ID
    BE-->>FE: Full student details
    FE->>A: Display: ID, name, GPA, transcript, availability, contact info

    alt Accept Student
        A->>FE: Click "Accept"
        FE->>BE: PATCH /api/v1/students/{id}/accept
        BE->>DB: SET accepted_at = NOW()
        BE->>DB: CREATE user account (role: student, impossible password)
        BE->>DB: CREATE onboarding token (7-day TTL)
        BE->>EM: Send welcome email with onboarding link
        EM-->>A: (async) Email sent
        BE-->>FE: 200 OK { message: "Onboarding email sent" }
        FE->>A: Show success notification
    else Reject Student
        A->>FE: Click "Reject"
        FE->>BE: PATCH /api/v1/students/{id}/reject
        BE->>DB: SET rejected_at = NOW()

        opt Previously Accepted
            BE->>DB: Invalidate onboarding tokens
            BE->>DB: Deactivate user account
        end

        BE->>EM: Send rejection email
        BE-->>FE: 200 OK
        FE->>A: Show success notification
    end
```

### Student Application Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Student submits application

    Pending --> Accepted: Admin accepts
    Pending --> Rejected: Admin rejects

    Accepted --> Rejected: Admin reverses decision
    Rejected --> Accepted: Admin reverses decision

    Accepted --> Onboarded: Student completes onboarding

    note right of Pending
        accepted_at IS NULL
        rejected_at IS NULL
    end note

    note right of Accepted
        accepted_at NOT NULL
        User account created
        Onboarding token issued
    end note

    note right of Rejected
        rejected_at NOT NULL
        If was accepted: tokens invalidated,
        user deactivated
    end note

    note right of Onboarded
        Password set
        Banking details stored
        Email verified
        Can sign in
    end note
```

## 4. Admin Schedule Generation Flow

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend
    participant BE as Backend API
    participant SCH as Scheduler Service
    participant DB as PostgreSQL

    Note over A,DB: Prerequisites
    A->>FE: Manage shift templates
    FE->>BE: POST /api/v1/shift-templates/ (or /bulk)
    BE->>DB: INSERT shift templates
    BE-->>FE: Templates created

    A->>FE: Configure scheduler
    FE->>BE: POST /api/v1/scheduler-configs/
    BE->>DB: INSERT scheduler config (constraints, parameters)
    BE-->>FE: Config created

    Note over A,DB: Create Schedule
    A->>FE: Click "Create Schedule"
    FE->>BE: POST /api/v1/schedules
    BE->>DB: INSERT schedule (status: draft)
    BE-->>FE: Schedule created

    Note over A,DB: Generate Schedule
    A->>FE: Click "Generate"
    FE->>BE: POST /api/v1/schedules/generate
    BE->>DB: INSERT schedule_generation (status: pending)
    BE->>SCH: Send generation request (students, templates, config)
    BE-->>FE: 202 { generation_id }

    Note over FE,SCH: Async Processing
    SCH->>SCH: Run LP solver (PuLP)

    loop Poll Status
        FE->>BE: GET /api/v1/schedule-generations/{id}/status
        BE->>DB: SELECT generation status
        BE-->>FE: { status: "pending" }
    end

    alt Completed
        SCH-->>BE: Optimized assignments
        BE->>DB: UPDATE generation (status: completed, response_payload)
        BE->>DB: UPDATE schedule (assignments)
        FE->>BE: GET /api/v1/schedule-generations/{id}/status
        BE-->>FE: { status: "completed" }
        FE->>A: Show generated schedule with assignments
    else Failed
        SCH-->>BE: Error response
        BE->>DB: UPDATE generation (status: failed, error_message)
        FE->>BE: GET /api/v1/schedule-generations/{id}/status
        BE-->>FE: { status: "failed", error_message }
        FE->>A: Show error message
    else Infeasible
        SCH-->>BE: No valid solution
        BE->>DB: UPDATE generation (status: infeasible)
        FE->>BE: GET /api/v1/schedule-generations/{id}/status
        BE-->>FE: { status: "infeasible" }
        FE->>A: Show "no valid schedule possible" message
    end

    Note over A,DB: Post-Generation
    A->>FE: Review generated schedule
    A->>FE: Click "Activate"
    FE->>BE: PATCH /api/v1/schedules/{id}/activate
    BE->>DB: SET is_active = true, status = active
    BE-->>FE: Schedule activated

    A->>FE: Click "Notify Students"
    FE->>BE: POST /api/v1/schedules/{id}/notify
    BE-->>FE: Students notified
```

### Schedule Generation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Admin triggers generation

    Pending --> Completed: LP solver finds optimal solution
    Pending --> Failed: Solver error or timeout
    Pending --> Infeasible: No valid solution exists

    state Completed {
        [*] --> AssignmentsStored
        AssignmentsStored --> ScheduleUpdated
    }

    note right of Pending
        Generation record created
        Solver processing
    end note

    note right of Completed
        Assignments saved to schedule
        Ready for admin review
    end note

    note right of Failed
        Error message stored
        Admin can retry with different config
    end note

    note right of Infeasible
        Constraints too restrictive
        Admin should adjust config or templates
    end note
```

### Schedule Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Admin creates schedule

    Draft --> Active: Admin activates
    Active --> Draft: Admin deactivates

    Active --> Archived: Admin archives
    Archived --> Draft: Admin unarchives

    note right of Draft
        Can be edited
        Can trigger generation
    end note

    note right of Active
        Visible to students
        Can notify students
    end note

    note right of Archived
        Read-only historical record
    end note
```

## 5. Student Clock-In/Out Flow

```mermaid
sequenceDiagram
    actor A as Admin
    actor S as Student
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    Note over A,DB: Admin Generates Code
    A->>FE: Open Clock-In Station
    FE->>BE: POST /api/v1/clock-in-codes/
    BE->>DB: INSERT clock_in_code (expires in 5 min)
    BE-->>FE: { code, qr_data }
    FE->>A: Display QR code + alphanumeric code

    Note over S,DB: Student Clocks In
    S->>FE: Open Clock page
    FE->>BE: GET /api/v1/time-logs/me/status
    BE-->>FE: { clocked_in: false, current_shift: {...} }
    S->>FE: Enter clock-in code
    FE->>FE: Capture GPS coordinates
    FE->>BE: POST /api/v1/time-logs/clock-in { code, lat, lng }
    BE->>DB: Validate code (active, not expired)
    BE->>DB: Validate student has shift now
    BE->>DB: Calculate distance from help desk
    BE->>DB: INSERT time_log (entry_at = NOW())
    BE-->>FE: TimeLog created

    Note over S,DB: Student Clocks Out
    S->>FE: Click "Clock Out"
    FE->>BE: POST /api/v1/time-logs/clock-out
    BE->>DB: UPDATE time_log SET exit_at = NOW()
    BE-->>FE: TimeLog updated
    FE->>S: Show duration worked
```

## 6. Student Settings Flow

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Frontend
    participant BE as Backend API
    participant TR as Transcripts Service
    participant DB as PostgreSQL

    Note over S,DB: Profile Tab
    S->>FE: Navigate to /settings
    FE->>BE: GET /api/v1/students/me
    BE->>DB: SELECT student profile
    BE-->>FE: Student data (profile, transcript, availability)
    FE->>S: Display settings (name read-only, phone editable)

    Note over S,DB: Update Phone (auto-save)
    S->>FE: Edit phone number
    FE->>BE: PUT /api/v1/students/me { phone_number }
    BE->>DB: UPDATE student phone
    BE-->>FE: Updated student
    FE->>S: "Saved" indicator

    Note over S,DB: Upload Transcript
    S->>FE: Select PDF file
    FE->>BE: POST /api/v1/transcripts/extract (multipart)
    BE->>TR: Forward PDF
    TR-->>BE: Extracted data (courses, GPA, year, programme, major, identity)
    BE-->>FE: Extraction result
    FE->>BE: PUT /api/v1/students/me { courses, gpa, year, programme, major, identity }
    BE->>DB: Validate transcript identity matches student
    BE->>DB: UPDATE transcript_metadata
    BE-->>FE: Updated student
    FE->>S: "Transcript updated"

    Note over S,DB: Banking Details (partial upsert)
    S->>FE: Navigate to Payment tab
    FE->>BE: GET /api/v1/students/me/banking-details
    BE->>DB: SELECT + decrypt account number
    BE-->>FE: Banking details (account number masked)
    S->>FE: Edit bank name only
    FE->>BE: PUT /api/v1/students/me/banking-details { bank_name }
    BE->>DB: Merge with existing, validate, encrypt, upsert
    BE-->>FE: Updated banking details
```

## 7. Admin Payroll Flow

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL

    Note over A,DB: Generate Payments
    A->>FE: Navigate to Payments
    A->>FE: Click "Generate Payments"
    FE->>BE: POST /api/v1/payroll/generate
    BE->>DB: Calculate hours from unflagged time logs
    BE->>DB: INSERT payment records
    BE-->>FE: Payment records created

    Note over A,DB: Review & Process
    FE->>BE: GET /api/v1/payroll/
    BE-->>FE: List of payments
    A->>FE: Review payments
    A->>FE: Click "Process" or "Bulk Process"
    FE->>BE: POST /api/v1/payroll/bulk-process
    BE->>DB: UPDATE payments SET status = processed
    BE-->>FE: Payments processed

    Note over A,DB: Export
    A->>FE: Click "Export CSV"
    FE->>BE: GET /api/v1/payroll/export
    BE->>DB: SELECT processed payments
    BE-->>FE: CSV file download
```
