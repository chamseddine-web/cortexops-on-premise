const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const { version } = require('../../../package.json');

async function updateCommand(options) {
  const spinner = ora('Checking for updates...').start();

  try {
    const latestVersion = execSync('npm view @cortexops/cli version', { encoding: 'utf8' }).trim();

    if (latestVersion === version) {
      spinner.succeed(chalk.green(`✓ Already on latest version: ${version}`));
      return;
    }

    if (options.check) {
      spinner.succeed(chalk.yellow(`Update available: ${version} → ${latestVersion}`));
      console.log(chalk.dim('Run "cortexops update" to update'));
      return;
    }

    spinner.text = 'Updating CortexOps CLI...';

    execSync('npm install -g @cortexops/cli@latest', { stdio: 'inherit' });

    spinner.succeed(chalk.green(`✓ Updated to version ${latestVersion}`));

  } catch (error) {
    spinner.fail(chalk.red('Update failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { updateCommand };
