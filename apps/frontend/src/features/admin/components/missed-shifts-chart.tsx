import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface MissedShiftsChartProps {
  data: { name: string; missed: number; total: number; fill: string }[]
}

const chartConfig = {
  attended: {
    label: "Attended",
    color: "var(--color-primary)",
  },
  missed: {
    label: "Missed",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig

export function MissedShiftsChart({ data }: MissedShiftsChartProps) {
  const stacked = useMemo(
    () => data.map(({ fill: _, ...d }) => ({ ...d, attended: d.total - d.missed })),
    [data],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Attendance</CardTitle>
        <CardDescription>Week of Feb 17 – 21</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart
            accessibilityLayer
            data={stacked}
            layout="vertical"
            margin={{ left: 0 }}
            barSize={20}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={110}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="attended"
              stackId="shifts"
              fill="var(--color-attended)"
              shape={(props: unknown) => {
                const p = props as Record<string, unknown> & { payload?: { missed?: number } }
                return <Rectangle {...p} radius={(p.payload?.missed ?? 0) > 0 ? [4, 0, 0, 4] : 4} />
              }}
            />
            <Bar
              dataKey="missed"
              stackId="shifts"
              fill="var(--color-missed)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
