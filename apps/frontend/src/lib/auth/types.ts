/** Shape of the JWT claims issued by the backend. */
export interface JwtPayload {
    sub: string
    first_name: string
    last_name: string
    email: string
    role: 'admin' | 'student'
    exp: number
    iat: number
}

/** Token pair returned by /auth/login and /auth/refresh. */
export interface AuthTokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

/** Error envelope returned by the backend for 4xx/5xx. */
export interface ApiErrorBody {
    error: string
}
