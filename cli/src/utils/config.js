const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.cortexops', 'config.json');

async function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return getDefaultConfig();
    }

    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading config:', error.message);
    return getDefaultConfig();
  }
}

async function saveConfig(config) {
  const configDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getDefaultConfig() {
  return {
    api: {
      base_url: process.env.CORTEXOPS_API_URL || 'https://api.cortexops.com/v1',
      api_key: process.env.CORTEXOPS_API_KEY || '',
      timeout: 30000,
      retries: 3,
    },
    defaults: {
      environment: process.env.CORTEXOPS_ENVIRONMENT || 'production',
      become: true,
      gather_facts: true,
    },
    output: {
      format: 'yaml',
      directory: process.env.CORTEXOPS_OUTPUT_DIR || './playbooks',
      filename_pattern: '{timestamp}_{prompt_slug}.yml',
    },
    validation: {
      ansible_lint: true,
      yamllint: true,
      syntax_check: true,
      auto_fix: false,
    },
    git: {
      enabled: false,
      auto_commit: false,
      repo: '',
      branch: 'main',
      commit_message_template: 'Generated playbook: {prompt}',
    },
    cicd: {
      default_provider: 'gitlab',
      auto_generate: false,
    },
    logging: {
      level: 'info',
      file: path.join(os.homedir(), '.cortexops', 'logs', 'cli.log'),
      max_size: '10MB',
      max_age: 30,
    },
    telemetry: {
      enabled: process.env.CORTEXOPS_TELEMETRY !== 'false',
      anonymous: true,
    },
  };
}

module.exports = { getConfig, saveConfig, getDefaultConfig };
