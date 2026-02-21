import { z } from 'zod'
import { isValidPhoneNumber } from 'react-phone-number-input'

// ─── Step 1: Student Information ────────────────────────────────────────────
export const step1Schema = z.object({
    studentId: z
        .string()
        .min(1, 'Student ID is required')
        .regex(/^\d{9}$/, 'Student ID must be exactly 9 digits'),
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Enter a valid email address')
        .refine((val) => val.endsWith('@my.uwi.edu'), {
            message: 'Email must end with @my.uwi.edu',
        }),
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name must be 50 characters or less'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must be 100 characters or less'),
    phoneNumber: z
        .string()
        .min(1, 'Phone number is required')
        .refine((val) => isValidPhoneNumber(val), {
            message: 'Enter a valid phone number',
        }),
    transcript: z
        .custom<File>((val) => val instanceof File, {
            message: 'Transcript is required',
        })
        .refine((file) => file?.type === 'application/pdf', {
            message: 'Only PDF files are accepted',
        }),
})

export type Step1Data = z.infer<typeof step1Schema>

// ─── Step 2: Transcript / Course Data ───────────────────────────────────────
export const courseSchema = z.object({
    courseCode: z.string().min(1, 'Course code is required'),
    grade: z.string().min(1, 'Grade is required'),
})

export const step2Schema = z.object({
    degreeProgramme: z.string().min(1, 'Degree programme is required'),
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
    currentYear: z.string().min(1, 'Current year is required'),
})

export type Step2Data = z.infer<typeof step2Schema>

// ─── Step 3: Availability ───────────────────────────────────────────────────
export const step3Schema = z.object({
    availability: z.record(
        z.string(),
        z.array(z.number())
    ).refine(
        (val) => Object.values(val).some((slots) => slots.length > 0),
        { message: 'Select at least one time slot.' }
    ),
})

export type Step3Data = z.infer<typeof step3Schema>

// ─── Combined type for all steps ────────────────────────────────────────────
export type SignUpFormData = Step1Data & Step2Data & Step3Data
