import { useMemo } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ReferenceLine,
    XAxis,
    YAxis,
} from 'recharts'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart'
import type { Assignment } from '@/types/schedule'

interface DailyCoverageChartProps {
    assignments: Assignment[]
    description?: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const chartConfig = {
    staff: {
        label: 'Staff on desk',
        color: 'var(--color-primary)',
    },
} satisfies ChartConfig

export function DailyCoverageChart({
    assignments,
    description,
}: DailyCoverageChartProps) {
    const now = new Date()
    const scheduleDay = (now.getDay() + 6) % 7 // Mon=0
    const currentHour = now.getHours()
    const isWeekday = scheduleDay >= 0 && scheduleDay < 5

    const data = useMemo(() => {
        // Count staff per hour for today (or Monday if weekend)
        const day = isWeekday ? scheduleDay : 0
        const todaysAssignments = assignments.filter(
            (a) => a.day_of_week === day,
        )

        const hours: { hour: string; staff: number; rawHour: number }[] = []
        for (let h = 8; h < 18; h++) {
            const count = todaysAssignments.filter((a) => {
                const [sh] = a.start.split(':').map(Number)
                const [eh] = a.end.split(':').map(Number)
                return h >= sh && h < eh
            }).length

            const period = h >= 12 ? 'PM' : 'AM'
            const display = h % 12 || 12
            hours.push({
                hour: `${display}${period}`,
                staff: count,
                rawHour: h,
            })
        }
        return hours
    }, [assignments, scheduleDay, isWeekday])

    const dayLabel = isWeekday ? DAY_LABELS[scheduleDay] : 'Mon'
    const peakHour = data.reduce(
        (max, d) => (d.staff > max.staff ? d : max),
        data[0],
    )

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Desk Coverage</CardTitle>
                        <CardDescription>
                            {description ??
                                `${isWeekday ? 'Today' : dayLabel}'s staffing by hour`}
                        </CardDescription>
                    </div>
                    {peakHour && peakHour.staff > 0 && (
                        <div className="text-right">
                            <p className="text-lg font-bold tabular-nums leading-none">
                                {peakHour.staff}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                peak at {peakHour.hour}
                            </p>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <ChartContainer
                    config={chartConfig}
                    className="min-h-[220px] h-full w-full"
                >
                    <BarChart
                        accessibilityLayer
                        data={data}
                        margin={{ left: -20, right: 0 }}
                        barSize={24}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            allowDecimals={false}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                        />
                        {isWeekday && (
                            <ReferenceLine
                                x={`${currentHour % 12 || 12}${currentHour >= 12 ? 'PM' : 'AM'}`}
                                stroke="var(--color-primary)"
                                strokeDasharray="3 3"
                                strokeOpacity={0.5}
                            />
                        )}
                        <Bar dataKey="staff" radius={[4, 4, 0, 0]}>
                            {data.map((entry) => (
                                <Cell
                                    key={entry.hour}
                                    fill={
                                        entry.staff === 0
                                            ? 'var(--color-destructive)'
                                            : isWeekday &&
                                                entry.rawHour === currentHour
                                              ? 'var(--color-primary)'
                                              : 'var(--color-primary)'
                                    }
                                    fillOpacity={
                                        entry.staff === 0
                                            ? 0.3
                                            : isWeekday &&
                                                entry.rawHour === currentHour
                                              ? 1
                                              : 0.6
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
