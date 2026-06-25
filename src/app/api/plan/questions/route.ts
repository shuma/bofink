import { generateObject } from 'ai'
import { clarifyingQuestionsResponseSchema } from '@/lib/pluto/schemas'
import { clarifyingQuestionsPrompt } from '@/lib/pluto/prompts'
import { getModelForTask, getModelId } from '@/lib/ai'

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

    const model = getModelForTask('clarification')
    console.log(`[Questions] Using model: ${getModelId('clarification')}`)

    const result = await generateObject({
      model,
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
