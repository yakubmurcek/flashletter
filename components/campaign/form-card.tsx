'use client'

import { Card } from '@/components/ui/card'
import { AnimatedSection } from '@/components/ui/animations'
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
    <AnimatedSection delay={0} immediate>
      <Card className="p-8 md:p-12 border-border/60 shadow-lg">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground text-lg text-balance leading-relaxed">
            {description}
          </p>
        </div>
        {children}
      </Card>
    </AnimatedSection>
  )
}
