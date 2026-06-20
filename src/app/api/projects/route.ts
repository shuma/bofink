import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return Response.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return Response.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, prompt, plan } = body

    if (!name || !prompt) {
      return Response.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      )
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description,
        prompt,
        plan,
        status: 'planning',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return Response.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return Response.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
