# BEAT Method - iFlow CLI Instructions

## Activating Agents

BEAT agents are installed as commands in `.iflow/commands/beat/`.

### How to Use

1. **Access Commands**: Use iFlow command interface
2. **Navigate**: Browse to `beat/agents/` or `beat/tasks/`
3. **Select**: Choose the agent or task command
4. **Execute**: Run to activate

### Command Structure

```
.iflow/commands/beat/
├── agents/     # Agent commands
└── tasks/      # Task commands
```

### Examples

```
/beat/agents/core-dev - Activate dev agent
/beat/tasks/core-setup - Execute setup task
```

### Notes

- Commands organized by type (agents/tasks)
- Agent activates for session
- Similar to Crush command structure
