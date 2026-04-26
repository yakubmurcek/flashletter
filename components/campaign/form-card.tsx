'use client'

import { Card } from '@/components/ui/card'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface FormCardProps {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

export function FormCard({ icon: Icon, title, description, children }: FormCardProps) {
  return (
    <Card className="p-6 md:p-10">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-display text-3xl md:text-4xl mb-4">{title}</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
      </div>
      {children}
    </Card>
  )
}
