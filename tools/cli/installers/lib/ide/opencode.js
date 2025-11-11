const path = require('node:path');
const fs = require('fs-extra');
const os = require('node:os');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { BaseIdeSetup } = require('./_base-ide');
const { WorkflowCommandGenerator } = require('./shared/workflow-command-generator');
const { TaskToolCommandGenerator } = require('./shared/task-tool-command-generator');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

/**
 * OpenCode IDE setup handler
 */
class OpenCodeSetup extends BaseIdeSetup {
  constructor() {
    super('opencode', 'OpenCode', true); // Mark as preferred/recommended
    this.configDir = '.opencode';
    this.commandsDir = 'command';
    this.agentsDir = 'agent';
  }

  async setup(projectDir, beatDir, options = {}) {
    console.log(chalk.cyan(`Setting up ${this.name}...`));

    const baseDir = path.join(projectDir, this.configDir);
    const commandsBaseDir = path.join(baseDir, this.commandsDir);
    const agentsBaseDir = path.join(baseDir, this.agentsDir);

    await this.ensureDir(commandsBaseDir);
    await this.ensureDir(agentsBaseDir);

    // Clean up any existing BEAT files before reinstalling
    await this.cleanup(projectDir);

    // Generate agent launchers
    const agentGen = new AgentCommandGenerator(this.beatFolderName);
    const { artifacts: agentArtifacts } = await agentGen.collectAgentArtifacts(beatDir, options.selectedModules || []);

    // Install primary agents with flat naming: beat-agent-{module}-{name}.md
    // OpenCode agents go in the agent folder (not command folder)
    let agentCount = 0;
    for (const artifact of agentArtifacts) {
      const agentContent = artifact.content;
      // Flat structure in agent folder: beat-agent-{module}-{name}.md
      const targetPath = path.join(agentsBaseDir, `beat-agent-${artifact.module}-${artifact.name}.md`);
      await this.writeFile(targetPath, agentContent);
      agentCount++;
    }

    // Install workflow commands with flat naming: beat-workflow-{module}-{name}.md
    const workflowGenerator = new WorkflowCommandGenerator(this.beatFolderName);
    const { artifacts: workflowArtifacts, counts: workflowCounts } = await workflowGenerator.collectWorkflowArtifacts(beatDir);

    let workflowCommandCount = 0;
    for (const artifact of workflowArtifacts) {
      if (artifact.type === 'workflow-command') {
        const commandContent = artifact.content;
        // Flat structure: beat-workflow-{module}-{name}.md
        // artifact.relativePath is like: bmm/workflows/plan-project.md
        const workflowName = path.basename(artifact.relativePath, '.md');
        const targetPath = path.join(commandsBaseDir, `beat-workflow-${artifact.module}-${workflowName}.md`);
        await this.writeFile(targetPath, commandContent);
        workflowCommandCount++;
      }
      // Skip workflow launcher READMEs as they're not needed in flat structure
    }

    // Install task and tool commands with flat naming
    const { tasks, tools } = await this.generateFlatTaskToolCommands(beatDir, commandsBaseDir);

    console.log(chalk.green(`✓ ${this.name} configured:`));
    console.log(chalk.dim(`  - ${agentCount} agents installed to .opencode/agent/`));
    if (workflowCommandCount > 0) {
      console.log(chalk.dim(`  - ${workflowCommandCount} workflows installed to .opencode/command/`));
    }
    if (tasks + tools > 0) {
      console.log(chalk.dim(`  - ${tasks + tools} tasks/tools installed to .opencode/command/ (${tasks} tasks, ${tools} tools)`));
    }

    return {
      success: true,
      agents: agentCount,
      workflows: workflowCommandCount,
      workflowCounts,
    };
  }

  /**
   * Generate flat task and tool commands for OpenCode
   * OpenCode doesn't support nested command directories
   */
  async generateFlatTaskToolCommands(beatDir, commandsBaseDir) {
    const taskToolGen = new TaskToolCommandGenerator();
    const tasks = await taskToolGen.loadTaskManifest(beatDir);
    const tools = await taskToolGen.loadToolManifest(beatDir);

    // Filter to only standalone items
    const standaloneTasks = tasks ? tasks.filter((t) => t.standalone === 'true' || t.standalone === true) : [];
    const standaloneTools = tools ? tools.filter((t) => t.standalone === 'true' || t.standalone === true) : [];

    // Generate command files for tasks with flat naming: beat-task-{module}-{name}.md
    for (const task of standaloneTasks) {
      const commandContent = taskToolGen.generateCommandContent(task, 'task');
      const targetPath = path.join(commandsBaseDir, `beat-task-${task.module}-${task.name}.md`);
      await this.writeFile(targetPath, commandContent);
    }

    // Generate command files for tools with flat naming: beat-tool-{module}-{name}.md
    for (const tool of standaloneTools) {
      const commandContent = taskToolGen.generateCommandContent(tool, 'tool');
      const targetPath = path.join(commandsBaseDir, `beat-tool-${tool.module}-${tool.name}.md`);
      await this.writeFile(targetPath, commandContent);
    }

    return {
      tasks: standaloneTasks.length,
      tools: standaloneTools.length,
    };
  }

  async readAndProcess(filePath, metadata) {
    const content = await fs.readFile(filePath, 'utf8');
    return this.processContent(content, metadata);
  }

  async createAgentContent(content, metadata) {
    const { frontmatter = {}, body } = this.parseFrontmatter(content);

    frontmatter.description =
      frontmatter.description && String(frontmatter.description).trim().length > 0
        ? frontmatter.description
        : `BEAT ${metadata.module} agent: ${metadata.name}`;

    // OpenCode agents use: 'primary' mode for main agents
    frontmatter.mode = 'primary';

    const frontmatterString = this.stringifyFrontmatter(frontmatter);

    // Get the activation header from central template
    const activationHeader = await this.getAgentCommandHeader();

    return `${frontmatterString}\n\n${activationHeader}\n\n${body}`;
  }

  parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match) {
      return { data: {}, body: content };
    }

    const body = content.slice(match[0].length);

    let frontmatter = {};
    try {
      frontmatter = yaml.load(match[1]) || {};
    } catch {
      frontmatter = {};
    }

    return { frontmatter, body };
  }

  stringifyFrontmatter(frontmatter) {
    const yamlText = yaml
      .dump(frontmatter, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      })
      .trimEnd();

    return `---\n${yamlText}\n---`;
  }

  /**
   * Cleanup OpenCode configuration - surgically remove only BEAT files
   */
  async cleanup(projectDir) {
    const agentsDir = path.join(projectDir, this.configDir, this.agentsDir);
    const commandsDir = path.join(projectDir, this.configDir, this.commandsDir);
    let removed = 0;

    // Clean up agent folder
    if (await fs.pathExists(agentsDir)) {
      const files = await fs.readdir(agentsDir);
      for (const file of files) {
        if (file.startsWith('beat-') && file.endsWith('.md')) {
          await fs.remove(path.join(agentsDir, file));
          removed++;
        }
      }
    }

    // Clean up command folder
    if (await fs.pathExists(commandsDir)) {
      const files = await fs.readdir(commandsDir);
      for (const file of files) {
        if (file.startsWith('beat-') && file.endsWith('.md')) {
          await fs.remove(path.join(commandsDir, file));
          removed++;
        }
      }
    }

    if (removed > 0) {
      console.log(chalk.dim(`  Cleaned up ${removed} existing BEAT files`));
    }
  }
}

module.exports = { OpenCodeSetup };
