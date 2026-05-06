# MCP Security Model (Day 4 Homework)

This document applies the workshop security acceptance criteria for MCP usage in this repository.

## Scope and Trust Baseline

- Project MCP config lives in `.cursor/mcp.json` (local) and is bootstrapped from `.cursor/mcp.json.example`.
- User-level defaults can exist in `~/.cursor/mcp.json`, but project config is the source of truth for homework.
- Secrets are injected only through environment variables (`${env:VAR}`), never hard-coded.
- Versions are pinned (no `@latest`).
- Sensitive servers are disabled until needed (`"disabled": true`).

## Selected Servers

For this workshop, the selected public MCPs are:

- `filesystem`
- `context7`
- `git`

Optional examples to keep disabled by default unless required:

- `github`
- `fetch`
- `memory`

## Selection Criteria (from workshop)

Use these criteria before adding any MCP:

- **Maintainership**: active commits, recent release, healthy adoption
- **Scope**: exposes only capabilities we need
- **Secrets required**: understand key/OAuth/local-only requirements
- **Transport**: choose `stdio` for local tools, `HTTP/SSE` for remote servers
- **Trust**: prefer first-party and known maintainers over anonymous/community unknowns

## Permission Hardening Levers

1. **Scope arguments**
   - Filesystem MCP must be limited to explicit directories (for example `./excalidraw-app`, `./examples`), never `/`.
2. **Secrets via env**
   - Use `${env:GH_PAT}` style variables, never plaintext tokens in config files.
3. **Disable until needed**
   - Mark sensitive/infrequently used MCPs with `"disabled": true`.
4. **Pin versions**
   - Example: `@modelcontextprotocol/server-filesystem@2025.10.20`.
5. **Per-tool approval**
   - Keep Cursor per-tool confirmation enabled unless there is an explicit reason to relax it.

## Per-MCP Threat Notes

### filesystem (`@modelcontextprotocol/server-filesystem`)

- **Data accessed**: local files under configured roots only.
- **Primary risk**: over-broad roots leak or modify unintended files.
- **Mitigations**: strict root scoping, pinned version, approval prompts.

### context7 (`@upstash/context7-mcp`)

- **Data accessed**: library/doc lookup queries.
- **Primary risk**: accidental external query content leakage.
- **Mitigations**: avoid sending secrets, keep prompts minimal and technical.

### git (`@modelcontextprotocol/server-git`)

- **Data accessed**: repository history, diffs, metadata.
- **Primary risk**: accidental destructive actions if permissions are too broad.
- **Mitigations**: tool approval gates, clear operator intent, review before write actions.

### github (optional, disabled by default)

- **Data accessed**: remote repo issues/PRs/files depending on token scope.
- **Primary risk**: PAT over-permission and data exfiltration.
- **Mitigations**: `"disabled": true` by default, minimal PAT scopes, env-injected tokens only.

### excalidraw-scenes (custom MCP)

- **Data accessed**: `.excalidraw` scene files and selected docs resource.
- **Primary risk**: malformed path handling or over-permissive file access.
- **Mitigations**: path validation, strict relative path handling, no secret handling, no `console.log` on stdio channel.

## Threat Checklist

If any answer is "no", stop and fix before enabling/committing:

- Do I trust this server author/package?
- Is the version pinned?
- Are secrets injected via env (not stored in files)?
- Is filesystem scope minimal?
- Have I reviewed exposed tools in the MCP panel?

## Incident Response

If secrets leak or unsafe access is detected:

1. Revoke/rotate the affected token immediately.
2. Remove secrets from config/history and replace with `${env:VAR}`.
3. Disable affected MCP (`"disabled": true`) until reviewed.
4. Audit recent MCP tool usage in the IDE panel logs.
5. Add preventive config changes before re-enabling.
