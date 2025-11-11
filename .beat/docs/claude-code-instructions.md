# BEAT Method - Claude Code Instructions

## Activating Agents

BEAT agents are installed as slash commands in `.claude/commands/beat/`.

### How to Use

1. **Type Slash Command**: Start with `/` to see available commands
2. **Select Agent**: Type `/beat-{agent-name}` (e.g., `/beat-dev`)
3. **Execute**: Press Enter to activate that agent persona

### Examples

```
/beat:bmm:agents:dev - Activate development agent
/beat:bmm:agents:architect - Activate architect agent
/beat:bmm:workflows:dev-story - Execute dev-story workflow
```

### Notes

- Commands are autocompleted when you type `/`
- Agent remains active for the conversation
- Start a new conversation to switch agents
