const path = require('node:path');
const { BaseIdeSetup } = require('./_base-ide');
const chalk = require('chalk');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

/**
 * Trae IDE setup handler
 */
class TraeSetup extends BaseIdeSetup {
  constructor() {
    super('trae', 'Trae');
    this.configDir = '.trae';
    this.rulesDir = 'rules';
  }

  /**
   * Setup Trae IDE configuration
   * @param {string} projectDir - Project directory
   * @param {string} beatDir - BEAT installation directory
   * @param {Object} options - Setup options
   */
  async setup(projectDir, beatDir, options = {}) {
    console.log(chalk.cyan(`Setting up ${this.name}...`));

    // Create .trae/rules directory
    const traeDir = path.join(projectDir, this.configDir);
    const rulesDir = path.join(traeDir, this.rulesDir);

    await this.ensureDir(rulesDir);

    // Clean up any existing BEAT files before reinstalling
    await this.cleanup(projectDir);

    // Generate agent launchers
    const agentGen = new AgentCommandGenerator(this.beatFolderName);
    const { artifacts: agentArtifacts } = await agentGen.collectAgentArtifacts(beatDir, options.selectedModules || []);

    // Get tasks, tools, and workflows (standalone only)
    const tasks = await this.getTasks(beatDir, true);
    const tools = await this.getTools(beatDir, true);
    const workflows = await this.getWorkflows(beatDir, true);

    // Process agents as rules with beat- prefix
    let agentCount = 0;
    for (const artifact of agentArtifacts) {
      const processedContent = await this.createAgentRule(artifact, beatDir, projectDir);

      // Use beat- prefix: beat-agent-{module}-{name}.md
      const targetPath = path.join(rulesDir, `beat-agent-${artifact.module}-${artifact.name}.md`);
      await this.writeFile(targetPath, processedContent);
      agentCount++;
    }

    // Process tasks as rules with beat- prefix
    let taskCount = 0;
    for (const task of tasks) {
      const content = await this.readFile(task.path);
      const processedContent = this.createTaskRule(task, content);

      // Use beat- prefix: beat-task-{module}-{name}.md
      const targetPath = path.join(rulesDir, `beat-task-${task.module}-${task.name}.md`);
      await this.writeFile(targetPath, processedContent);
      taskCount++;
    }

    // Process tools as rules with beat- prefix
    let toolCount = 0;
    for (const tool of tools) {
      const content = await this.readFile(tool.path);
      const processedContent = this.createToolRule(tool, content);

      // Use beat- prefix: beat-tool-{module}-{name}.md
      const targetPath = path.join(rulesDir, `beat-tool-${tool.module}-${tool.name}.md`);
      await this.writeFile(targetPath, processedContent);
      toolCount++;
    }

    // Process workflows as rules with beat- prefix
    let workflowCount = 0;
    for (const workflow of workflows) {
      const content = await this.readFile(workflow.path);
      const processedContent = this.createWorkflowRule(workflow, content);

      // Use beat- prefix: beat-workflow-{module}-{name}.md
      const targetPath = path.join(rulesDir, `beat-workflow-${workflow.module}-${workflow.name}.md`);
      await this.writeFile(targetPath, processedContent);
      workflowCount++;
    }

    const totalRules = agentCount + taskCount + toolCount + workflowCount;

    console.log(chalk.green(`✓ ${this.name} configured:`));
    console.log(chalk.dim(`  - ${agentCount} agent rules created`));
    console.log(chalk.dim(`  - ${taskCount} task rules created`));
    console.log(chalk.dim(`  - ${toolCount} tool rules created`));
    console.log(chalk.dim(`  - ${workflowCount} workflow rules created`));
    console.log(chalk.dim(`  - Total: ${totalRules} rules`));
    console.log(chalk.dim(`  - Rules directory: ${path.relative(projectDir, rulesDir)}`));
    console.log(chalk.dim(`  - Agents can be activated with @{agent-name}`));

    return {
      success: true,
      rules: totalRules,
      agents: agentCount,
      tasks: taskCount,
      tools: toolCount,
      workflows: workflowCount,
    };
  }

  /**
   * Create rule content for an agent
   */
  async createAgentRule(artifact, beatDir, projectDir) {
    // Strip frontmatter from launcher
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    const contentWithoutFrontmatter = artifact.content.replace(frontmatterRegex, '').trim();

    // Extract metadata from launcher content
    const titleMatch = artifact.content.match(/description:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : this.formatTitle(artifact.name);

    // Calculate relative path for reference
    const relativePath = path.relative(projectDir, artifact.sourcePath).replaceAll('\\', '/');

    let ruleContent = `# ${title} Agent Rule

This rule is triggered when the user types \`@${artifact.name}\` and activates the ${title} agent persona.

## Agent Activation

${contentWithoutFrontmatter}

## File Reference

The full agent definition is located at: \`${relativePath}\`
`;

    return ruleContent;
  }

  /**
   * Create rule content for a task
   */
  createTaskRule(task, content) {
    // Extract task name from content
    const nameMatch = content.match(/name="([^"]+)"/);
    const taskName = nameMatch ? nameMatch[1] : this.formatTitle(task.name);

    let ruleContent = `# ${taskName} Task Rule

This rule defines the ${taskName} task workflow.

## Task Definition

When this task is triggered, execute the following workflow:

${content}

## Usage

Reference this task with \`@task-${task.name}\` to execute the defined workflow.

## Module

Part of the BEAT ${task.module.toUpperCase()} module.
`;

    return ruleContent;
  }

  /**
   * Create rule content for a tool
   */
  createToolRule(tool, content) {
    // Extract tool name from content
    const nameMatch = content.match(/name="([^"]+)"/);
    const toolName = nameMatch ? nameMatch[1] : this.formatTitle(tool.name);

    let ruleContent = `# ${toolName} Tool Rule

This rule defines the ${toolName} tool.

## Tool Definition

When this tool is triggered, execute the following:

${content}

## Usage

Reference this tool with \`@tool-${tool.name}\` to execute it.

## Module

Part of the BEAT ${tool.module.toUpperCase()} module.
`;

    return ruleContent;
  }

  /**
   * Create rule content for a workflow
   */
  createWorkflowRule(workflow, content) {
    let ruleContent = `# ${workflow.name} Workflow Rule

This rule defines the ${workflow.name} workflow.

## Workflow Description

${workflow.description || 'No description provided'}

## Workflow Definition

${content}

## Usage

Reference this workflow with \`@workflow-${workflow.name}\` to execute the guided workflow.

## Module

Part of the BEAT ${workflow.module.toUpperCase()} module.
`;

    return ruleContent;
  }

  /**
   * Format agent/task name as title
   */
  formatTitle(name) {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Cleanup Trae configuration - surgically remove only BEAT files
   */
  async cleanup(projectDir) {
    const fs = require('fs-extra');
    const rulesPath = path.join(projectDir, this.configDir, this.rulesDir);

    if (await fs.pathExists(rulesPath)) {
      // Only remove files that start with beat- prefix
      const files = await fs.readdir(rulesPath);
      let removed = 0;

      for (const file of files) {
        if (file.startsWith('beat-') && file.endsWith('.md')) {
          await fs.remove(path.join(rulesPath, file));
          removed++;
        }
      }

      if (removed > 0) {
        console.log(chalk.dim(`  Cleaned up ${removed} existing BEAT rules`));
      }
    }
  }
}

module.exports = { TraeSetup };
