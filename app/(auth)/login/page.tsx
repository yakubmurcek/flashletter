import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata = {
  title: 'Sign In - Flashletter',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return (
    <Card className="bg-card border border-border shadow-sm rounded-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-display text-2xl md:text-3xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue creating
          <br />
          amazing email campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="login" />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
