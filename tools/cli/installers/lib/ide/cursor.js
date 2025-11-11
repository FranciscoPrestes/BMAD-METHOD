const path = require('node:path');
const { BaseIdeSetup } = require('./_base-ide');
const chalk = require('chalk');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

/**
 * Cursor IDE setup handler
 */
class CursorSetup extends BaseIdeSetup {
  constructor() {
    super('cursor', 'Cursor', true); // preferred IDE
    this.configDir = '.cursor';
    this.rulesDir = 'rules';
  }

  /**
   * Cleanup old BEAT installation before reinstalling
   * @param {string} projectDir - Project directory
   */
  async cleanup(projectDir) {
    const fs = require('fs-extra');
    const beatRulesDir = path.join(projectDir, this.configDir, this.rulesDir, 'beat');

    if (await fs.pathExists(beatRulesDir)) {
      await fs.remove(beatRulesDir);
      console.log(chalk.dim(`  Removed old BEAT rules from ${this.name}`));
    }
  }

  /**
   * Setup Cursor IDE configuration
   * @param {string} projectDir - Project directory
   * @param {string} beatDir - BEAT installation directory
   * @param {Object} options - Setup options
   */
  async setup(projectDir, beatDir, options = {}) {
    console.log(chalk.cyan(`Setting up ${this.name}...`));

    // Clean up old BEAT installation first
    await this.cleanup(projectDir);

    // Create .cursor/rules directory structure
    const cursorDir = path.join(projectDir, this.configDir);
    const rulesDir = path.join(cursorDir, this.rulesDir);
    const beatRulesDir = path.join(rulesDir, 'beat');

    await this.ensureDir(beatRulesDir);

    // Generate agent launchers first
    const agentGen = new AgentCommandGenerator(this.beatFolderName);
    const { artifacts: agentArtifacts } = await agentGen.collectAgentArtifacts(beatDir, options.selectedModules || []);

    // Convert artifacts to agent format for index creation
    const agents = agentArtifacts.map((a) => ({ module: a.module, name: a.name }));

    // Get tasks, tools, and workflows (standalone only)
    const tasks = await this.getTasks(beatDir, true);
    const tools = await this.getTools(beatDir, true);
    const workflows = await this.getWorkflows(beatDir, true);

    // Create directories for each module
    const modules = new Set();
    for (const item of [...agents, ...tasks, ...tools, ...workflows]) modules.add(item.module);

    for (const module of modules) {
      await this.ensureDir(path.join(beatRulesDir, module));
      await this.ensureDir(path.join(beatRulesDir, module, 'agents'));
      await this.ensureDir(path.join(beatRulesDir, module, 'tasks'));
      await this.ensureDir(path.join(beatRulesDir, module, 'tools'));
      await this.ensureDir(path.join(beatRulesDir, module, 'workflows'));
    }

    // Process and write agent launchers with MDC format
    let agentCount = 0;
    for (const artifact of agentArtifacts) {
      // Add MDC metadata header to launcher (but don't call processContent which adds activation headers)
      const content = this.wrapLauncherWithMDC(artifact.content, {
        module: artifact.module,
        name: artifact.name,
      });

      const targetPath = path.join(beatRulesDir, artifact.module, 'agents', `${artifact.name}.mdc`);

      await this.writeFile(targetPath, content);
      agentCount++;
    }

    // Process and copy tasks
    let taskCount = 0;
    for (const task of tasks) {
      const content = await this.readAndProcess(task.path, {
        module: task.module,
        name: task.name,
      });

      const targetPath = path.join(beatRulesDir, task.module, 'tasks', `${task.name}.mdc`);

      await this.writeFile(targetPath, content);
      taskCount++;
    }

    // Process and copy tools
    let toolCount = 0;
    for (const tool of tools) {
      const content = await this.readAndProcess(tool.path, {
        module: tool.module,
        name: tool.name,
      });

      const targetPath = path.join(beatRulesDir, tool.module, 'tools', `${tool.name}.mdc`);

      await this.writeFile(targetPath, content);
      toolCount++;
    }

    // Process and copy workflows
    let workflowCount = 0;
    for (const workflow of workflows) {
      const content = await this.readAndProcess(workflow.path, {
        module: workflow.module,
        name: workflow.name,
      });

      const targetPath = path.join(beatRulesDir, workflow.module, 'workflows', `${workflow.name}.mdc`);

      await this.writeFile(targetPath, content);
      workflowCount++;
    }

    // Create BEAT index file (but NOT .cursorrules - user manages that)
    await this.createBEATIndex(beatRulesDir, agents, tasks, tools, workflows, modules);

    console.log(chalk.green(`✓ ${this.name} configured:`));
    console.log(chalk.dim(`  - ${agentCount} agents installed`));
    console.log(chalk.dim(`  - ${taskCount} tasks installed`));
    console.log(chalk.dim(`  - ${toolCount} tools installed`));
    console.log(chalk.dim(`  - ${workflowCount} workflows installed`));
    console.log(chalk.dim(`  - Rules directory: ${path.relative(projectDir, beatRulesDir)}`));

    return {
      success: true,
      agents: agentCount,
      tasks: taskCount,
      tools: toolCount,
      workflows: workflowCount,
    };
  }

