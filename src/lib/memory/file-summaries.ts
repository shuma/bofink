import { createAdminClient } from '@/lib/supabase/admin'
import type { FileSummaryRecord } from '@/types/pluto'

/**
 * Get a file summary by project and path
 */
export async function getFileSummary(
  projectId: string,
  filePath: string
): Promise<FileSummaryRecord | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('file_summaries')
    .select('*')
    .eq('project_id', projectId)
    .eq('file_path', filePath)
    .single()

  if (error && error.code === 'PGRST116') {
    return null
  }

  if (error) {
    throw new Error(`Failed to get file summary: ${error.message}`)
  }

  return {
    ...data,
    exports: data.exports || [],
    imports: data.imports || [],
  } as FileSummaryRecord
}

/**
 * Create or update a file summary
 */
export async function upsertFileSummary(
  projectId: string,
  filePath: string,
  data: {
    summary?: string | null
    file_type?: string | null
    exports?: string[]
    imports?: string[]
    line_count?: number | null
    content_hash?: string | null
  }
): Promise<FileSummaryRecord> {
  const supabase = createAdminClient()

  const record = {
    project_id: projectId,
    file_path: filePath,
    ...data,
  }

  const { data: result, error } = await supabase
    .from('file_summaries')
    .upsert(record, {
      onConflict: 'project_id,file_path',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert file summary: ${error.message}`)
  }

  return {
    ...result,
    exports: result.exports || [],
    imports: result.imports || [],
  } as FileSummaryRecord
}

/**
 * Get all file summaries for a project
 */
export async function getProjectFileSummaries(
  projectId: string
): Promise<FileSummaryRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('file_summaries')
    .select('*')
    .eq('project_id', projectId)
    .order('file_path')

  if (error) {
    throw new Error(`Failed to get project file summaries: ${error.message}`)
  }

  return (data || []).map((d) => ({
    ...d,
    exports: d.exports || [],
    imports: d.imports || [],
  })) as FileSummaryRecord[]
}

/**
 * Delete a file summary
 */
export async function deleteFileSummary(
  projectId: string,
  filePath: string
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('file_summaries')
    .delete()
    .eq('project_id', projectId)
    .eq('file_path', filePath)

  if (error) {
    throw new Error(`Failed to delete file summary: ${error.message}`)
  }
}

/**
 * Invalidate (delete) file summaries for given paths
 */
export async function invalidateFileSummaries(
  projectId: string,
  filePaths: string[]
): Promise<void> {
  if (filePaths.length === 0) return

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('file_summaries')
    .delete()
    .eq('project_id', projectId)
    .in('file_path', filePaths)

  if (error) {
    throw new Error(`Failed to invalidate file summaries: ${error.message}`)
  }
}

/**
 * Get file summaries matching a pattern
 */
export async function getFileSummariesByPattern(
  projectId: string,
  pattern: string
): Promise<FileSummaryRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('file_summaries')
    .select('*')
    .eq('project_id', projectId)
    .ilike('file_path', pattern)

  if (error) {
    throw new Error(`Failed to get file summaries by pattern: ${error.message}`)
  }

  return (data || []).map((d) => ({
    ...d,
    exports: d.exports || [],
    imports: d.imports || [],
  })) as FileSummaryRecord[]
}

/**
 * Check if a file summary is stale (content hash mismatch)
 */
export async function isFileSummaryStale(
  projectId: string,
  filePath: string,
  currentHash: string
): Promise<boolean> {
  const summary = await getFileSummary(projectId, filePath)
  if (!summary) return true
  return summary.content_hash !== currentHash
}
