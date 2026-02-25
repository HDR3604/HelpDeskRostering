import { useQuery } from "@tanstack/react-query"
import { listShiftTemplates } from "@/lib/api/shift-templates"

export const shiftTemplateKeys = {
  all: () => ["shift-templates"] as const,
  list: () => [...shiftTemplateKeys.all(), "list"] as const,
}

export function useShiftTemplates() {
  return useQuery({
    queryKey: shiftTemplateKeys.list(),
    queryFn: listShiftTemplates,
    staleTime: 5 * 60_000,
  })
}
