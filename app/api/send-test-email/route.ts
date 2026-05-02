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
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { campaignId, emailDay, recipientEmail } = sendTestEmailRequestSchema.parse(body)

    // Pick the target inbox. For real users, ignore the dialog input — sending
    // to their account email keeps a typo in the form from misrouting the test
    // and aligns with how every other "send to me" button in SaaS works.
    // Anonymous users have no auth.users.email yet, so we require the form to
    // supply one (which doubles as the upgrade-flow trigger below).
    const isAnonymous = user.is_anonymous ?? false
    const targetEmail = isAnonymous ? recipientEmail : user.email
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Recipient email required' },
        { status: 400 },
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.RESEND_FROM_ADDRESS
    if (!apiKey || !fromAddress) {
      console.error(
        '[send-test-email] FATAL: RESEND_API_KEY or RESEND_FROM_ADDRESS missing. ' +
          'Cannot send test emails until these are configured.',
      )
      Sentry.captureMessage('send-test-email: Resend env vars missing', { level: 'error' })
      return NextResponse.json(
        { error: 'Email sending not configured' },
        { status: 500 },
      )
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

    // For anon users, kick off the email-link upgrade in parallel with the
    // test send. updateUser({ email }) sends a confirmation magic link to the
    // address — clicking it links the email to the existing user.id, so all
    // their work persists. We don't await success/failure of the link signal
    // separately; the test arriving is the magic moment, the upgrade is the
    // bonus prompt waiting in their inbox.
    let upgradeStarted = false
    if (isAnonymous && recipientEmail) {
      const { error: updateError } = await supabase.auth.updateUser({ email: recipientEmail })
      if (updateError) {
        // Don't fail the request — the test send already succeeded. Log so we
        // notice if the upgrade path is consistently broken.
        console.warn('[send-test-email] updateUser failed:', updateError.message)
        Sentry.captureMessage('send-test-email: anon upgrade updateUser failed', {
          level: 'warning',
          extra: { error: updateError.message },
        })
      } else {
        upgradeStarted = true
      }
    }

    const responseBody = sendTestEmailResponseSchema.parse({
      ok: true,
      sentTo: targetEmail,
      upgradeStarted,
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
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 },
      )
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
