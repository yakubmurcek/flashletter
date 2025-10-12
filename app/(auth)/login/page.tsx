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
  title: 'Sign In - Newsletter Generator',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue creating amazing email campaigns
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
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
