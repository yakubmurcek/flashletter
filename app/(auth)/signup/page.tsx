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
  title: 'Sign Up - Flashletter',
  description: 'Create a new account',
}

export default function SignupPage() {
  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-3xl font-bold">Create an account</CardTitle>
        <CardDescription className="text-base">
          Enter your email and password to get started
          <br />
          with AI-powered email campaigns
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
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
