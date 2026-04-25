import { cn } from '@/lib/utils'

interface Step {
  number: number
  label: string
}

interface ProgressIndicatorProps {
  currentStep: number
  steps: readonly Step[]
}

export function ProgressIndicator({ currentStep, steps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                currentStep === step.number
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.number
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {step.number}
            </div>
            <span
              className={cn(
                'text-sm transition-colors',
                currentStep === step.number ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-12 h-px transition-colors',
                currentStep > step.number ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
