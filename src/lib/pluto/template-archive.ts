/**
 * Template Archive
 *
 * Creates a tarball of template files that can be uploaded and extracted
 * in a single operation instead of writing files one by one.
 *
 * This speeds up scaffolding by ~50-70%:
 * - Before: 30+ individual file writes (~3-5 seconds)
 * - After: 1 tarball upload + extract (~1-2 seconds)
 */

import { Daytona, Sandbox } from '@daytona/sdk'
import { templateFiles } from './template'
import * as zlib from 'zlib'

// Singleton client
let daytonaClient: Daytona | null = null

function getClient(): Daytona {
  if (!daytonaClient) {
    daytonaClient = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
    })
  }
  return daytonaClient
}

// Cache
interface CachedSandbox {
  sandbox: Sandbox
  cachedAt: number
}

const CACHE_TTL_MS = 30_000
const sandboxCache = new Map<string, CachedSandbox>()

async function getSandbox(sandboxId: string): Promise<Sandbox> {
  const cached = sandboxCache.get(sandboxId)
  const now = Date.now()

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.sandbox
  }

  const client = getClient()
  const sandbox = await client.get(sandboxId)
  sandboxCache.set(sandboxId, { sandbox, cachedAt: now })
  return sandbox
}

// Tar format constants
const TAR_BLOCK_SIZE = 512
const TAR_TYPE_FILE = '0'
const TAR_TYPE_DIR = '5'

/**
 * Create a tar header for a file
 */
function createTarHeader(
  name: string,
  size: number,
  type: string = TAR_TYPE_FILE
): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE, 0)

  // File name (100 bytes)
  header.write(name, 0, Math.min(name.length, 100), 'utf-8')

  // File mode (8 bytes) - 0644 for files, 0755 for directories
  const mode = type === TAR_TYPE_DIR ? '0000755' : '0000644'
  header.write(mode, 100, 7, 'utf-8')

  // Owner UID (8 bytes)
  header.write('0000000', 108, 7, 'utf-8')

  // Owner GID (8 bytes)
  header.write('0000000', 116, 7, 'utf-8')

  // File size (12 bytes, octal)
  header.write(size.toString(8).padStart(11, '0'), 124, 11, 'utf-8')

  // Modification time (12 bytes, octal)
  const mtime = Math.floor(Date.now() / 1000)
  header.write(mtime.toString(8).padStart(11, '0'), 136, 11, 'utf-8')

  // Placeholder for checksum (8 bytes, spaces for calculation)
  header.write('        ', 148, 8, 'utf-8')

  // Type flag (1 byte)
  header.write(type, 156, 1, 'utf-8')

  // Link name (100 bytes) - empty
  // Magic (6 bytes) - 'ustar\0'
  header.write('ustar', 257, 5, 'utf-8')
  header.writeUInt8(0, 262)

  // Version (2 bytes) - '00'
  header.write('00', 263, 2, 'utf-8')

  // Owner name (32 bytes)
  header.write('root', 265, 4, 'utf-8')

  // Group name (32 bytes)
  header.write('root', 297, 4, 'utf-8')

  // Calculate checksum
  let checksum = 0
  for (let i = 0; i < TAR_BLOCK_SIZE; i++) {
    checksum += header[i]
  }
  header.write(checksum.toString(8).padStart(6, '0'), 148, 6, 'utf-8')
  header.writeUInt8(0, 154)
  header.write(' ', 155, 1, 'utf-8')

  return header
}

/**
 * Pad content to tar block boundary
 */
function padToBlock(content: Buffer): Buffer {
  const remainder = content.length % TAR_BLOCK_SIZE
  if (remainder === 0) return content

  const padding = Buffer.alloc(TAR_BLOCK_SIZE - remainder, 0)
  return Buffer.concat([content, padding])
}

/**
 * Get unique directories from file paths
 */
function getDirectories(files: Record<string, string>): string[] {
  const dirs = new Set<string>()

  for (const filePath of Object.keys(files)) {
    const parts = filePath.split('/')
    let current = ''
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i]
      dirs.add(current)
    }
  }

  return Array.from(dirs).sort()
}

/**
 * Create a tarball from template files
 */
export function createTemplateTarball(): Buffer {
  const chunks: Buffer[] = []

  // First, add directory entries
  const directories = getDirectories(templateFiles)
  for (const dir of directories) {
    const header = createTarHeader(dir + '/', 0, TAR_TYPE_DIR)
    chunks.push(header)
  }

  // Then add file entries
  for (const [filePath, content] of Object.entries(templateFiles)) {
    if (!content) continue // Skip empty files like favicon placeholder

    const contentBuffer = Buffer.from(content, 'utf-8')
    const header = createTarHeader(filePath, contentBuffer.length, TAR_TYPE_FILE)

    chunks.push(header)
    chunks.push(padToBlock(contentBuffer))
  }

  // End of archive (two empty blocks)
  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2, 0))

  return Buffer.concat(chunks)
}

