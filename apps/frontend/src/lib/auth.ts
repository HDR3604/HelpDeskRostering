const API_URL = 'http://localhost:8080'

export function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function clearToken() {
  localStorage.removeItem('auth_token')
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

//Temporary users
const MOCK_USERS = [
  { studentId: '816000001', password: 'student1', role: 'student' },
  { studentId: '816000002', password: 'admin1',   role: 'admin'   },
]

export async function loginUser(studentId: string, password: string) {
  //to be deleted when we have database
  const user = MOCK_USERS.find(
    u => u.studentId === studentId && u.password === password
  )
  if (!user) throw new Error('Invalid credentials')
  const fakeToken = btoa(JSON.stringify({ studentId, role: user.role }))
  setToken(fakeToken)
  return { token: fakeToken, role: user.role }

  //uncomment when we have database
  // const response = await fetch(`${API_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ student_id: parseInt(studentId), password }),
  // })
  // if (!response.ok) throw new Error('Invalid credentials')
  // const data = await response.json()
  // setToken(data.token)
  // return data
}