const chalk = require('chalk');
const { apiRequest } = require('../utils/api');

async function statsCommand(options) {
  try {
    const response = await apiRequest(`/api/stats?period=${options.period}`);

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    const stats = await response.json();

    if (options.format === 'json') {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    console.log(chalk.cyan('\nUsage Statistics:\n'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.white(`Period: ${options.period}`));
    console.log(chalk.white(`Total Playbooks: ${stats.total_playbooks || 0}`));
    console.log(chalk.white(`API Calls: ${stats.total_api_calls || 0}`));
    console.log(chalk.white(`Storage Used: ${stats.storage_used_mb || 0} MB`));
    console.log(chalk.white(`Plan: ${stats.plan || 'free'}`));
    console.log(chalk.dim('─'.repeat(50)));

    if (stats.quota_percentage && stats.quota_percentage > 80) {
      console.log(chalk.yellow(`\n⚠️  You're using ${stats.quota_percentage}% of your quota`));
      console.log(chalk.dim('Consider upgrading your plan: https://cortexops.com/pricing'));
    }

  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { statsCommand };
