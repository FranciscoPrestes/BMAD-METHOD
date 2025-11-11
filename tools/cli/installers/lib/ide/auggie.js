const path = require('node:path');
const { BaseIdeSetup } = require('./_base-ide');
const chalk = require('chalk');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

/**
 * Auggie CLI setup handler
 * Installs to project directory (.augment/commands)
 */
class AuggieSetup extends BaseIdeSetup {
  constructor() {
    super('auggie', 'Auggie CLI');
    this.detectionPaths = ['.augment'];
  }

  /**
   * Setup Auggie CLI configuration
   * @param {string} projectDir - Project directory
   * @param {string} beatDir - BEAT installation directory
   * @param {Object} options - Setup options
   */
  async setup(projectDir, beatDir, options = {}) {
    console.log(chalk.cyan(`Setting up ${this.name}...`));

    // Always use project directory
    const location = path.join(projectDir, '.augment', 'commands');

    // Clean up old BEAT installation first
    await this.cleanup(projectDir);

    // Generate agent launchers
    const agentGen = new AgentCommandGenerator(this.beatFolderName);
    const { artifacts: agentArtifacts } = await agentGen.collectAgentArtifacts(beatDir, options.selectedModules || []);

    // Get tasks, tools, and workflows (standalone only)
    const tasks = await this.getTasks(beatDir, true);
    const tools = await this.getTools(beatDir, true);
    const workflows = await this.getWorkflows(beatDir, true);

    const beatCommandsDir = path.join(location, 'beat');
    const agentsDir = path.join(beatCommandsDir, 'agents');
    const tasksDir = path.join(beatCommandsDir, 'tasks');
    const toolsDir = path.join(beatCommandsDir, 'tools');
    const workflowsDir = path.join(beatCommandsDir, 'workflows');

    await this.ensureDir(agentsDir);
    await this.ensureDir(tasksDir);
    await this.ensureDir(toolsDir);
    await this.ensureDir(workflowsDir);

    // Install agent launchers
    for (const artifact of agentArtifacts) {
      const targetPath = path.join(agentsDir, `${artifact.module}-${artifact.name}.md`);
      await this.writeFile(targetPath, artifact.content);
    }

    // Install tasks
    for (const task of tasks) {
      const content = await this.readFile(task.path);
      const commandContent = this.createTaskCommand(task, content);

      const targetPath = path.join(tasksDir, `${task.module}-${task.name}.md`);
      await this.writeFile(targetPath, commandContent);
    }

    // Install tools
    for (const tool of tools) {
      const content = await this.readFile(tool.path);
      const commandContent = this.createToolCommand(tool, content);

      const targetPath = path.join(toolsDir, `${tool.module}-${tool.name}.md`);
      await this.writeFile(targetPath, commandContent);
    }

    // Install workflows
    for (const workflow of workflows) {
      const content = await this.readFile(workflow.path);
      const commandContent = this.createWorkflowCommand(workflow, content);

      const targetPath = path.join(workflowsDir, `${workflow.module}-${workflow.name}.md`);
      await this.writeFile(targetPath, commandContent);
    }

    const totalInstalled = agentArtifacts.length + tasks.length + tools.length + workflows.length;

    console.log(chalk.green(`✓ ${this.name} configured:`));
    console.log(chalk.dim(`  - ${agentArtifacts.length} agents installed`));
    console.log(chalk.dim(`  - ${tasks.length} tasks installed`));
    console.log(chalk.dim(`  - ${tools.length} tools installed`));
    console.log(chalk.dim(`  - ${workflows.length} workflows installed`));
    console.log(chalk.dim(`  - Location: ${path.relative(projectDir, location)}`));
    console.log(chalk.yellow(`\n  💡 Tip: Add 'model: gpt-4o' to command frontmatter to specify AI model`));

    return {
      success: true,
      agents: agentArtifacts.length,
      tasks: tasks.length,
      tools: tools.length,
      workflows: workflows.length,
    };
  }

  /**
   * Create task command content
   */
  createTaskCommand(task, content) {
    const nameMatch = content.match(/name="([^"]+)"/);
    const taskName = nameMatch ? nameMatch[1] : this.formatTitle(task.name);

    return `---
description: "Execute the ${taskName} task"
---

# ${taskName} Task

${content}

## Module
BEAT ${task.module.toUpperCase()} module
`;
  }

  /**
   * Create tool command content
   */
  createToolCommand(tool, content) {
    const nameMatch = content.match(/name="([^"]+)"/);
    const toolName = nameMatch ? nameMatch[1] : this.formatTitle(tool.name);

    return `---
description: "Use the ${toolName} tool"
---

# ${toolName} Tool

${content}

## Module
BEAT ${tool.module.toUpperCase()} module
`;
  }

  /**
   * Create workflow command content
   */
  createWorkflowCommand(workflow, content) {
    const description = workflow.description || `Execute the ${workflow.name} workflow`;

    return `---
description: "${description}"
---

# ${workflow.name} Workflow

${content}

## Module
BEAT ${workflow.module.toUpperCase()} module
`;
  }

  /**
   * Cleanup Auggie configuration
   */
  async cleanup(projectDir) {
    const fs = require('fs-extra');

    // Only clean up project directory
    const location = path.join(projectDir, '.augment', 'commands');
    const beatDir = path.join(location, 'beat');

    if (await fs.pathExists(beatDir)) {
      await fs.remove(beatDir);
      console.log(chalk.dim(`  Removed old BEAT commands`));
    }
  }
}

module.exports = { AuggieSetup };
