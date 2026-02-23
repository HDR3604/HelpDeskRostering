import type { VerifyData } from './sign-up-schemas'

/**
 * Simulates a server-side transcript extraction.
 * In production this will call an API; for now it returns mock data after a delay.
 */
export async function simulateTranscriptExtraction(
    _file: File
): Promise<VerifyData> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return {
        studentId: '816012345',
        firstName: 'John',
        lastName: 'Doe',
        degreeProgramme: 'BSc Computer Science (Special)',
        currentYear: 'Year 3',
        overallGpa: 3.42,
        degreeGpa: 3.56,
        courses: [
            { courseCode: 'COMP1600', courseName: 'Introduction to Computing Concepts', grade: 'A' },
            { courseCode: 'COMP1601', courseName: 'Computer Programming I', grade: 'A+' },
            { courseCode: 'COMP1602', courseName: 'Computer Programming II', grade: 'B+' },
            { courseCode: 'COMP1603', courseName: 'Computer Programming III', grade: 'A-' },
            { courseCode: 'COMP2601', courseName: 'Computer Architecture', grade: 'B' },
            { courseCode: 'COMP2602', courseName: 'Object-Oriented Design', grade: 'A' },
            { courseCode: 'COMP2604', courseName: 'Operating Systems', grade: 'A-' },
            { courseCode: 'COMP2605', courseName: 'Enterprise Database Systems', grade: 'B+' },
            { courseCode: 'COMP2611', courseName: 'Data Structures', grade: 'A' },
            { courseCode: 'COMP3601', courseName: 'Design & Analysis of Algorithms', grade: 'A-' },
            { courseCode: 'COMP3602', courseName: 'Theory of Computing', grade: 'B+' },
            { courseCode: 'COMP3603', courseName: 'Human Computer Interaction', grade: 'A' },
            { courseCode: 'COMP3605', courseName: 'Introduction to Data Analytics', grade: 'B' },
            { courseCode: 'COMP3606', courseName: 'Software Engineering II', grade: 'A-' },
            { courseCode: 'COMP3607', courseName: 'Object-Oriented Programming II', grade: 'A' },
            { courseCode: 'COMP3610', courseName: 'Big Data Analytics', grade: 'B+' },
            { courseCode: 'COMP3613', courseName: 'Software Engineering I', grade: 'A' },
            { courseCode: 'INFO1600', courseName: 'Introduction to Information Technology', grade: 'A-' },
            { courseCode: 'INFO1601', courseName: 'Introduction to WWW Programming', grade: 'A' },
            { courseCode: 'MATH1115', courseName: 'Fundamental Mathematics for General Sciences', grade: 'B' },
            { courseCode: 'MATH1140', courseName: 'Introductory Linear Algebra & Analytic Geometry', grade: 'C+' },
            { courseCode: 'MATH2250', courseName: 'Industrial Statistics', grade: 'B-' },
        ],
    }
}
