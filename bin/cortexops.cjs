#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');
const { initCommand } = require('../cli/src/commands/init');
const { configCommand } = require('../cli/src/commands/config');
const { generateCommand } = require('../cli/src/commands/generate');
const { validateCommand } = require('../cli/src/commands/validate');
const { deployCommand } = require('../cli/src/commands/deploy');
const { historyCommand } = require('../cli/src/commands/history');
const { exportCommand } = require('../cli/src/commands/export');
const { cicdCommand } = require('../cli/src/commands/cicd');
const { batchCommand } = require('../cli/src/commands/batch');
const { statsCommand } = require('../cli/src/commands/stats');
const { loginCommand, logoutCommand } = require('../cli/src/commands/auth');
const { updateCommand } = require('../cli/src/commands/update');
const { interactiveCommand } = require('../cli/src/commands/interactive');

program
  .name('cortexops')
  .description('CortexOps CLI - Generate Ansible playbooks with AI')
  .version(version, '-v, --version', 'Output version')
  .option('--config <path>', 'Config file path', '~/.cortexops/config.yml')
  .option('--no-color', 'Disable colored output')
  .option('--verbose', 'Verbose logging')
  .option('--debug', 'Debug mode');

program
  .command('init')
  .description('Initialize CortexOps configuration')
  .option('--api-key <key>', 'Set API key during init')
  .option('--environment <env>', 'Default environment (staging|production)')
  .option('--force', 'Overwrite existing configuration')
  .action(initCommand);

program
  .command('config <command> [args...]')
  .description('Manage configuration')
  .action(configCommand);

program
  .command('generate <prompt>')
  .description('Generate Ansible playbook from prompt')
  .option('-o, --output <file>', 'Output file path')
  .option('-e, --environment <env>', 'Target environment')
  .option('--become', 'Enable privilege escalation')
  .option('--no-gather-facts', 'Disable facts gathering')
  .option('--check-mode', 'Enable check mode')
  .option('--format <format>', 'Output format (yaml|json)', 'yaml')
  .option('--validate', 'Validate before saving')
  .option('--preview', 'Preview without saving')
  .option('--complexity <level>', 'Force complexity level')
  .action(generateCommand);

program
  .command('interactive')
  .description('Interactive playbook generation')
  .option('--examples', 'Show example prompts')
  .option('--no-validation', 'Skip validation')
  .action(interactiveCommand);

program
  .command('validate <file>')
  .description('Validate playbook')
  .option('--ansible-lint', 'Run ansible-lint')
  .option('--yamllint', 'Run yamllint')
  .option('--syntax', 'Check syntax only')
  .option('--strict', 'Strict validation')
  .option('--fix', 'Auto-fix issues')
  .action(validateCommand);

program
  .command('deploy <file>')
  .description('Deploy playbook with Ansible')
  .option('-i, --inventory <file>', 'Inventory file')
  .option('--check', 'Dry-run mode')
  .option('--diff', 'Show differences')
  .option('--limit <hosts>', 'Limit to specific hosts')
  .option('--tags <tags>', 'Run specific tags')
  .option('--skip-tags <tags>', 'Skip specific tags')
  .option('--vault-password-file <file>', 'Vault password file')
  .option('-e, --extra-vars <vars>', 'Extra variables')
  .action(deployCommand);

program
  .command('history')
  .description('Show generation history')
  .option('--limit <n>', 'Show last n entries', '10')
  .option('--all', 'Show all history')
  .option('--format <format>', 'Output format (table|json|yaml)', 'table')
  .option('--filter <filter>', 'Filter by prompt')
  .option('--export <file>', 'Export history to file')
  .action(historyCommand);

program
  .command('export <file>')
  .description('Export playbook')
  .option('--git-repo <url>', 'Git repository URL')
  .option('--git-branch <branch>', 'Git branch', 'main')
  .option('--git-commit-message <message>', 'Commit message')
  .option('--directory <dir>', 'Export directory')
  .option('--format <format>', 'Export format (yaml|json|tar)', 'yaml')
  .action(exportCommand);

program
  .command('cicd')
  .description('Generate CI/CD configuration')
  .command('generate')
  .option('--provider <provider>', 'CI/CD provider (gitlab|jenkins|github)')
  .option('--output <file>', 'Output file')
  .option('--playbook <file>', 'Reference playbook')
  .action(cicdCommand);

program
  .command('batch')
  .description('Batch generation')
  .command('generate <input>')
  .option('--output-dir <dir>', 'Output directory', './playbooks')
  .option('--format <format>', 'Input format (txt|json|yaml)', 'txt')
  .option('--parallel <n>', 'Parallel jobs', '5')
  .option('--fail-fast', 'Stop on first error')
  .action(batchCommand);

program
  .command('stats')
  .description('Show usage statistics')
  .option('--period <period>', 'Time period (day|week|month|all)', 'month')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(statsCommand);

program
  .command('login [api-key]')
  .description('Login with API key')
  .action(loginCommand);

program
  .command('logout')
  .description('Logout and clear credentials')
  .action(logoutCommand);

program
  .command('update')
  .description('Update CLI to latest version')
  .option('--check', 'Check for updates only')
  .option('--prerelease', 'Include pre-release versions')
  .action(updateCommand);

program
  .command('completion <shell>')
  .description('Generate shell completion script')
  .action((shell) => {
    console.log(`# ${shell} completion for cortexops`);
    console.log('# Add this to your shell configuration file');
  });

program.on('option:no-color', () => {
  chalk.level = 0;
});

program.on('option:debug', () => {
  process.env.DEBUG = 'cortexops:*';
});

program.on('option:verbose', () => {
  process.env.VERBOSE = 'true';
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
