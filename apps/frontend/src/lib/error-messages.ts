import { isAxiosError } from 'axios'

/**
 * Maps backend error strings to user-friendly messages.
 * Keys are exact matches from the API's `{ "error": "..." }` envelope.
 */
const ERROR_MAP: Record<string, string> = {
    // Auth
    'authentication required': 'Please sign in to continue.',
    unauthorized: 'Your session has expired. Please sign in again.',
    'email and password are required': 'Please enter your email and password.',
    'email is required': 'Please enter your email address.',
    'invalid email format': 'Please enter a valid email address.',
    'invalid email: must end with @my.uwi.edu':
        'Your email must end with @my.uwi.edu.',
    'admin email must end with @uwi.edu':
        'Admin emails must end with @uwi.edu.',
    'email already exists':
        'An account with this email already exists. Please sign in instead.',
    'password must be at least 8 characters':
        'Your password must be at least 8 characters.',
    'password does not meet complexity requirements':
        'Your password needs at least one uppercase letter, one lowercase letter, one number, and one special character.',
    'current_password and new_password are required':
        'Please enter your current and new password.',
    'token is required': 'This link is missing a required token.',
    'token and password are required':
        'Please enter a password to complete setup.',
    'token and new_password are required': 'Please enter your new password.',
    'refresh_token is required':
        'Your session has expired. Please sign in again.',

    // Onboarding
    'invalid onboarding token':
        'This onboarding link is not valid. Please check your email for the correct link.',
    'onboarding token has expired':
        'This onboarding link has expired. Please contact an administrator for a new one.',
    'onboarding token has already been used':
        'This onboarding link has already been used. You can sign in with the password you set.',

    // Students
    'student not found': 'This student could not be found.',
    'student application already exists':
        'An application has already been submitted for this student.',
    'student application already accepted':
        'This student has already been accepted.',
    'student application already rejected':
        'This student has already been rejected.',
    'student is already deactivated': 'This student is already deactivated.',
    'student is not deactivated': 'This student is not currently deactivated.',
    'student has been deleted': 'This student account has been removed.',
    'student email must end with @my.uwi.edu':
        'Student emails must end with @my.uwi.edu.',
    'invalid student ID': 'The student ID provided is not valid.',
    'invalid phone number': 'Please enter a valid phone number.',

    // Banking details
    'banking details not found':
        'No banking details on file. Please complete your onboarding.',
    "invalid account type (must be 'chequeing' or 'savings')":
        'Please select either Chequeing or Savings as your account type.',
    'invalid account number (must be 7-16 digits)':
        'Your account number must be between 7 and 16 digits.',
    'invalid bank name (cannot be empty)': 'Please select your bank.',
    'invalid branch name (cannot be empty)': 'Please enter your branch name.',

    // Schedules
    'schedule not found': 'This schedule could not be found.',
    'scheduler config not found':
        'The scheduler configuration could not be found.',
    'schedule generation not found':
        'The schedule generation request could not be found.',
    'shift template not found': 'This shift template could not be found.',
    'no active shift templates configured':
        'No shift templates are set up. Please create shift templates first.',
    'no feasible schedule found':
        'A valid schedule could not be generated with the current constraints. Try adjusting shift templates or student availability.',
    'invalid title provided': 'Please enter a valid title.',
    'invalid schedule request':
        'The schedule request is not valid. Please check all fields.',
    'scheduler service unavailable':
        'The scheduling service is temporarily unavailable. Please try again later.',

    // Users
    'user not found': 'This user could not be found.',
    'new email must be different from current email':
        'The new email must be different from your current email.',
    'new role must be different from current role':
        'The new role must be different from the current role.',
    'not authorized to perform this action':
        'You do not have permission to perform this action.',

    // Verification
    'email and code are required':
        'Please enter your email and verification code.',
    'could not extract data from the uploaded transcript':
        'We could not read the uploaded transcript. Please make sure it is a valid PDF.',
    'transcript processing failed':
        'Transcript processing failed. Please try uploading again.',
    'transcript service is temporarily unavailable':
        'The transcript service is temporarily unavailable. Please try again later.',
    'only PDF files are accepted': 'Please upload a PDF file.',

    // Generic
    'internal server error':
        'Something went wrong on our end. Please try again later.',
    'invalid request body':
        'The request could not be processed. Please check your input.',
    'failed to create user':
        'We could not create the account. Please try again.',
}

/**
 * Resolves a backend error string to a user-friendly message.
 * Returns the mapped message if found, otherwise returns the original.
 */
export function friendlyError(backendMessage: string): string {
    return ERROR_MAP[backendMessage] ?? backendMessage
}

/**
 * Extracts a user-friendly error message from an API error.
 * Works with Axios errors that have `{ error: string }` response bodies.
 */
export function getApiErrorMessage(
    error: unknown,
    fallback = 'Something went wrong. Please try again.',
): string {
    if (isAxiosError(error) && error.response?.data?.error) {
        return friendlyError(error.response.data.error)
    }
    return fallback
}
