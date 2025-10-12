import { Card } from '@/components/ui/card'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface FormCardProps {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

export function FormCard({
  icon: Icon,
  title,
  description,
  children,
}: FormCardProps) {
  return (
    <Card className="p-8 md:p-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground text-balance leading-relaxed">
          {description}
        </p>
      </div>
      {children}
    </Card>
  )
}
