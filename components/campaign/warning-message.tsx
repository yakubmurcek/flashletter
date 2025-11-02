import { AlertTriangle } from 'lucide-react'

interface WarningMessageProps {
  message: string
}

export function WarningMessage({ message }: WarningMessageProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-lg text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <p>{message}</p>
    </div>
  )
}
