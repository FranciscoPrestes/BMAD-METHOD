# BEAT Method - Cursor Instructions

## Activating Agents

BEAT agents are installed in `.cursor/rules/beat/` as MDC rules.

### How to Use

1. **Reference in Chat**: Use `@beat/{module}/agents/{agent-name}`
2. **Include Entire Module**: Use `@beat/{module}`
3. **Reference Index**: Use `@beat/index` for all available agents

### Examples

```
@beat/core/agents/dev - Activate dev agent
@beat/bmm/agents/architect - Activate architect agent
@beat/core - Include all core agents/tasks
```

### Notes

- Rules are Manual type - only loaded when explicitly referenced
- No automatic context pollution
- Can combine multiple agents: `@beat/core/agents/dev @beat/core/agents/test`