/**
 * Create a gzipped tarball
 */
export function createTemplateArchive(): Buffer {
  const tarball = createTemplateTarball()
  return zlib.gzipSync(tarball)
}

// Cached archive
let cachedArchive: Buffer | null = null
let cacheVersion: string | null = null

/**
 * Get or create the template archive
 */
export function getTemplateArchive(version: string = 'v1.0.0'): Buffer {
  if (cachedArchive && cacheVersion === version) {
    return cachedArchive
  }

  cachedArchive = createTemplateArchive()
  cacheVersion = version
  return cachedArchive
}

/**
 * Scaffold template using archive extraction (fast method)
 *
 * @returns Time taken in milliseconds
 */
export async function scaffoldWithArchive(
  sandboxId: string,
  appDir: string
): Promise<{ success: boolean; timeMs: number }> {
  const startTime = Date.now()
  const sandbox = await getSandbox(sandboxId)

  try {
    // Create the app directory
    await sandbox.process.executeCommand(`mkdir -p ${appDir}`, '/')

    // Get the archive
    const archive = getTemplateArchive()

    // Upload the archive
    const archivePath = `${appDir}/.template.tar.gz`
    await sandbox.fs.uploadFile(archive, archivePath)

    // Extract the archive
    const extractResult = await sandbox.process.executeCommand(
      `cd ${appDir} && tar -xzf .template.tar.gz && rm .template.tar.gz`,
      '/'
    )

    if (extractResult.exitCode !== 0) {
      throw new Error(`Failed to extract archive: ${extractResult.result}`)
    }

    const timeMs = Date.now() - startTime
    console.log(`[Template] Scaffolded via archive in ${timeMs}ms`)

    return { success: true, timeMs }
  } catch (error) {
    const timeMs = Date.now() - startTime
    console.error(`[Template] Archive scaffolding failed after ${timeMs}ms:`, error)
    return { success: false, timeMs }
  }
}

/**
 * Scaffold template using individual file writes (fallback method)
 *
 * @returns Time taken in milliseconds
 */
export async function scaffoldWithFileWrites(
  sandboxId: string,
  appDir: string
): Promise<{ success: boolean; timeMs: number }> {
  const startTime = Date.now()
  const sandbox = await getSandbox(sandboxId)

  try {
    // Create the app directory
    await sandbox.process.executeCommand(`mkdir -p ${appDir}`, '/')

    // Write each file individually
    for (const [filePath, content] of Object.entries(templateFiles)) {
      if (!content) continue

      const fullPath = `${appDir}/${filePath}`

      // Ensure parent directory exists
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      await sandbox.process.executeCommand(`mkdir -p ${parentDir}`, '/')

      // Write the file
      await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), fullPath)
    }

    const timeMs = Date.now() - startTime
    console.log(`[Template] Scaffolded via file writes in ${timeMs}ms`)

    return { success: true, timeMs }
  } catch (error) {
    const timeMs = Date.now() - startTime
    console.error(`[Template] File write scaffolding failed after ${timeMs}ms:`, error)
    return { success: false, timeMs }
  }
}

/**
 * Scaffold template with automatic fallback
 *
 * Tries archive method first, falls back to file writes if it fails.
 */
export async function scaffoldTemplate(
  sandboxId: string,
  appDir: string
): Promise<{ success: boolean; timeMs: number; method: 'archive' | 'file-writes' }> {
  // Try archive method first
  const archiveResult = await scaffoldWithArchive(sandboxId, appDir)
  if (archiveResult.success) {
    return { ...archiveResult, method: 'archive' }
  }

  // Fallback to file writes
  console.log('[Template] Falling back to file writes...')
  const fileResult = await scaffoldWithFileWrites(sandboxId, appDir)
  return { ...fileResult, method: 'file-writes' }
}

/**
 * Get template archive info for debugging
 */
export function getArchiveInfo(): {
  fileCount: number
  totalBytes: number
  compressedBytes: number
  compressionRatio: number
} {
  const tarball = createTemplateTarball()
  const compressed = createTemplateArchive()

  const fileCount = Object.values(templateFiles).filter(Boolean).length

  return {
    fileCount,
    totalBytes: tarball.length,
    compressedBytes: compressed.length,
    compressionRatio: tarball.length / compressed.length,
  }
}
