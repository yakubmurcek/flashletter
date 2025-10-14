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
  title: 'Sign Up - Newsletter Generator',
  description: 'Create a new account',
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your email and password to get started with AI-powered email
          campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="signup" />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
