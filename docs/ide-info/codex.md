# BEAT Method - Codex Instructions

## Activating Agents

BEAT agents, tasks and workflows are installed as custom prompts in
`$CODEX_HOME/prompts/beat-*.md` files. If `CODEX_HOME` is not set, it
defaults to `$HOME/.codex/`.

### Examples

```
/beat-bmm-agents-dev - Activate development agent
/beat-bmm-agents-architect - Activate architect agent
/beat-bmm-workflows-dev-story - Execute dev-story workflow
```

### Notes

Prompts are autocompleted when you type /
Agent remains active for the conversation
Start a new conversation to switch agents
