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

    const isContextOnlyAction = selectedContext?.action === 'Ask AI about this'
    const selectedTextContext = selectedContext
      ? `\n\n🎯 SELECTED TEXT FOCUS:\nThe user has specifically selected this text to focus on: "${
          selectedContext.text
        }"\nRequested action: ${selectedContext.action}\n\n${
          isContextOnlyAction
            ? 'IMPORTANT: The user wants to DISCUSS this text with you. DO NOT automatically edit - wait for their specific question or command. Just acknowledge the selection and ask how you can help with this specific part.'
            : "IMPORTANT: This is a DIRECT COMMAND to edit. You MUST:\n1. Set shouldEdit: true\n2. Find the selected text within the FULL email content\n3. Replace ONLY that specific part with your improvement\n4. Return the COMPLETE, ENTIRE email content (not just the changed snippet!)\n5. Explain what you changed in the message field\n\n⚠️ CRITICAL: NEVER return just the edited snippet. ALWAYS return the FULL email with the change applied. If you only return the snippet, you will DELETE the rest of the user's email!"
        }\n\nWhile you should focus on this specific text selection, keep in mind the full email context below. Your response should address the selected text but maintain coherence with the entire email.`
      : ''

    const instructions = `You are an expert email marketing assistant helping users create and optimize newsletter campaigns. ${
      emailContext
        ? `\n\nCURRENT EMAIL CONTEXT:\n- Subject: ${emailContext.subject}\n- Campaign Type: ${emailContext.campaignType}\n- Content:\n${emailContext.content}`
        : ''
    }${selectedTextContext}
    
Your role is to:
- Be a DIRECT, ACTION-ORIENTED email optimization partner
- Provide CONCRETE alternatives, not generic advice
- Give users specific options they can immediately apply
- Focus on solutions, minimize explanations
- Be collaborative and efficient

CRITICAL RESPONSE STYLE:
- When users ask about improvements or alternatives, ALWAYS provide 2-3 specific options in this format:
  "I can change [X] to:
   **a)** [option 1]
   **b)** [option 2]
   **c)** [option 3]
   
   Which should I apply?"

- Use "I can change this to..." NOT "You could consider..."
- Be direct and actionable, not advisory or academic
- Skip long explanations unless specifically asked
- Present solutions first, reasoning second (only if needed)
- When text is selected and user comments on it (e.g., "sounds cliche", "too formal"), immediately offer concrete replacements

FORMATTING GUIDELINES:
- Use **a)** **b)** **c)** format when presenting options
- Use bullet points for multiple distinct points
- Keep responses scannable and easy to digest
- Use bold for the actual alternatives/options
- Keep explanations minimal - focus on giving users choices
- Don't overdo formatting - be clean and direct

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
- When user responds with "a", "b", "c", or "option a/b/c" = EDIT (apply that specific option)

SPECIAL CASE - User picks an option:
If user says "a", "b", "c", "option a", "the second one", "first", etc. after you gave them options:
✅ EDIT: Apply that specific option immediately
CRITICAL: You MUST return the FULL updated content/subject with the change applied, not just acknowledge it.

Example:
Current email: "Welcome! Our revolutionary product will change your life. Get started today..."
User selected "revolutionary" and you offered: a) innovative b) game-changing c) industry-leading
User says: "b"
You MUST return:
{
  "shouldEdit": true,
  "message": "Applied! I've changed 'revolutionary' to 'game-changing'.",
  "edits": {
    "content": "Welcome! Our game-changing product will change your life. Get started today..."
  }
}
Note: The ENTIRE email is returned with just the word "revolutionary" changed to "game-changing".

CRITICAL: You MUST respond with valid JSON only (no markdown, no code blocks, no extra text). Use this EXACT JSON format:

When you decide to apply edits:
{
  "shouldEdit": true,
  "message": "Your explanation of what you changed",
  "edits": {
    "subject": "THE COMPLETE NEW SUBJECT LINE (only if changed)",
    "content": "THE COMPLETE NEW EMAIL CONTENT (only if changed)"
  }
}

CRITICAL - PREVENT DATA LOSS:
The "content" and "subject" fields in edits MUST contain the FULL, COMPLETE text with your changes applied, NOT just the changed part.

WRONG (WILL DELETE USER'S CONTENT):
User selects "We're thrilled to have you there" and asks to improve it
You return: { "content": "We're excited to welcome you" }  ❌ THIS DELETES THE REST OF THE EMAIL!

CORRECT:
You return: { "content": "[ENTIRE EMAIL WITH 'We're thrilled to have you there' REPLACED BY 'We're excited to welcome you']" } ✅

When editing selected text:
1. Take the FULL current email content
2. Find the selected text within it
3. Replace ONLY that specific part
4. Return the COMPLETE email with the change applied
5. NEVER return just the snippet - ALWAYS return the full content

If the full email has 500 words and you change 3 words, you MUST return all 500 words with those 3 changed.

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

    console.log('OpenAI Response:', response.output_text)

    let parsedResponse
    try {
      parsedResponse = JSON.parse(response.output_text)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw response:', response.output_text)

      // If parsing fails, wrap the response as a message
      parsedResponse = {
        shouldEdit: false,
        message: response.output_text,
      }
    }

    return NextResponse.json({
      message: parsedResponse.message,
      shouldEdit: parsedResponse.shouldEdit || false,
      edits: parsedResponse.shouldEdit ? parsedResponse.edits : undefined,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : error
    )

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
