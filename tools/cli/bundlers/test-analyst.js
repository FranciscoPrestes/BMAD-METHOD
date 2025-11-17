const { WebBundler } = require('./web-bundler');
const chalk = require('chalk');
const path = require('node:path');

async function testAnalystBundle() {
  console.log(chalk.cyan.bold('\n🧪 Testing Analyst Agent Bundle\n'));

  try {
    const bundler = new WebBundler();

    // Load web activation first
    await bundler.loadWebActivation();

    // Bundle just the analyst agent from beat-method module
    // Only bundle the analyst for testing
    const agentPath = path.join(bundler.modulesPath, 'beat-method', 'agents', 'analyst.md');
    await bundler.bundleAgent('beat-method', 'analyst.md');

    console.log(chalk.green.bold('\n✅ Test completed successfully!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testAnalystBundle();
