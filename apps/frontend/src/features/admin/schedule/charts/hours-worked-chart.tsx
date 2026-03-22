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
    shifts: { label: 'Shifts' },
} satisfies ChartConfig

export function ShiftsPerStudentChart({
    data,
    description,
}: {
    data: { name: string; shifts: number; fill: string }[]
    description?: string
}) {
    const sorted = useMemo(
        () => [...data].sort((a, b) => b.shifts - a.shifts),
        [data],
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>Shifts Per Student</CardTitle>
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
                        <XAxis dataKey="shifts" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="shifts" radius={4}>
                            <LabelList
                                dataKey="shifts"
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
