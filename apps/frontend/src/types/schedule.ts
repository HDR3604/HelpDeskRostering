export interface Assignment {
  assistant_id: string
  shift_id: string
  day_of_week: number
  start: string
  end: string
}

export interface ScheduleResponse {
  schedule_id: string
  title: string
  is_active: boolean
  assignments: Assignment[]
  created_at: string
  created_by: string
  updated_at: string | null
  archived_at: string | null
  effective_from: string
  effective_to: string | null
  generation_id: string | null
  config_id: string | null
}
