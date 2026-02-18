export interface TimeLog {
  id: string
  student_id: number
  entry_at: string
  exit_at: string | null
  created_at: string
  longitude: number
  latitude: number
  distance_meters: number
}
