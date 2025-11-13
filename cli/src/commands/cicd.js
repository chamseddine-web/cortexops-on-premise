const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');

const TEMPLATES = {
  gitlab: `stages:
  - generate
  - validate
  - deploy

generate_playbook:
  stage: generate
  image: alpine:latest
  before_script:
    - apk add --no-cache nodejs npm
    - npm install -g @cortexops/cli
  script:
    - cortexops generate "$PLAYBOOK_PROMPT" -o playbook.yml
  artifacts:
    paths:
      - playbook.yml

validate_playbook:
  stage: validate
  image: cytopia/ansible:latest
  script:
    - ansible-lint playbook.yml
    - ansible-playbook --syntax-check playbook.yml
  dependencies:
    - generate_playbook

deploy_staging:
  stage: deploy
  image: cytopia/ansible:latest
  script:
    - ansible-playbook -i inventory/staging playbook.yml
  dependencies:
    - validate_playbook
  only:
    - develop

deploy_production:
  stage: deploy
  image: cytopia/ansible:latest
  script:
    - ansible-playbook -i inventory/production playbook.yml
  dependencies:
    - validate_playbook
  only:
    - main
  when: manual
`,

  github: `name: Deploy with CortexOps

on:
  push:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install CortexOps CLI
        run: npm install -g @cortexops/cli

      - name: Generate Playbook
        env:
          CORTEXOPS_API_KEY: \${{ secrets.CORTEXOPS_API_KEY }}
        run: cortexops generate "$PLAYBOOK_PROMPT" -o playbook.yml

      - name: Upload Playbook
        uses: actions/upload-artifact@v3
        with:
          name: playbook
          path: playbook.yml

  validate:
    runs-on: ubuntu-latest
    needs: generate
    steps:
      - uses: actions/checkout@v3

      - name: Download Playbook
        uses: actions/download-artifact@v3
        with:
          name: playbook

      - name: Install Ansible
        run: |
          pip install ansible ansible-lint

      - name: Validate Playbook
        run: |
          ansible-lint playbook.yml
          ansible-playbook --syntax-check playbook.yml

  deploy:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v3

      - name: Download Playbook
        uses: actions/download-artifact@v3
        with:
          name: playbook

      - name: Deploy Playbook
        run: ansible-playbook -i inventory/\${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }} playbook.yml
`,

  jenkins: `pipeline {
    agent any

    environment {
        CORTEXOPS_API_KEY = credentials('cortexops-api-key')
    }

    stages {
        stage('Generate') {
            steps {
                sh 'npm install -g @cortexops/cli'
                sh 'cortexops generate "$PLAYBOOK_PROMPT" -o playbook.yml'
                archiveArtifacts artifacts: 'playbook.yml'
            }
        }

        stage('Validate') {
            steps {
                sh 'ansible-lint playbook.yml'
                sh 'ansible-playbook --syntax-check playbook.yml'
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh 'ansible-playbook -i inventory/staging playbook.yml'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                sh 'ansible-playbook -i inventory/production playbook.yml'
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
`,
};

async function cicdCommand(options) {
  const spinner = ora('Generating CI/CD configuration...').start();

  try {
    const provider = options.provider || 'gitlab';

    if (!TEMPLATES[provider]) {
      spinner.fail(chalk.red(`Unknown provider: ${provider}`));
      console.log(chalk.dim('Available providers: gitlab, github, jenkins'));
      process.exit(1);
    }

    const template = TEMPLATES[provider];
    let outputFile = options.output;

    if (!outputFile) {
      outputFile = {
        gitlab: '.gitlab-ci.yml',
        github: '.github/workflows/deploy.yml',
        jenkins: 'Jenkinsfile',
      }[provider];
    }

    const outputDir = outputFile.includes('/') ? outputFile.split('/').slice(0, -1).join('/') : null;
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, template);

    spinner.succeed(chalk.green(`✓ Generated ${provider} CI/CD configuration: ${outputFile}`));
    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  1. Set CORTEXOPS_API_KEY in your CI/CD secrets`));
    console.log(chalk.dim(`  2. Commit and push: git add ${outputFile} && git commit && git push`));

  } catch (error) {
    spinner.fail(chalk.red('Generation failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { cicdCommand };
