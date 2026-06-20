import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { clarifyingQuestionsResponseSchema } from '@/lib/pluto/schemas'
import { clarifyingQuestionsPrompt } from '@/lib/pluto/prompts'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: clarifyingQuestionsResponseSchema,
      prompt: `${clarifyingQuestionsPrompt}

USER REQUEST:
"${prompt}"

Analyze this request and determine if clarifying questions are needed. If the request is clear and specific, set needsClarification to false and return an empty questions array.`,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error('Error generating clarifying questions:', error)
    return Response.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
