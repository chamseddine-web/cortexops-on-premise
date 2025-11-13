const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

async function deployCommand(file, options) {
  const spinner = ora('Deploying playbook...').start();

  try {
    if (!options.inventory) {
      spinner.fail(chalk.red('Inventory file required'));
      console.log(chalk.dim('Usage: cortexops deploy <file> -i <inventory>'));
      process.exit(1);
    }

    const args = [
      'ansible-playbook',
      file,
      `-i ${options.inventory}`,
    ];

    if (options.check) args.push('--check');
    if (options.diff) args.push('--diff');
    if (options.limit) args.push(`--limit ${options.limit}`);
    if (options.tags) args.push(`--tags ${options.tags}`);
    if (options.skipTags) args.push(`--skip-tags ${options.skipTags}`);
    if (options.vaultPasswordFile) args.push(`--vault-password-file ${options.vaultPasswordFile}`);
    if (options.extraVars) args.push(`-e "${options.extraVars}"`);

    const command = args.join(' ');

    spinner.text = options.check ? 'Running dry-run...' : 'Deploying...';

    console.log(chalk.dim(`\nExecuting: ${command}\n`));
    spinner.stop();

    execSync(command, { stdio: 'inherit' });

    console.log(chalk.green('\n✓ Deployment completed successfully'));

  } catch (error) {
    console.error(chalk.red('\n✗ Deployment failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { deployCommand };
