const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');

/**
 * Generates launcher command files for each agent
 * Similar to WorkflowCommandGenerator but for agents
 */
class AgentCommandGenerator {
  constructor(beatFolderName = 'beat') {
    this.templatePath = path.join(__dirname, '../templates/agent-command-template.md');
    this.beatFolderName = beatFolderName;
  }

  /**
   * Collect agent artifacts for IDE installation
   * @param {string} beatDir - BEAT installation directory
   * @param {Array} selectedModules - Modules to include
   * @returns {Object} Artifacts array with metadata
   */
  async collectAgentArtifacts(beatDir, selectedModules = []) {
    const { getAgentsFromBeat } = require('./beat-artifacts');

    // Get agents from INSTALLED beat/ directory
    const agents = await getAgentsFromBeat(beatDir, selectedModules);

    const artifacts = [];

    for (const agent of agents) {
      const launcherContent = await this.generateLauncherContent(agent);
      artifacts.push({
        type: 'agent-launcher',
        module: agent.module,
        name: agent.name,
        relativePath: path.join(agent.module, 'agents', `${agent.name}.md`),
        content: launcherContent,
        sourcePath: agent.path,
      });
    }

    return {
      artifacts,
      counts: {
        agents: agents.length,
      },
    };
  }

  /**
   * Generate launcher content for an agent
   * @param {Object} agent - Agent metadata
   * @returns {string} Launcher file content
   */
  async generateLauncherContent(agent) {
    // Load the template
    const template = await fs.readFile(this.templatePath, 'utf8');

    // Replace template variables
    return template
      .replaceAll('{{name}}', agent.name)
      .replaceAll('{{module}}', agent.module)
      .replaceAll('{{description}}', agent.description || `${agent.name} agent`)
      .replaceAll('{beat_folder}', this.beatFolderName);
  }

  /**
   * Write agent launcher artifacts to IDE commands directory
   * @param {string} baseCommandsDir - Base commands directory for the IDE
   * @param {Array} artifacts - Agent launcher artifacts
   * @returns {number} Count of launchers written
   */
  async writeAgentLaunchers(baseCommandsDir, artifacts) {
    let writtenCount = 0;

    for (const artifact of artifacts) {
      if (artifact.type === 'agent-launcher') {
        const moduleAgentsDir = path.join(baseCommandsDir, artifact.module, 'agents');
        await fs.ensureDir(moduleAgentsDir);

        const launcherPath = path.join(moduleAgentsDir, `${artifact.name}.md`);
        await fs.writeFile(launcherPath, artifact.content);
        writtenCount++;
      }
    }

    return writtenCount;
  }
}

module.exports = { AgentCommandGenerator };
