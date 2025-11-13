const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { getConfig } = require('../utils/config');
const { apiRequest } = require('../utils/api');

async function generateCommand(prompt, options) {
  const spinner = ora('Generating playbook...').start();

  try {
    const config = await getConfig();

    if (!config.api.api_key) {
      spinner.fail(chalk.red('API key not configured. Run: cortexops login'));
      process.exit(1);
    }

    const payload = {
      prompt,
      environment: options.environment || config.defaults.environment,
      become: options.become !== undefined ? options.become : config.defaults.become,
      gather_facts: options.gatherFacts !== undefined ? options.gatherFacts : config.defaults.gather_facts,
      check_mode: options.checkMode || false,
      complexity: options.complexity,
    };

    const response = await apiRequest('/api/generate-playbook', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Generation failed');
    }

    const result = await response.json();
    const playbook = options.format === 'json'
      ? JSON.stringify(result.playbook, null, 2)
      : result.yaml;

    if (options.preview) {
      spinner.succeed(chalk.green('Playbook generated'));
      console.log('\n' + chalk.cyan('Preview:'));
      console.log(playbook);
      return;
    }

    const outputPath = options.output || path.join(
      config.output.directory,
      `${Date.now()}_${prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}.yml`
    );

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, playbook);

    spinner.succeed(chalk.green(`Playbook saved to: ${outputPath}`));

    if (options.validate) {
      console.log(chalk.cyan('\nValidating playbook...'));
      const { validateCommand } = require('./validate');
      await validateCommand(outputPath, {});
    }

    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  cortexops validate ${outputPath}`));
    console.log(chalk.dim(`  cortexops deploy ${outputPath} -i inventory/hosts`));

  } catch (error) {
    spinner.fail(chalk.red('Generation failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

module.exports = { generateCommand };
