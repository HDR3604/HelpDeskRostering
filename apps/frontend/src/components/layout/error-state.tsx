import { cn } from "@/lib/utils"

interface ErrorStateProps {
  icon: React.ReactNode
  iconVariant?: "destructive" | "muted"
  title: string
  description: string
  children?: React.ReactNode
}

const iconVariantStyles = {
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
}

export function ErrorState({
  icon,
  iconVariant = "muted",
  title,
  description,
  children,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full [&_svg]:h-6 [&_svg]:w-6",
          iconVariantStyles[iconVariant],
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
