## MCP Test: excalidraw-scenes

### Prompt
"List every .excalidraw scene under examples/ and tell me which contain 'flow'."

### Result WITH MCP (enabled)

- Called `list_scenes(dir="examples")`
- Called `extract_text(path=...)` for each returned scene
- Returned 3 scenes total
- Determined that 2 scenes contain the word `flow`
- Tool usage was structured and schema-aware (scene-specific operations, not generic file heuristics)

### Result WITHOUT MCP (`"disabled": true`)

- MCP tools were unavailable
- Agent fell back to generic filesystem/shell-style strategies (listing and grep-like attempts)
- No scene-aware text extraction capability
- Lower confidence and higher risk of filename/content mistakes

### Conclusion

The custom `excalidraw-scenes` MCP materially changes agent behavior:

- With MCP: typed, task-specific tools (`list_scenes`, `extract_text`) produce direct and reliable results.
- Without MCP: agent relies on generic heuristics and cannot use schema-aware scene extraction.

This validates the homework requirement that custom MCPs provide controlled, higher-fidelity access to real project data.
