import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const unsubscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = unsubscribeSchema.parse(body)

    const supabase = await createClient()

    // Check if email exists in waitlist
    const { data: existingEntry } = await supabase
      .from('waitlist')
      .select('id, email')
      .eq('email', email)
      .single()

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Email not found in our waitlist.' },
        { status: 404 }
      )
    }

    // Delete the waitlist entry (GDPR right to erasure)
    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('email', email)

    if (error) {
      console.error('Unsubscribe error:', error)
      return NextResponse.json(
        { error: 'Failed to unsubscribe. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Successfully unsubscribed from waitlist.',
        email: email,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Unsubscribe API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

