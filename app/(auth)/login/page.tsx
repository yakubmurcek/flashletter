import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { safeRedirectPath, withRedirectTo } from '@/lib/utils/safe-redirect'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to your account',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const redirectTo = safeRedirectPath((await searchParams).redirectTo)
  return (
    <Card className="bg-card border border-border shadow-sm rounded-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-display text-2xl md:text-3xl">
          <h1>Welcome back</h1>
        </CardTitle>
        <CardDescription>Sign in to pick up your campaigns where you left off.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="login" />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={withRedirectTo('/signup', redirectTo)}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
