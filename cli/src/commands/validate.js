const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

async function validateCommand(file, options) {
  const spinner = ora('Validating playbook...').start();
  let hasErrors = false;

  try {
    if (options.syntax || (!options.ansibleLint && !options.yamllint)) {
      spinner.text = 'Checking syntax...';
      try {
        execSync(`ansible-playbook --syntax-check ${file}`, { stdio: 'pipe' });
        spinner.succeed(chalk.green('✓ Syntax check passed'));
      } catch (error) {
        spinner.fail(chalk.red('✗ Syntax check failed'));
        console.error(chalk.red(error.stdout?.toString() || error.message));
        hasErrors = true;
      }
    }

    if (options.yamllint) {
      spinner.start('Running yamllint...');
      try {
        execSync(`yamllint ${file}`, { stdio: 'pipe' });
        spinner.succeed(chalk.green('✓ yamllint passed'));
      } catch (error) {
        spinner.fail(chalk.red('✗ yamllint failed'));
        console.error(chalk.red(error.stdout?.toString() || error.message));
        hasErrors = true;
      }
    }

    if (options.ansibleLint) {
      spinner.start('Running ansible-lint...');
      try {
        execSync(`ansible-lint ${file}`, { stdio: 'pipe' });
        spinner.succeed(chalk.green('✓ ansible-lint passed'));
      } catch (error) {
        spinner.fail(chalk.red('✗ ansible-lint failed'));
        console.error(chalk.red(error.stdout?.toString() || error.message));
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      console.log(chalk.green('\n✓ All validations passed'));
    } else {
      console.log(chalk.red('\n✗ Validation failed'));
      process.exit(1);
    }

  } catch (error) {
    spinner.fail(chalk.red('Validation error'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { validateCommand };
