const fs = require('fs');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

async function exportCommand(file, options) {
  const spinner = ora('Exporting playbook...').start();

  try {
    if (options.gitRepo) {
      spinner.text = 'Exporting to Git repository...';

      const tempDir = `/tmp/cortexops-export-${Date.now()}`;
      execSync(`git clone ${options.gitRepo} ${tempDir}`, { stdio: 'pipe' });
      execSync(`cd ${tempDir} && git checkout ${options.gitBranch}`, { stdio: 'pipe' });

      const filename = file.split('/').pop();
      execSync(`cp ${file} ${tempDir}/${filename}`);

      const message = options.gitCommitMessage || `Add playbook: ${filename}`;
      execSync(`cd ${tempDir} && git add ${filename} && git commit -m "${message}" && git push`, { stdio: 'pipe' });

      execSync(`rm -rf ${tempDir}`);

      spinner.succeed(chalk.green(`✓ Exported to ${options.gitRepo}`));
    } else if (options.directory) {
      spinner.text = 'Exporting to directory...';

      if (!fs.existsSync(options.directory)) {
        fs.mkdirSync(options.directory, { recursive: true });
      }

      const filename = file.split('/').pop();
      fs.copyFileSync(file, `${options.directory}/${filename}`);

      spinner.succeed(chalk.green(`✓ Exported to ${options.directory}/${filename}`));
    } else {
      spinner.fail(chalk.red('Export destination required'));
      console.log(chalk.dim('Usage: cortexops export <file> --git-repo <url> OR --directory <dir>'));
      process.exit(1);
    }

  } catch (error) {
    spinner.fail(chalk.red('Export failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { exportCommand };
