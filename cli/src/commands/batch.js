const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');
const { generateCommand } = require('./generate');

async function batchCommand(input, options) {
  const spinner = ora('Reading prompts...').start();

  try {
    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    const content = fs.readFileSync(input, 'utf8');
    let prompts = [];

    if (options.format === 'txt') {
      prompts = content.split('\n').filter(line => line.trim());
    } else if (options.format === 'json') {
      prompts = JSON.parse(content);
    } else if (options.format === 'yaml') {
      const yaml = require('js-yaml');
      prompts = yaml.load(content);
    }

    spinner.succeed(chalk.green(`✓ Found ${prompts.length} prompts`));

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    const parallel = parseInt(options.parallel);
    const results = { success: 0, failed: 0, errors: [] };

    console.log(chalk.cyan(`\nGenerating ${prompts.length} playbooks...\n`));

    for (let i = 0; i < prompts.length; i += parallel) {
      const batch = prompts.slice(i, i + parallel);
      const promises = batch.map(async (prompt, index) => {
        const num = i + index + 1;
        try {
          console.log(chalk.dim(`[${num}/${prompts.length}] Generating: ${prompt.slice(0, 50)}...`));

          await generateCommand(prompt, {
            output: `${options.outputDir}/playbook-${num}.yml`,
          });

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({ prompt, error: error.message });

          if (options.failFast) {
            throw error;
          }
        }
      });

      await Promise.all(promises);
    }

    console.log(chalk.green(`\n✓ Batch generation completed`));
    console.log(chalk.dim(`Success: ${results.success}, Failed: ${results.failed}`));

    if (results.errors.length > 0) {
      console.log(chalk.yellow('\nErrors:'));
      results.errors.forEach(({ prompt, error }) => {
        console.log(chalk.red(`  - ${prompt}: ${error}`));
      });
    }

  } catch (error) {
    spinner.fail(chalk.red('Batch generation failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { batchCommand };
