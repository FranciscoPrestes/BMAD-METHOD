const path = require('node:path');
const fs = require('fs-extra');

/**
 * Helpers for gathering BEAT agents/tasks from the installed tree.
 * Shared by installers that need Claude-style exports.
 */
async function getAgentsFromBeat(beatDir, selectedModules = []) {
  const agents = [];

  // Get core agents
  if (await fs.pathExists(path.join(beatDir, 'core', 'agents'))) {
    const coreAgents = await getAgentsFromDir(path.join(beatDir, 'core', 'agents'), 'core');
    agents.push(...coreAgents);
  }

  // Get module agents
  for (const moduleName of selectedModules) {
    const agentsPath = path.join(beatDir, moduleName, 'agents');

    if (await fs.pathExists(agentsPath)) {
      const moduleAgents = await getAgentsFromDir(agentsPath, moduleName);
      agents.push(...moduleAgents);
    }
  }

  // Get standalone agents from beat/agents/ directory
  const standaloneAgentsDir = path.join(beatDir, 'agents');
  if (await fs.pathExists(standaloneAgentsDir)) {
    const agentDirs = await fs.readdir(standaloneAgentsDir, { withFileTypes: true });

    for (const agentDir of agentDirs) {
      if (!agentDir.isDirectory()) continue;

      const agentDirPath = path.join(standaloneAgentsDir, agentDir.name);
      const agentFiles = await fs.readdir(agentDirPath);

      for (const file of agentFiles) {
        if (!file.endsWith('.md')) continue;
        if (file.includes('.customize.')) continue;

        const filePath = path.join(agentDirPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        if (content.includes('localskip="true"')) continue;

        agents.push({
          path: filePath,
          name: file.replace('.md', ''),
          module: 'standalone', // Mark as standalone agent
        });
      }
    }
  }

  return agents;
}

async function getTasksFromBeat(beatDir, selectedModules = []) {
  const tasks = [];

  if (await fs.pathExists(path.join(beatDir, 'core', 'tasks'))) {
    const coreTasks = await getTasksFromDir(path.join(beatDir, 'core', 'tasks'), 'core');
    tasks.push(...coreTasks);
  }

  for (const moduleName of selectedModules) {
    const tasksPath = path.join(beatDir, moduleName, 'tasks');

    if (await fs.pathExists(tasksPath)) {
      const moduleTasks = await getTasksFromDir(tasksPath, moduleName);
      tasks.push(...moduleTasks);
    }
  }

  return tasks;
}

async function getAgentsFromDir(dirPath, moduleName) {
  const agents = [];

  if (!(await fs.pathExists(dirPath))) {
    return agents;
  }

  const files = await fs.readdir(dirPath);

  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }

    if (file.includes('.customize.')) {
      continue;
    }

    const filePath = path.join(dirPath, file);
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes('localskip="true"')) {
      continue;
    }

    agents.push({
      path: filePath,
      name: file.replace('.md', ''),
      module: moduleName,
    });
  }

  return agents;
}

async function getTasksFromDir(dirPath, moduleName) {
  const tasks = [];

  if (!(await fs.pathExists(dirPath))) {
    return tasks;
  }

  const files = await fs.readdir(dirPath);

  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }

    tasks.push({
      path: path.join(dirPath, file),
      name: file.replace('.md', ''),
      module: moduleName,
    });
  }

  return tasks;
}

module.exports = {
  getAgentsFromBeat,
  getTasksFromBeat,
  getAgentsFromDir,
  getTasksFromDir,
};