  /**
   * Create BEAT index file for easy navigation
   */
  async createBEATIndex(beatRulesDir, agents, tasks, tools, workflows, modules) {
    const indexPath = path.join(beatRulesDir, 'index.mdc');

    let content = `---
description: BEAT Method - Master Index
globs:
alwaysApply: true
---

# BEAT Method - Cursor Rules Index

This is the master index for all BEAT agents, tasks, tools, and workflows available in your project.

## Installation Complete!

BEAT rules have been installed to: \`.cursor/rules/beat/\`

**Note:** BEAT does not modify your \`.cursorrules\` file. You manage that separately.

## How to Use

- Reference specific agents: @beat/{module}/agents/{agent-name}
- Reference specific tasks: @beat/{module}/tasks/{task-name}
- Reference specific tools: @beat/{module}/tools/{tool-name}
- Reference specific workflows: @beat/{module}/workflows/{workflow-name}
- Reference entire modules: @beat/{module}
- Reference this index: @beat/index

## Available Modules

`;

    for (const module of modules) {
      content += `### ${module.toUpperCase()}\n\n`;

      // List agents for this module
      const moduleAgents = agents.filter((a) => a.module === module);
      if (moduleAgents.length > 0) {
        content += `**Agents:**\n`;
        for (const agent of moduleAgents) {
          content += `- @beat/${module}/agents/${agent.name} - ${agent.name}\n`;
        }
        content += '\n';
      }

      // List tasks for this module
      const moduleTasks = tasks.filter((t) => t.module === module);
      if (moduleTasks.length > 0) {
        content += `**Tasks:**\n`;
        for (const task of moduleTasks) {
          content += `- @beat/${module}/tasks/${task.name} - ${task.name}\n`;
        }
        content += '\n';
      }

      // List tools for this module
      const moduleTools = tools.filter((t) => t.module === module);
      if (moduleTools.length > 0) {
        content += `**Tools:**\n`;
        for (const tool of moduleTools) {
          content += `- @beat/${module}/tools/${tool.name} - ${tool.name}\n`;
        }
        content += '\n';
      }

      // List workflows for this module
      const moduleWorkflows = workflows.filter((w) => w.module === module);
      if (moduleWorkflows.length > 0) {
        content += `**Workflows:**\n`;
        for (const workflow of moduleWorkflows) {
          content += `- @beat/${module}/workflows/${workflow.name} - ${workflow.name}\n`;
        }
        content += '\n';
      }
    }

    content += `
## Quick Reference

- All BEAT rules are Manual type - reference them explicitly when needed
- Agents provide persona-based assistance with specific expertise
- Tasks are reusable workflows for common operations
- Tools provide specialized functionality
- Workflows orchestrate multi-step processes
- Each agent includes an activation block for proper initialization

## Configuration

BEAT rules are configured as Manual rules (alwaysApply: false) to give you control
over when they're included in your context. Reference them explicitly when you need
specific agent expertise, task workflows, tools, or guided workflows.
`;

    await this.writeFile(indexPath, content);
  }

  /**
   * Read and process file content
   */
  async readAndProcess(filePath, metadata) {
    const fs = require('fs-extra');
    const content = await fs.readFile(filePath, 'utf8');
    return this.processContent(content, metadata);
  }

  /**
   * Override processContent to add MDC metadata header for Cursor
   * @param {string} content - File content
   * @param {Object} metadata - File metadata
   * @returns {string} Processed content with MDC header
   */
  processContent(content, metadata = {}) {
    // First apply base processing (includes activation injection for agents)
    let processed = super.processContent(content, metadata);

    // Strip any existing frontmatter from the processed content
    // This prevents duplicate frontmatter blocks
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    if (frontmatterRegex.test(processed)) {
      processed = processed.replace(frontmatterRegex, '');
    }

    // Determine the type and description based on content
    const isAgent = content.includes('<agent');
    const isTask = content.includes('<task');
    const isTool = content.includes('<tool');
    const isWorkflow = content.includes('workflow:') || content.includes('name:');

    let description = '';
    let globs = '';

    if (isAgent) {
      // Extract agent title if available
      const titleMatch = content.match(/title="([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : metadata.name;
      description = `BEAT ${metadata.module.toUpperCase()} Agent: ${title}`;
      globs = '';
    } else if (isTask) {
      // Extract task name if available
      const nameMatch = content.match(/name="([^"]+)"/);
      const taskName = nameMatch ? nameMatch[1] : metadata.name;
      description = `BEAT ${metadata.module.toUpperCase()} Task: ${taskName}`;
      globs = '';
    } else if (isTool) {
      // Extract tool name if available
      const nameMatch = content.match(/name="([^"]+)"/);
      const toolName = nameMatch ? nameMatch[1] : metadata.name;
      description = `BEAT ${metadata.module.toUpperCase()} Tool: ${toolName}`;
      globs = '';
    } else if (isWorkflow) {
      // Workflow
      description = `BEAT ${metadata.module.toUpperCase()} Workflow: ${metadata.name}`;
      globs = '';
    } else {
      description = `BEAT ${metadata.module.toUpperCase()}: ${metadata.name}`;
      globs = '';
    }

    // Create MDC metadata header
    const mdcHeader = `---
description: ${description}
globs: ${globs}
alwaysApply: false
---

`;

    // Add the MDC header to the processed content
    return mdcHeader + processed;
  }

  /**
   * Wrap launcher content with MDC metadata (without base processing)
   * Launchers are already complete and should not have activation headers injected
   */
  wrapLauncherWithMDC(launcherContent, metadata = {}) {
    // Strip the launcher's frontmatter - we'll replace it with MDC frontmatter
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    const contentWithoutFrontmatter = launcherContent.replace(frontmatterRegex, '');

    // Extract metadata from launcher frontmatter for MDC description
    const nameMatch = launcherContent.match(/name:\s*"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : metadata.name;

    const description = `BEAT ${metadata.module.toUpperCase()} Agent: ${name}`;

    // Create MDC metadata header
    const mdcHeader = `---
description: ${description}
globs:
alwaysApply: false
---

`;

    // Return MDC header + launcher content (without its original frontmatter)
    return mdcHeader + contentWithoutFrontmatter;
  }
}

module.exports = { CursorSetup };
