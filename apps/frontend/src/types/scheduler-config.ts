export interface SchedulerConfig {
  id: string
  name: string
  course_shortfall_penalty: number
  min_hours_penalty: number
  max_hours_penalty: number
  understaffed_penalty: number
  extra_hours_penalty: number
  max_extra_penalty: number
  baseline_hours_target: number
  solver_time_limit: number | null
  solver_gap: number | null
  log_solver_output: boolean
  is_default: boolean
  created_at: string
  updated_at: string | null
}
