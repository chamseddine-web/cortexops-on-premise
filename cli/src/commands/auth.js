const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { getConfig, saveConfig } = require('../utils/config');
const { apiRequest } = require('../utils/api');

async function loginCommand(apiKey) {
  const spinner = ora('Authenticating...').start();

  try {
    let key = apiKey;

    if (!key) {
      spinner.stop();
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your API key:',
          mask: '*',
        },
      ]);
      key = answers.apiKey;
      spinner.start('Authenticating...');
    }

    const response = await apiRequest('/api/auth/verify', {
      method: 'POST',
      headers: {
        'X-API-Key': key,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid API key');
    }

    const userData = await response.json();

    const config = await getConfig();
    config.api.api_key = key;
    await saveConfig(config);

    spinner.succeed(chalk.green(`Logged in as ${userData.email || 'user'}`));
    console.log(chalk.dim('\nYou can now use CortexOps CLI commands.'));
    console.log(chalk.dim('Try: cortexops generate "Install nginx"'));

  } catch (error) {
    spinner.fail(chalk.red('Authentication failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

async function logoutCommand() {
  const spinner = ora('Logging out...').start();

  try {
    const config = await getConfig();
    config.api.api_key = '';
    await saveConfig(config);

    spinner.succeed(chalk.green('Logged out successfully'));
    console.log(chalk.dim('Run "cortexops login" to authenticate again.'));

  } catch (error) {
    spinner.fail(chalk.red('Logout failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { loginCommand, logoutCommand };
