import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

import { sendTestEmailRequestSchema, sendTestEmailResponseSchema } from '@/lib/schemas/api'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import {
  checkRateLimit,
  getRateLimitHeaders,
  sendTestEmailIpRateLimit,
  sendTestEmailRateLimit,
} from '@/lib/utils/rate-limit'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { markdownToHtml } from '@/lib/utils/markdown'

export async function POST(req: NextRequest) {
  // Same flag that shows the button, so the route is dark whenever the button
  // is. Read here (not via FEATURE_FLAGS) so tests can toggle it.
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_SEND !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Guests have no verified address of their own. Letting them type one would
    // let anyone mail our content to any inbox from our domain, and setting it
    // on the guest (updateUser) would turn them into a passwordless account
    // under a possibly mistyped email that they could never sign in to.
    if (user.is_anonymous) {
      return NextResponse.json(
        { error: 'Create a free account to send test emails.' },
        { status: 401 },
      )
    }

    const userRateLimit = await checkRateLimit(sendTestEmailRateLimit, user.id)
    if (!userRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: "You've sent a lot of test emails recently. Try again in an hour.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            userRateLimit.limit,
            userRateLimit.remaining,
            userRateLimit.reset,
          ),
        },
      )
    }

    const ipRateLimit = await checkRateLimit(sendTestEmailIpRateLimit, getClientIp(req))
    if (!ipRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Daily test-send limit reached. Try again tomorrow.',
        },
        { status: 429 },
      )
    }

    const body = await req.json()
    // recipientEmail is still accepted by the schema but never used: a test
    // only ever goes to the signed-in user's own account email.
    const { campaignId, emailDay } = sendTestEmailRequestSchema.parse(body)

    const targetEmail = user.email
    if (!targetEmail) {
      return NextResponse.json({ error: 'Your account has no email address' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.RESEND_FROM_ADDRESS
    if (!apiKey || !fromAddress) {
      console.error(
        '[send-test-email] FATAL: RESEND_API_KEY or RESEND_FROM_ADDRESS missing. ' +
          'Cannot send test emails until these are configured.',
      )
      Sentry.captureMessage('send-test-email: Resend env vars missing', { level: 'error' })
      return NextResponse.json({ error: 'Email sending not configured' }, { status: 500 })
    }

    const campaignService = new CampaignStorageService(supabase)
    const owns = await campaignService.isOwnedBy(campaignId, user.id)
    if (!owns) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const email = await campaignService.getEmail(campaignId, emailDay)
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const resend = new Resend(apiKey)
    const html = wrapEmailHtml(markdownToHtml(email.content))
    const subject = `[Test] ${email.subject}`

    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      html,
      text: email.content,
    })

    if (sendError) {
      console.error('[send-test-email] Resend error:', sendError)
      Sentry.captureMessage('send-test-email: Resend rejected send', {
        level: 'error',
        extra: { sendError, targetEmail, campaignId, emailDay },
      })
      return NextResponse.json(
        { error: 'Failed to send email', message: sendError.message },
        { status: 502 },
      )
    }

    const responseBody = sendTestEmailResponseSchema.parse({
      ok: true,
      sentTo: targetEmail,
      upgradeStarted: false,
    })

    return NextResponse.json(responseBody, {
      headers: getRateLimitHeaders(
        userRateLimit.limit,
        userRateLimit.remaining,
        userRateLimit.reset,
      ),
    })
  } catch (error) {
    console.error('[send-test-email] Unhandled error:', error)
    Sentry.captureException(error, { tags: { api_route: '/api/send-test-email' } })

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}

// Minimal email-safe wrapper. Inline styles only; no <link> / <style> blocks
// (Gmail strips <style> in some clients). 600px container is the long-standing
// safe width.
function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:8px;padding:32px;color:#1a1a1a;line-height:1.6;font-size:16px;">
            <tr>
              <td>
                ${bodyHtml}
                <hr style="border:0;border-top:1px solid #eee;margin:32px 0 16px;" />
                <p style="font-size:12px;color:#999;margin:0;">Sent from Flashletter as a test preview.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
