const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { saveConfig } = require('../utils/config');

const DEFAULT_CONFIG = {
  api: {
    base_url: 'https://api.cortexops.com/v1',
    api_key: '',
    timeout: 30000,
    retries: 3,
  },
  defaults: {
    environment: 'production',
    become: true,
    gather_facts: true,
  },
  output: {
    format: 'yaml',
    directory: './playbooks',
    filename_pattern: '{timestamp}_{prompt_slug}.yml',
  },
  validation: {
    ansible_lint: true,
    yamllint: true,
    syntax_check: true,
    auto_fix: false,
  },
  git: {
    enabled: false,
    auto_commit: false,
    repo: '',
    branch: 'main',
    commit_message_template: 'Generated playbook: {prompt}',
  },
  cicd: {
    default_provider: 'gitlab',
    auto_generate: false,
  },
  logging: {
    level: 'info',
    file: path.join(os.homedir(), '.cortexops', 'logs', 'cli.log'),
    max_size: '10MB',
    max_age: 30,
  },
  telemetry: {
    enabled: true,
    anonymous: true,
  },
};

async function initCommand(options) {
  const spinner = ora('Initializing CortexOps...').start();
  const configDir = path.join(os.homedir(), '.cortexops');
  const configPath = path.join(configDir, 'config.json');

  try {
    if (fs.existsSync(configPath) && !options.force) {
      spinner.stop();
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration already exists. Overwrite?',
          default: false,
        },
      ]);

      if (!answers.overwrite) {
        console.log(chalk.yellow('Initialization cancelled.'));
        return;
      }
      spinner.start('Initializing CortexOps...');
    }

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const logsDir = path.join(configDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const config = { ...DEFAULT_CONFIG };

    if (options.apiKey) {
      config.api.api_key = options.apiKey;
    }

    if (options.environment) {
      config.defaults.environment = options.environment;
    }

    await saveConfig(config);

    spinner.succeed(chalk.green('CortexOps initialized successfully'));

    console.log(chalk.cyan('\nConfiguration saved to:'), chalk.dim(configPath));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.dim('  1. Set your API key: cortexops login'));
    console.log(chalk.dim('  2. Generate playbook: cortexops generate "Install nginx"'));
    console.log(chalk.dim('\nDocumentation: https://docs.cortexops.com/cli'));

  } catch (error) {
    spinner.fail(chalk.red('Initialization failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { initCommand };
