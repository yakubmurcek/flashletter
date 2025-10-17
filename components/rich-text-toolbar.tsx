import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Heading3,
  Palette,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface RichTextToolbarProps {
  onFormat: (command: string, value?: string) => void
  onHeading: (level: number) => void
  onColor: (color: string) => void
}

const colors = [
  { name: 'Default', value: '#000000' },
  { name: 'Primary', value: '#f97316' },
  { name: 'Accent', value: '#64748b' },
  { name: 'Muted', value: '#78716c' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
]

export function RichTextToolbar({
  onFormat,
  onHeading,
  onColor,
}: RichTextToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border border-border rounded-md bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('bold')}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('italic')}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onHeading(1)}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onHeading(2)}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onHeading(3)}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormat('insertUnorderedList')}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="grid grid-cols-3 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                className="h-8 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                onClick={() => onColor(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
