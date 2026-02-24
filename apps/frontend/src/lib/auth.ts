export function setToken(token: string, rememberMe: boolean = false) {
  if (rememberMe) {
    localStorage.setItem('auth_token', token)
  } else {
    sessionStorage.setItem('auth_token', token)
  }
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

export function clearToken() {
  localStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_token')
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

// Temporary mock users
const MOCK_USERS = [
  { email: 'student@my.uwi.edu', password: 'student1', role: 'student' },
  { email: 'admin@uwi.edu', password: 'admin1', role: 'admin' },
]

export async function loginUser(email: string, password: string, rememberMe: boolean = false) {
  // TODO: replace with real API call once wired up
  const user = MOCK_USERS.find(
    u => u.email === email && u.password === password
  )
  if (!user) throw new Error('Invalid credentials')
  const fakeToken = btoa(JSON.stringify({ email, role: user.role }))
  setToken(fakeToken, rememberMe)
  return { token: fakeToken, role: user.role }
}