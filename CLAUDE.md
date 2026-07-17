# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

UIGen is a Next.js 15 (App Router) app that lets a user chat with Claude to generate React components, with a live in-browser preview. Generated files live entirely in an in-memory virtual file system — nothing is written to disk during generation.

## Commands

```bash
npm run setup       # install deps, generate Prisma client, run migrations — run this first
npm run dev          # start dev server (turbopack) at http://localhost:3000
npm run dev:daemon   # same, but backgrounded with output piped to logs.txt (useful for agents)
npm run build        # production build
npm run lint         # next lint
npm test             # run vitest (watch mode by default)
npm run db:reset      # reset the SQLite dev db (prisma migrate reset --force)
```

Run a single test file or test name with vitest directly:

```bash
npx vitest run src/lib/__tests__/file-system.test.ts
npx vitest run -t "name of test"
```

**Never run `npm audit fix`.** Dependency versions are pinned to a known-working set; `audit fix` can bump packages past compatible versions and break the app. Fix known vulnerabilities by bumping the specific pinned version instead.

No API key is required to develop — if `ANTHROPIC_API_KEY` in `.env` is unset or left as the placeholder, `src/lib/provider.ts` falls back to a `MockLanguageModel` that returns canned tool calls/components instead of calling Claude.

## Architecture

### Virtual file system, not disk

`src/lib/file-system.ts` (`VirtualFileSystem`) is an in-memory tree of `FileNode`s (files/directories) keyed by path in a `Map`. All "file writes" during generation — creating, editing, renaming, deleting — go through this class, never `fs`. It supports text-editor-style operations (`viewFile`, `str_replace`-style `replaceInFile`, `insertInFile`) because it backs the AI tool implementations directly.

Two serialization formats exist: `serialize()`/`deserializeFromNodes()` (full `FileNode` objects, used for the client `FileSystemContext` and for persisting to Prisma) and `getAllFiles()`/`deserialize()` (flat path→content map, used by the JSX transformer).

### Generation request flow

1. Client `ChatContext` (`src/lib/contexts/chat-context.tsx`) uses the Vercel AI SDK's `useChat`, posting to `/api/chat` with the current messages, the serialized virtual file system, and an optional `projectId`.
2. `src/app/api/chat/route.ts` reconstructs a `VirtualFileSystem` from the posted files, prepends the system prompt (`src/lib/prompts/generation.tsx`, cached via `providerOptions.anthropic.cacheControl`), and calls `streamText` with two tools bound to that file system instance:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — `view`/`create`/`str_replace`/`insert` commands (Anthropic text-editor-style tool).
   - `file_manager` (`src/lib/tools/file-manager.ts`) — `rename`/`delete`.
3. Tool calls stream back to the client. `ChatContext`'s `onToolCall` forwards each call into `FileSystemContext.handleToolCall`, which replays the same operation against the **client-side** `VirtualFileSystem` instance so the editor/preview update live. The server-side FS in the route handler is a parallel, disposable copy used only to compute tool results and (on finish) to persist state.
4. On `onFinish`, if a `projectId` was provided and the user has a session, the route serializes the (server-side) file system and full message list back into the `Project` row.

Mock vs. real model selection happens once per request in `getLanguageModel()` (`src/lib/provider.ts`); the mock model scripts a fixed 3-4 step tool-call sequence keyed off how many tool messages have been seen so far, so the two providers aren't behaviorally identical — don't assume mock-provider tests reflect prompting changes.

### In-browser preview

`src/lib/transform/jsx-transformer.ts` never touches a bundler. For each in-memory file it runs Babel standalone (`@babel/standalone`) to strip JSX/TS, wraps the result in a `Blob` and gets a `blob:` URL, then builds a browser-native `<script type="importmap">` mapping every possible import spelling (with/without leading slash, with/without extension, `@/`-aliased) to that blob URL. Missing local imports get a generated placeholder module (empty component) rather than failing the build; missing third-party packages are pointed at `esm.sh`. `createPreviewHTML` assembles the final iframe document (Tailwind via CDN script, an error boundary, and a syntax-error panel if any file failed to transform). `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders this HTML into an iframe on every file-system change.

### State/context layering

- `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) owns the single `VirtualFileSystem` instance for the session and exposes CRUD + `handleToolCall`.
- `ChatProvider` (`src/lib/contexts/chat-context.tsx`) wraps `useFileSystem()` and must be nested inside `FileSystemProvider` (see `main-content.tsx`) — it reads `fileSystem.serialize()` on every chat request and drives `handleToolCall` from tool-call events.
- Anonymous (pre-signup) work is tracked separately in `sessionStorage` via `src/lib/anon-work-tracker.ts`, so a user can generate components before creating an account without losing work; this is distinct from the Prisma-backed persistence used once a `projectId` exists.

### Persistence & auth

- `prisma/schema.prisma` is the source of truth for the database structure — check it directly rather than inferring the schema from query call sites.
- Prisma (SQLite, `prisma/dev.db`) with `User` and `Project` models (`prisma/schema.prisma`). The Prisma client is generated to `src/generated/prisma` (not `node_modules/.prisma`) — re-run `npx prisma generate` after schema changes. `Project.messages` and `Project.data` are stored as JSON strings, not native JSON columns.
- Auth is a hand-rolled JWT session (`jose`) stored in an `httpOnly` cookie (`src/lib/auth.ts`), not a third-party auth library. `src/middleware.ts` enforces auth only on `/api/projects` and `/api/filesystem` — page routes handle their own auth checks server-side (see `src/app/page.tsx` redirecting based on `getUser()`).

## Conventions

- Path alias `@/*` → `src/*` (see `tsconfig.json`); the AI-generated code the model produces is instructed to use the same `@/` alias.
- UI primitives under `src/components/ui` are shadcn/ui (`components.json`: New York style, neutral base, no Tailwind prefix) — extend via the shadcn CLI/pattern rather than hand-rolling new primitives.
- Tests use Vitest + Testing Library with a `jsdom` environment (`vitest.config.mts`), colocated in `__tests__` directories next to the code under test.
