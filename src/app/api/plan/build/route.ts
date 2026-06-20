import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildPlanSchema } from '@/lib/pluto/schemas'
import { buildPlanPrompt } from '@/lib/pluto/prompts'
import type { ClarifyingAnswer } from '@/types/pluto'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt, answers } = (await req.json()) as {
      prompt: string
      answers?: ClarifyingAnswer[]
    }

    if (!prompt || typeof prompt !== 'string') {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Build context from answers if provided
    let answersContext = ''
    if (answers && answers.length > 0) {
      answersContext = `

USER CLARIFICATIONS:
${answers
  .map((a) => {
    const value = Array.isArray(a.value) ? a.value.join(', ') : a.value
    return `- ${a.questionId}: ${value}`
  })
  .join('\n')}`
    }

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: buildPlanSchema,
      prompt: `${buildPlanPrompt}

USER REQUEST:
"${prompt}"${answersContext}

Create a detailed build plan for this application. Make sure each step is specific and actionable.`,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error('Error generating build plan:', error)
    return Response.json(
      { error: 'Failed to generate build plan' },
      { status: 500 }
    )
  }
}
