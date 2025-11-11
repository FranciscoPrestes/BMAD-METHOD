# BEAT Method - Crush Instructions

## Activating Agents

BEAT agents are installed as commands in `.crush/commands/beat/`.

### How to Use

1. **Open Command Palette**: Use Crush command interface
2. **Navigate**: Browse to `beat/{module}/agents/`
3. **Select Agent**: Choose the agent command
4. **Execute**: Run to activate agent persona

### Command Structure

```
.crush/commands/beat/
├── agents/          # All agents
├── tasks/           # All tasks
├── core/            # Core module
│   ├── agents/
│   └── tasks/
└── {module}/        # Other modules
```

### Notes

- Commands organized by module
- Can browse hierarchically
- Agent activates for session
