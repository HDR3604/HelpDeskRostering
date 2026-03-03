import { GraduationCap } from 'lucide-react'

export function AuthSidePanel() {
    return (
        <div className="relative hidden w-1/2 shrink-0 p-4 lg:block">
            <div className="relative h-full w-full overflow-hidden rounded-xl">
                {/* Background image */}
                <img
                    src="/images/UwiFrontPage.webp"
                    alt="University campus"
                    className="h-full w-full object-cover"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent dark:from-black/80 dark:via-black/25 dark:to-black/5" />

                {/* Top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-between p-8">
                    {/* Top badge */}
                    <div className="flex items-center gap-2.5 self-start rounded-full bg-white/10 px-3.5 py-2 backdrop-blur-md">
                        <GraduationCap className="size-4 text-white" />
                        <span className="text-xs font-medium tracking-wide text-white/90">
                            HelpDesk Rostering
                        </span>
                    </div>

                    {/* Bottom quote */}
                    <blockquote className="border-l-2 border-primary/50 pl-4">
                        <p className="text-lg/relaxed font-medium text-white">
                            Seamless scheduling for student assistants across
                            the university.
                        </p>
                        <footer className="mt-2 text-sm text-white/50">
                            University of the West Indies
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    )
}
