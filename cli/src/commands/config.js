const chalk = require('chalk');
const { getConfig, saveConfig } = require('../utils/config');

async function configCommand(command, args) {
  try {
    switch (command) {
      case 'set':
        await setConfig(args[0], args[1]);
        break;
      case 'get':
        await getConfigValue(args[0]);
        break;
      case 'list':
        await listConfig();
        break;
      case 'reset':
        await resetConfig();
        break;
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(chalk.dim('Available commands: set, get, list, reset'));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

async function setConfig(key, value) {
  const config = await getConfig();

  const keys = key.split('.');
  let current = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;

  await saveConfig(config);
  console.log(chalk.green(`✓ Set ${key} = ${value}`));
}

async function getConfigValue(key) {
  const config = await getConfig();

  const keys = key.split('.');
  let value = config;

  for (const k of keys) {
    value = value[k];
    if (value === undefined) {
      console.log(chalk.yellow(`Key not found: ${key}`));
      return;
    }
  }

  console.log(value);
}

async function listConfig() {
  const config = await getConfig();
  console.log(chalk.cyan('Current configuration:'));
  console.log(JSON.stringify(config, null, 2));
}

async function resetConfig() {
  const { getDefaultConfig } = require('../utils/config');
  const config = getDefaultConfig();
  await saveConfig(config);
  console.log(chalk.green('✓ Configuration reset to defaults'));
}

module.exports = { configCommand };
