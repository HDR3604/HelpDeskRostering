import { z } from 'zod'
import { isValidPhoneNumber } from 'react-phone-number-input'

// ─── Step 1: Transcript Upload ───────────────────────────────────────────────
export const transcriptSchema = z.object({
    transcript: z
        .custom<File>((val) => val instanceof File, {
            message: 'Transcript is required',
        })
        .refine((file) => file?.type === 'application/pdf', {
            message: 'Only PDF files are accepted',
        }),
})

export type TranscriptData = z.infer<typeof transcriptSchema>

// ─── Step 2: Verify Extracted Details (personal + academic) ──────────────────
export const courseSchema = z.object({
    courseCode: z.string().min(1, 'Course code is required'),
    courseName: z.string().min(1, 'Course name is required'),
    grade: z.string().min(1, 'Grade is required'),
})

export const verifySchema = z.object({
    studentId: z
        .string()
        .min(1, 'Student ID is required')
        .regex(/^\d{9}$/, 'Student ID must be exactly 9 digits'),
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name must be 50 characters or less'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must be 100 characters or less'),
    degreeProgramme: z.string().min(1, 'Degree programme is required'),
    currentYear: z.string().min(1, 'Current year is required'),
    overallGpa: z
        .number({ required_error: 'Overall GPA is required', invalid_type_error: 'Overall GPA is required' })
        .min(0.01, 'Overall GPA is required')
        .max(4.3, 'GPA cannot exceed 4.3')
        .refine((v) => !isNaN(v), { message: 'Overall GPA is required' }),
    degreeGpa: z
        .number({ required_error: 'Degree GPA is required', invalid_type_error: 'Degree GPA is required' })
        .min(0.01, 'Degree GPA is required')
        .max(4.3, 'GPA cannot exceed 4.3')
        .refine((v) => !isNaN(v), { message: 'Degree GPA is required' }),
    courses: z
        .array(courseSchema)
        .min(1, 'At least one course is required')
        .superRefine((courses, ctx) => {
            const codes = courses.map((c) => c.courseCode.trim().toUpperCase())
            const seen = new Set<string>()
            codes.forEach((code, i) => {
                if (code && seen.has(code)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Duplicate course code: ${code}`,
                        path: [i, 'courseCode'],
                    })
                }
                seen.add(code)
            })
        }),
})

export type VerifyData = z.infer<typeof verifySchema>

// ─── Step 3: Contact Details ─────────────────────────────────────────────────
export const contactSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Enter a valid email address')
        .refine((val) => val.endsWith('@my.uwi.edu'), {
            message: 'Email must end with @my.uwi.edu',
        }),
    phoneNumber: z
        .string()
        .min(1, 'Phone number is required')
        .refine((val) => isValidPhoneNumber(val), {
            message: 'Enter a valid phone number',
        }),
})

export type ContactData = z.infer<typeof contactSchema>

// ─── Step 4: Availability ────────────────────────────────────────────────────
export const availabilitySchema = z.object({
    availability: z.record(
        z.string(),
        z.array(z.number())
    ).refine(
        (val) => Object.values(val).some((slots) => slots.length > 0),
        { message: 'Select at least one time slot.' }
    ),
})

export type AvailabilityData = z.infer<typeof availabilitySchema>

// ─── Combined type ───────────────────────────────────────────────────────────
export type SignUpFormData = TranscriptData & VerifyData & ContactData & AvailabilityData
