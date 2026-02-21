import { Step2Data } from './sign-up-schemas'

/**
 * Simulates a server-side transcript extraction.
 * In production this will call an API; for now it returns mock data after a delay.
 */
export async function simulateTranscriptExtraction(
    _file: File
): Promise<Step2Data> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return {
        degreeProgramme: 'BSc Computer Science (Special)',
        courses: [
            { courseCode: 'COMP1600', grade: 'A' },
            { courseCode: 'COMP1601', grade: 'A+' },
            { courseCode: 'COMP1602', grade: 'B+' },
            { courseCode: 'COMP1603', grade: 'A-' },
            { courseCode: 'COMP2601', grade: 'B' },
            { courseCode: 'COMP2602', grade: 'A' },
            { courseCode: 'COMP2604', grade: 'A-' },
            { courseCode: 'COMP2605', grade: 'B+' },
            { courseCode: 'MATH1115', grade: 'B' },
            { courseCode: 'MATH1140', grade: 'C+' },
        ],
        overallGpa: 3.42,
        degreeGpa: 3.56,
        currentYear: 'Year 3',
    }
}
