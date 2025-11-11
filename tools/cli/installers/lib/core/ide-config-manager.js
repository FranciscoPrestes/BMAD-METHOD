const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

/**
 * Manages IDE configuration persistence
 * Saves and loads IDE-specific configurations to/from beat/_cfg/ides/
 */
class IdeConfigManager {
  constructor() {}

  /**
   * Get path to IDE config directory
   * @param {string} beatDir - BEAT installation directory
   * @returns {string} Path to IDE config directory
   */
  getIdeConfigDir(beatDir) {
    return path.join(beatDir, '_cfg', 'ides');
  }

  /**
   * Get path to specific IDE config file
   * @param {string} beatDir - BEAT installation directory
   * @param {string} ideName - IDE name (e.g., 'claude-code')
   * @returns {string} Path to IDE config file
   */
  getIdeConfigPath(beatDir, ideName) {
    return path.join(this.getIdeConfigDir(beatDir), `${ideName}.yaml`);
  }

  /**
   * Save IDE configuration
   * @param {string} beatDir - BEAT installation directory
   * @param {string} ideName - IDE name
   * @param {Object} configuration - IDE-specific configuration object
   */
  async saveIdeConfig(beatDir, ideName, configuration) {
    const configDir = this.getIdeConfigDir(beatDir);
    await fs.ensureDir(configDir);

    const configPath = this.getIdeConfigPath(beatDir, ideName);
    const now = new Date().toISOString();

    // Check if config already exists to preserve configured_date
    let configuredDate = now;
    if (await fs.pathExists(configPath)) {
      try {
        const existing = await this.loadIdeConfig(beatDir, ideName);
        if (existing && existing.configured_date) {
          configuredDate = existing.configured_date;
        }
      } catch {
        // Ignore errors reading existing config
      }
    }

    const configData = {
      ide: ideName,
      configured_date: configuredDate,
      last_updated: now,
      configuration: configuration || {},
    };

    const yamlContent = yaml.dump(configData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });

    // Ensure POSIX-compliant final newline
    const content = yamlContent.endsWith('\n') ? yamlContent : yamlContent + '\n';
    await fs.writeFile(configPath, content, 'utf8');
  }

  /**
   * Load IDE configuration
   * @param {string} beatDir - BEAT installation directory
   * @param {string} ideName - IDE name
   * @returns {Object|null} IDE configuration or null if not found
   */
  async loadIdeConfig(beatDir, ideName) {
    const configPath = this.getIdeConfigPath(beatDir, ideName);

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(content);
      return config;
    } catch (error) {
      console.warn(`Warning: Failed to load IDE config for ${ideName}:`, error.message);
      return null;
    }
  }

  /**
   * Load all IDE configurations
   * @param {string} beatDir - BEAT installation directory
   * @returns {Object} Map of IDE name to configuration
   */
  async loadAllIdeConfigs(beatDir) {
    const configDir = this.getIdeConfigDir(beatDir);
    const configs = {};

    if (!(await fs.pathExists(configDir))) {
      return configs;
    }

    try {
      const files = await fs.readdir(configDir);
      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const ideName = file.replace('.yaml', '');
          const config = await this.loadIdeConfig(beatDir, ideName);
          if (config) {
            configs[ideName] = config.configuration;
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Failed to load IDE configs:', error.message);
    }

    return configs;
  }

  /**
   * Check if IDE has saved configuration
   * @param {string} beatDir - BEAT installation directory
   * @param {string} ideName - IDE name
   * @returns {boolean} True if configuration exists
   */
  async hasIdeConfig(beatDir, ideName) {
    const configPath = this.getIdeConfigPath(beatDir, ideName);
    return await fs.pathExists(configPath);
  }

  /**
   * Delete IDE configuration
   * @param {string} beatDir - BEAT installation directory
   * @param {string} ideName - IDE name
   */
  async deleteIdeConfig(beatDir, ideName) {
    const configPath = this.getIdeConfigPath(beatDir, ideName);
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }
}

module.exports = { IdeConfigManager };
