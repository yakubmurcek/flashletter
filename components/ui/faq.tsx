'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FAQItem {
  id: string
  question: string
  answer: string
}

interface FAQProps {
  items: FAQItem[]
  className?: string
}

interface FAQItemProps {
  item: FAQItem
  isOpen: boolean
  onToggle: () => void
}

function FAQItemComponent({ item, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden group">
      <button
        onClick={onToggle}
        className="w-full font-medium cursor-pointer select-none hover:text-primary transition-colors duration-200 flex items-center justify-between text-left p-5 hover:bg-muted/50"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
      >
        <span>{item.question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-300 flex-shrink-0 ml-2',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={`faq-answer-${item.id}`}
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-5 pt-3 pb-5">
          <p className="text-sm text-muted-foreground">{item.answer}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQ({ items, className }: FAQProps) {
  const [openItem, setOpenItem] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item) => (
        <FAQItemComponent
          key={item.id}
          item={item}
          isOpen={openItem === item.id}
          onToggle={() => toggleItem(item.id)}
        />
      ))}
    </div>
  )
}
