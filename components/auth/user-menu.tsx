'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, FolderOpen, CreditCard } from 'lucide-react'

interface UserMenuProps {
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()
  const rawName = user.user_metadata?.full_name || user.user_metadata?.name || ''
  const firstName =
    rawName.trim().split(/\s+/)[0] || (user.email ? user.email.split('@')[0] : 'Account')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
        >
          <User className="h-5 w-5" />
          <span className="max-w-[160px] truncate text-sm">{firstName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{firstName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/campaigns')}>
          <FolderOpen className="mr-2 h-4 w-4" />
          My Campaigns
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/account')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Account & billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
