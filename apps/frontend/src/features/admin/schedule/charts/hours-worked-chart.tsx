import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
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

const chartConfig = {
    hours: { label: 'Hours' },
} satisfies ChartConfig

export function HoursWorkedChart({
    data,
    description,
}: {
    data: { name: string; hours: number; fill: string }[]
    description?: string
}) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => b.hours - a.hours),
        [data],
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>Hours Assigned</CardTitle>
                <CardDescription>
                    {description ?? 'Current schedule period'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="h-[220px] w-full"
                >
                    <BarChart
                        accessibilityLayer
                        data={sorted}
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
                        <XAxis dataKey="hours" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="hours" radius={4}>
                            <LabelList
                                dataKey="hours"
                                position="right"
                                className="fill-foreground text-xs"
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
