# AGENTS.md

## Project Overview

Excalidraw is an open-source, collaborative virtual whiteboard for sketching hand-drawn-like diagrams. Built with React and TypeScript, it uses a custom Canvas 2D rendering engine and custom state management via `actionManager`.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **UI**: React 19 (functional components, hooks only)
- **Build**: Vite
- **Testing**: Vitest + React Testing Library
- **Package Manager**: Yarn 1.x with workspaces
- **Linting**: ESLint + Prettier

## Project Structure

```text
excalidraw-monorepo/
|- excalidraw-app/        # Vite-based web application
|- packages/
|  |- excalidraw/         # Core library (@excalidraw/excalidraw)
|  |  |- components/      # React UI components
|  |  |- actions/         # State actions (actionManager)
|  |  |- renderer/        # Canvas rendering pipeline
|  |  |- scene/           # Scene management
|  |  '- types.ts         # Core type definitions (AppState)
|  |- math/               # Math utilities (points, angles, vectors)
|  |- element/            # Element types and operations
|  |- common/             # Shared utilities
|  '- utils/              # General utilities
|- examples/              # Usage examples
'- dev-docs/              # Developer documentation
```

## Key Commands

- `yarn` - install dependencies
- `yarn start` - start dev server (excalidraw-app)
- `yarn build` - build the app
- `yarn test:app` - run Vitest tests
- `yarn test:typecheck` - TypeScript type checking
- `yarn test:code` - ESLint
- `yarn test:other` - Prettier check
- `yarn test:all` - run all checks
- `yarn fix` - auto-fix linting and formatting

## Architecture

- **State Management**: custom `actionManager` (NOT Redux/Zustand/MobX). State updates via `actionManager.dispatch()` only. State type: `AppState` in `packages/excalidraw/types.ts`.
- **Rendering**: Canvas 2D rendering via custom engine (NOT React DOM for drawing). Pipeline: Scene -> `renderScene()` -> canvas 2D context.
- **Monorepo**: Yarn workspaces with `@excalidraw/*` package aliases defined in `tsconfig.json`.

## Conventions

- Functional components with hooks only (no class components)
- Named exports only (no default exports)
- Props type: `{ComponentName}Props`
- Colocated tests: `ComponentName.test.tsx`
- TypeScript strict mode - no `any`, no `@ts-ignore`
- SCSS modules or CSS custom properties for styling
- kebab-case for utility files, PascalCase for components

## Skills

Available skills in this project (carried over from Day 3):

- **creating-excalidraw-components** (`.agents/skills/`) - Create React components following Excalidraw patterns and conventions
- **reviewing-excalidraw-changes** (`.agents/skills/`) - Review diffs for correctness, architecture, conventions, tests, and import/bundle hygiene
- **excalidraw-architecture** (`.agents/skills/`) - Architecture deep dive with state management and rendering pipeline references
- **analyzing-bundle-size** (`.agents/skills/`) - Bundle size and forbidden-import checks via scripts

## MCPs

Day 4 MCP workflow for this repo follows the workshop acceptance criteria.

### Where to Look

- `github.com/modelcontextprotocol/servers` (official reference servers)
- `registry.modelcontextprotocol.io` (Anthropic registry)
- Community catalogs: `mcp-get`, `Smithery`, `awesome-mcp-servers`
- Vendor first-party options: GitHub, Notion, Linear, Sentry, Cloudflare, Stripe

### Selection Criteria

- Maintainership: active commits, recent release, ideally 100+ stars
- Scope: expose only what is needed
- Secrets required: API key, OAuth, or local-only
- Transport: `stdio` (local) vs `HTTP/SSE` (remote)
- Trust: first-party vs community vs anonymous

### Selected MCPs for This Project

- `filesystem` (`@modelcontextprotocol/server-filesystem`)
- `context7` (`@upstash/context7-mcp`)
- `git` (`@modelcontextprotocol/server-git`)
- Sensitive servers stay disabled until needed (for example `github`)

### Cursor Configuration Rules

- Project-level config: `.cursor/mcp.json` (created from `.cursor/mcp.json.example`)
- User-level config: `~/.cursor/mcp.json` (global defaults)
- Cursor reloads MCP config on save; validate status in the MCP panel
- Never hard-code secrets; use `${env:VAR}`
- Pin versions (for example `@modelcontextprotocol/server-filesystem@2025.10.20`, not `@latest`)
- Keep filesystem scope minimal (never `/`)
- Use `"disabled": true` for MCPs not currently needed
- Keep per-tool approval enabled unless explicitly required otherwise

### Custom MCP Requirements (excalidraw-scenes)

Required tools and resource:

- `list_scenes(dir)`
- `read_scene(path)`
- `validate_scene(json)`
- `extract_text(path)`
- `excalidraw://docs/architecture`

stdio gotcha: never `console.log` in MCP server process. Use `console.error` for diagnostics.

### Verification and A/B Testing

- Confirm public MCPs are green in the Cursor MCP panel
- Confirm custom server is green and exposes expected tools
- Test with MCP enabled and disabled
- Save comparison in `docs/mcp-testing/excalidraw-scenes.md`

See `docs/mcp/SECURITY.md` for the threat model and hardening checklist.
