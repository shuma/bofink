@AGENTS.md

# Pluto AI Web App Builder

This is **Pluto** - an AI-powered web app builder.

## Tech Stack
- Next.js 16.2.4 (App Router)
- AI SDK v6 (`ai@6.0.170`) - uses `inputSchema` not `parameters` for tools
- Supabase for auth/database
- Daytona MCP for sandboxes
- Tailwind v4 + shadcn/ui (Base UI, not Radix)
- Zod v4 for schemas

## Models
- `claude-sonnet-4-6` - for questions/planning
- `claude-opus-4-8` - for coding tasks

## Key Files
- `src/lib/mcp/daytona.ts` - Daytona MCP client
- `src/lib/pluto/tools.ts` - Sandbox tools (use `inputSchema`)
- `src/lib/pluto/schemas.ts` - Zod schemas (no min/max on arrays for Anthropic API)
- `src/app/api/plan/` - Planning routes
- `src/app/api/projects/[id]/` - Build/message routes

## Notes
- AI SDK v6: use `inputSchema` instead of `parameters` in tools
- Anthropic API doesn't support `minItems`/`maxItems` in JSON schemas
- shadcn/ui uses Base UI (no `asChild` prop on DropdownMenuTrigger)
