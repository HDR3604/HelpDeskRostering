import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
    steps: string[]
    currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="w-full mb-10">
            <div className="flex items-center justify-between relative">
                {/* Background connector line */}
                <div className="absolute top-5 left-0 right-0 h-[3px] bg-muted z-0" />
                {/* Active connector line */}
                <div
                    className="absolute top-5 left-0 h-[3px] bg-primary z-[1] transition-all duration-500 ease-in-out"
                    style={{
                        width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                    }}
                />

                {steps.map((label, index) => {
                    const stepNumber = index + 1
                    const isCompleted = stepNumber < currentStep
                    const isCurrent = stepNumber === currentStep

                    return (
                        <div
                            key={label}
                            className="flex flex-col items-center relative z-10"
                        >
                            {/* Circle */}
                            <div
                                className={cn(
                                    'flex items-center justify-center w-10 h-10 rounded-full border-[3px] transition-all duration-300',
                                    isCompleted &&
                                    'bg-primary border-primary text-primary-foreground',
                                    isCurrent &&
                                    'bg-background border-primary text-primary shadow-md shadow-primary/20',
                                    !isCompleted &&
                                    !isCurrent &&
                                    'bg-background border-muted text-muted-foreground'
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="size-5 stroke-[3px]" />
                                ) : (
                                    <span className="text-sm font-bold">{stepNumber}</span>
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    'mt-2.5 text-xs font-medium text-center max-w-[90px] leading-tight hidden sm:block',
                                    isCurrent && 'text-primary font-semibold',
                                    isCompleted && 'text-foreground',
                                    !isCompleted && !isCurrent && 'text-muted-foreground'
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
