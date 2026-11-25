// A stand-in for the Claude Messages API, for end-to-end tests only.
// The app reaches it through ANTHROPIC_BASE_URL (playwright.config.ts), so tests never
// spend money, never wait on the real model and never fail because Anthropic is down.
//
// An outage test switches it off for its own requests only (tests run in parallel):
// POST /__outage {"marker": "...", "mode": "500" | "hang" | "up"} makes every request
// whose body contains the marker (e.g. in the landing-page URL) fail that way.
//
// It answers every streamed request with JSON that fits the request's output schema
// (output_config.format.schema). Email requests get exactly the days they ask for
// ("Generate Day 1 only." / "Generate Days 2 through 5."), like the real model would.
import { createServer } from 'node:http'

const PORT = Number(process.env.FAKE_CLAUDE_PORT ?? 4517)

/** A value that satisfies a JSON schema, with readable sample text. */
function sample(schema, key = 'value') {
  if (!schema || typeof schema !== 'object') return null
  const variant = schema.anyOf ?? schema.oneOf
  if (variant) return sample(variant.find((s) => s.type !== 'null') ?? variant[0], key)
  if (schema.enum) return schema.enum[0]
  if ('const' in schema) return schema.const
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type
  switch (type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([k, s]) => [k, sample(s, k)]),
      )
    case 'array':
      return Array.from({ length: Math.max(schema.minItems ?? 0, 3) }, (_, i) =>
        sample(schema.items, `${key} ${i + 1}`),
      )
    case 'integer':
    case 'number':
      return schema.minimum ?? 1
    case 'boolean':
      return true
    default:
      return `Sample ${key}`
  }
}

/** The days an email request asks for, from its user message. */
function requestedDays(messages) {
  const last = messages.at(-1)
  const text =
    typeof last?.content === 'string'
      ? last.content
      : (last?.content ?? []).map((b) => b.text ?? '').join(' ')
  const range = text.match(/Days (\d+) through (\d+)/)
  if (range) return { from: Number(range[1]), to: Number(range[2]) }
  return /Day 1 only/.test(text) ? { from: 1, to: 1 } : null
}

function answer(body) {
  const schema = body.output_config?.format?.schema
  const value = sample(schema)
  const days = requestedDays(body.messages ?? [])
  if (days && Array.isArray(value?.emails)) {
    const template = value.emails[0]
    value.emails = []
    for (let day = days.from; day <= days.to; day++) {
      value.emails.push({
        ...template,
        ...('day' in template ? { day } : {}),
        subject: `Fake day ${day} subject`,
        preview: `Fake day ${day} preview`,
        content: `<p>Fake email for day ${day}.</p>`,
      })
    }
  }
  return JSON.stringify(value)
}

function sse(res, events) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  for (const data of events) res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
}

/** Markers switched off by an outage test, and how each one fails. */
const outages = new Map()

function outageFor(raw) {
  for (const [marker, mode] of outages) if (raw.includes(marker)) return mode
  return null
}

createServer((req, res) => {
  if (req.method === 'GET') return res.end('fake-claude ok')
  let raw = ''
  req.on('data', (chunk) => (raw += chunk))
  req.on('end', () => {
    if (req.url === '/__outage') {
      const { marker, mode } = JSON.parse(raw || '{}')
      if (!marker) return res.writeHead(400).end('marker required')
      if (mode === 'up') outages.delete(marker)
      else outages.set(marker, mode)
      return res.end('ok')
    }
    const outage = outageFor(raw)
    // Like Anthropic when it is down: an API error the SDK retries, then gives up on.
    if (outage === '500') {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(
        JSON.stringify({
          type: 'error',
          error: { type: 'api_error', message: 'Internal server error' },
        }),
      )
    }
    // No answer at all: the app's own timeout has to end the wait.
    if (outage === 'hang') return
    const body = JSON.parse(raw || '{}')
    const text = answer(body)
    const usage = { input_tokens: 1, output_tokens: 1 }
    sse(res, [
      {
        type: 'message_start',
        message: {
          id: 'msg_fake',
          type: 'message',
          role: 'assistant',
          model: body.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage,
        },
      },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage },
      { type: 'message_stop' },
    ])
  })
}).listen(PORT, '127.0.0.1', () => console.log(`fake-claude listening on ${PORT}`))
