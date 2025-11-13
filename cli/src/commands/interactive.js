const chalk = require('chalk');
const inquirer = require('inquirer');
const { generateCommand } = require('./generate');

async function interactiveCommand(options) {
  console.log(chalk.cyan('\n🤖 CortexOps Interactive Mode\n'));

  if (options.examples) {
    console.log(chalk.yellow('Example prompts:'));
    console.log(chalk.dim('  - Deploy PostgreSQL cluster with replication'));
    console.log(chalk.dim('  - Install and configure Nginx with SSL'));
    console.log(chalk.dim('  - Setup Kubernetes cluster on AWS EKS'));
    console.log(chalk.dim('  - Configure firewall with UFW'));
    console.log(chalk.dim('  - Hardening Linux server CIS Level 2\n'));
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'What do you want to automate?',
      validate: (input) => input.trim().length > 0 || 'Prompt required',
    },
    {
      type: 'list',
      name: 'environment',
      message: 'Target environment:',
      choices: ['production', 'staging', 'development'],
      default: 'production',
    },
    {
      type: 'confirm',
      name: 'become',
      message: 'Enable privilege escalation (sudo)?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'validate',
      message: 'Validate before saving?',
      default: !options.noValidation,
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output file path:',
      default: (answers) => {
        const slug = answers.prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
        return `./playbooks/${slug}.yml`;
      },
    },
  ]);

  console.log(chalk.dim('\nGenerating playbook...\n'));

  await generateCommand(answers.prompt, {
    output: answers.output,
    environment: answers.environment,
    become: answers.become,
    validate: answers.validate,
  });

  const nextAction = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do next?',
      choices: [
        'Generate another playbook',
        'Deploy this playbook',
        'Validate this playbook',
        'Exit',
      ],
    },
  ]);

  if (nextAction.action === 'Generate another playbook') {
    await interactiveCommand(options);
  } else if (nextAction.action === 'Deploy this playbook') {
    const { deployCommand } = require('./deploy');
    const deployAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'inventory',
        message: 'Inventory file path:',
        validate: (input) => input.trim().length > 0 || 'Inventory required',
      },
    ]);
    await deployCommand(answers.output, { inventory: deployAnswers.inventory });
  } else if (nextAction.action === 'Validate this playbook') {
    const { validateCommand } = require('./validate');
    await validateCommand(answers.output, { syntax: true });
  }
}

module.exports = { interactiveCommand };
