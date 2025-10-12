import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <p>{message}</p>
    </div>
  )
}
