import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = waitlistSchema.parse(body)

    const supabase = await createClient()

    // Check if email already exists
    const { data: existingEntry } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist!' },
        { status: 400 }
      )
    }

    // Insert new waitlist entry
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        email,
        name: name || null,
        source: 'landing_page',
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Waitlist signup error:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Successfully joined the waitlist!',
        id: data.id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// Optional: Add GET endpoint to check waitlist status (for admin)
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waitlist')
      .select('id, email, name, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Waitlist fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ waitlist: data })
  } catch (error) {
    console.error('Waitlist GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
