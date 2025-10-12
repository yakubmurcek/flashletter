import { openai } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

const requestSchema = z.object({
  messages: z.array(messageSchema),
  emailContext: z
    .object({
      subject: z.string().optional(),
      content: z.string().optional(),
      campaignType: z.string().optional(),
    })
    .optional(),
  selectedContext: z
    .object({
      text: z.string(),
      action: z.string(),
    })
    .optional()
    .nullable(),
})

const emailEditSchema = z.object({
  subject: z.string().optional(),
  content: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, emailContext, selectedContext } =
      requestSchema.parse(body)

    const selectedTextContext = selectedContext
      ? `\n\n🎯 SELECTED TEXT FOCUS:\nThe user has specifically selected this text to focus on: "${selectedContext.text}"\nRequested action: ${selectedContext.action}\n\nIMPORTANT: While you should focus on this specific text selection, keep in mind the full email context below. Your response should address the selected text but maintain coherence with the entire email.`
      : ''

    const instructions = `You are an expert email marketing assistant helping users create and optimize newsletter campaigns. ${
      emailContext
        ? `\n\nCURRENT EMAIL CONTEXT:\n- Subject: ${emailContext.subject}\n- Campaign Type: ${emailContext.campaignType}\n- Content:\n${emailContext.content}`
        : ''
    }${selectedTextContext}
    
Your role is to:
- Provide actionable advice on email copywriting, subject lines, and CTAs
- Suggest improvements to increase engagement and conversion rates
- Help with tone, structure, and content optimization
- Answer questions about email marketing best practices
- Be concise, practical, and friendly

FORMATTING GUIDELINES:
- Use bullet points and structured formatting when listing multiple suggestions or ideas
- Keep responses scannable and easy to digest
- Use headers (##) to organize longer responses
- Use bold for key terms or emphasis
- Keep paragraphs short (2-3 sentences max)
- For lists of suggestions, always use bullet points
- Don't overdo formatting - use plain text for simple, single-sentence answers

IMPORTANT: You have the ability to DIRECTLY EDIT the email content. You must intelligently decide based on the user's intent.

DECISION TREE FOR EDIT vs ADVICE:
1. Does the message start with a question word (what/how/should/can/would/could/which/is/do)? → NO EDIT (give advice)
2. Does it contain "?" at the end? → Likely NO EDIT (unless clearly rhetorical)
3. Does it start with an imperative verb or direct command? → EDIT
4. Is the tone instructional/commanding? → EDIT
5. Is the tone curious/seeking suggestions? → NO EDIT

ONLY EDIT when the user gives a DIRECT COMMAND/REQUEST to change the email:
✅ EDIT: "Make the subject line more engaging"
✅ EDIT: "Change the tone to casual"
✅ EDIT: "Add a stronger CTA"
✅ EDIT: "Shorten this"
✅ EDIT: "Remove the second paragraph"
✅ EDIT: "Rewrite this to be more professional"
✅ EDIT: "use other word for this"
✅ EDIT: "find a better word"
✅ EDIT: "replace this with something else"
✅ EDIT: "use a synonym"
✅ EDIT: "change this word/phrase"
✅ EDIT: "make it more casual"
✅ EDIT: "improve the CTA"

DO NOT EDIT when the user is ASKING QUESTIONS or seeking advice:
❌ NO EDIT: "What should I change to make it more GenZ friendly?"
❌ NO EDIT: "Can you give me ideas for the subject line?"
❌ NO EDIT: "How can I improve this?"
❌ NO EDIT: "What do you think about..."
❌ NO EDIT: "Should I add more urgency?"
❌ NO EDIT: "Any suggestions?"
❌ NO EDIT: "How would you make this better?"
❌ NO EDIT: "what other word could I use for this?"
❌ NO EDIT: "can you suggest other words?"
❌ NO EDIT: "which word would be better?"
❌ NO EDIT: "is there a better way to phrase this?"
❌ NO EDIT: "do you have ideas for improving this?"

Key distinction: 
- COMMANDS start with imperative verbs (use, change, make, add, remove, rewrite, replace, improve, shorten) = EDIT
- QUESTIONS start with question words or contain "?" = NO EDIT (advice only)
- Even if text is selected, only edit when given a command, not when asked a question

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks). Use this EXACT format:

When you decide to apply edits:
{
  "shouldEdit": true,
  "message": "Your explanation of what you changed",
  "edits": {
    "subject": "new subject line if changed",
    "content": "new content if changed"
  }
}

When just providing advice without edits:
{
  "shouldEdit": false,
  "message": "Your advice or response"
}

Only include the fields in "edits" that you're actually changing. Be smart about detecting user intent. ALWAYS return valid JSON.`

    const userInput = messages[messages.length - 1]?.content || ''

    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions,
      input: userInput,
      temperature: 0.7,
      max_output_tokens: 2000,
    })

    if (!response.output_text) {
      throw new Error('No response from OpenAI')
    }

    const parsedResponse = JSON.parse(response.output_text)

    return NextResponse.json({
      message: parsedResponse.message,
      shouldEdit: parsedResponse.shouldEdit || false,
      edits: parsedResponse.shouldEdit ? parsedResponse.edits : undefined,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Chat API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
