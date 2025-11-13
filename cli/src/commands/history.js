const chalk = require('chalk');
const { apiRequest } = require('../utils/api');

async function historyCommand(options) {
  try {
    const limit = options.all ? 1000 : parseInt(options.limit);
    const response = await apiRequest(`/api/history?limit=${limit}&filter=${options.filter || ''}`);

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }

    const history = await response.json();

    if (history.length === 0) {
      console.log(chalk.yellow('No history found'));
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(history, null, 2));
      return;
    }

    if (options.format === 'yaml') {
      const yaml = require('js-yaml');
      console.log(yaml.dump(history));
      return;
    }

    console.log(chalk.cyan('\nGeneration History:\n'));
    console.log(chalk.dim('─'.repeat(80)));

    history.forEach((item, index) => {
      console.log(chalk.white(`${index + 1}. ${item.prompt}`));
      console.log(chalk.dim(`   Date: ${new Date(item.created_at).toLocaleString()}`));
      console.log(chalk.dim(`   File: ${item.filename || 'N/A'}`));
      console.log(chalk.dim('─'.repeat(80)));
    });

    console.log(chalk.dim(`\nShowing ${history.length} entries`));

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { historyCommand };
