# CortexOps CLI Tool

## Installation

```bash
# Via npm (recommended)
npm install -g @cortexops/cli

# Via binary
curl -sSL https://install.cortexops.com | bash

# Via Docker
docker pull cortexops/cli:latest
alias cortexops='docker run --rm -v $(pwd):/workspace cortexops/cli:latest'

# Via Homebrew (macOS)
brew tap cortexops/tap
brew install cortexops

# Via apt (Debian/Ubuntu)
curl -fsSL https://apt.cortexops.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/cortexops.gpg
echo "deb [signed-by=/usr/share/keyrings/cortexops.gpg] https://apt.cortexops.com stable main" | sudo tee /etc/apt/sources.list.d/cortexops.list
sudo apt update && sudo apt install cortexops

# Verify installation
cortexops --version
```

## Quick Start

```bash
# Initialize configuration
cortexops init

# Configure API key
cortexops config set api-key ctx_live_xxxxxxxxxxxx

# Generate your first playbook
cortexops generate "Install nginx and configure SSL" -o nginx.yml

# Deploy it
cortexops deploy nginx.yml -i inventory/hosts
```

## Commands Reference

### Global Options

```
-v, --version        Output version
-h, --help          Show help
--config <path>     Config file path (default: ~/.cortexops/config.yml)
--no-color          Disable colored output
--verbose           Verbose logging
--debug             Debug mode
```

### Initialize

```bash
cortexops init [options]

Options:
  --api-key <key>      Set API key during init
  --environment <env>  Default environment (staging|production)
  --force              Overwrite existing configuration

Example:
  cortexops init --api-key ctx_live_xxx --environment production
```

### Configuration

```bash
cortexops config <command> [options]

Commands:
  set <key> <value>   Set configuration value
  get <key>           Get configuration value
  list                List all configuration
  reset               Reset to defaults
  edit                Open config in editor

Examples:
  cortexops config set api-key ctx_live_xxxxxxxxxxxx
  cortexops config set environment production
  cortexops config set output.directory ./playbooks
  cortexops config get api-key
  cortexops config list
```

### Generate Playbook

```bash
cortexops generate <prompt> [options]

Options:
  -o, --output <file>         Output file path
  -e, --environment <env>     Target environment (staging|production)
  --become                    Enable privilege escalation
  --no-gather-facts           Disable facts gathering
  --check-mode                Enable check mode
  --format <format>           Output format (yaml|json)
  --validate                  Validate before saving
  --preview                   Preview without saving
  --complexity <level>        Force complexity level (basic|intermediate|advanced)

Examples:
  cortexops generate "Deploy PostgreSQL HA cluster"
  cortexops generate "Hardening Linux CIS Level 2" -o hardening.yml
  cortexops generate "K8s cluster on AWS EKS" -e production --validate
  cortexops generate "Install nginx" --preview
```

### Interactive Mode

```bash
cortexops interactive [options]

Options:
  --examples          Show example prompts
  --no-validation     Skip validation

Example:
  cortexops interactive

Interactive session:
  ? What do you want to automate? Deploy Redis cluster with HA
  ? Environment: production
  ? Enable become? Yes
  ? Validate before saving? Yes
  ✅ Playbook generated: redis-ha.yml
```

### Validate Playbook

```bash
cortexops validate <file> [options]

Options:
  --ansible-lint      Run ansible-lint
  --yamllint          Run yamllint
  --syntax            Check syntax only
  --strict            Strict validation
  --fix               Auto-fix issues

Examples:
  cortexops validate playbook.yml
  cortexops validate playbook.yml --ansible-lint --yamllint
  cortexops validate playbook.yml --fix
```

### Deploy Playbook

```bash
cortexops deploy <file> [options]

Options:
  -i, --inventory <file>      Inventory file
  --check                     Dry-run mode
  --diff                      Show differences
  --limit <hosts>             Limit to specific hosts
  --tags <tags>               Run specific tags
  --skip-tags <tags>          Skip specific tags
  --vault-password-file <f>   Vault password file
  -e, --extra-vars <vars>     Extra variables

Examples:
  cortexops deploy playbook.yml -i inventory/hosts
  cortexops deploy playbook.yml -i inventory/production --check
  cortexops deploy playbook.yml -i hosts --tags "install,configure"
  cortexops deploy playbook.yml -i hosts -e "version=1.2.3 port=8080"
```

### History

```bash
cortexops history [options]

Options:
  --limit <n>         Show last n entries (default: 10)
  --all               Show all history
  --format <format>   Output format (table|json|yaml)
  --filter <filter>   Filter by prompt
  --export <file>     Export history to file

Examples:
  cortexops history
  cortexops history --limit 20
  cortexops history --filter "kubernetes"
  cortexops history --export history.json
```

### Export

```bash
cortexops export <file> [options]

Options:
  --git-repo <url>         Git repository URL
  --git-branch <branch>    Git branch (default: main)
  --git-commit-message <m> Commit message
  --directory <dir>        Export directory
  --format <format>        Export format (yaml|json|tar)

Examples:
  cortexops export playbook.yml --git-repo https://github.com/company/playbooks
  cortexops export playbook.yml --directory ./exported
  cortexops export playbook.yml --format tar --output playbooks.tar.gz
```

### CI/CD Generation

```bash
cortexops cicd generate [options]

Options:
  --provider <provider>   CI/CD provider (gitlab|jenkins|github)
  --output <file>         Output file
  --playbook <file>       Reference playbook

Examples:
  cortexops cicd generate --provider gitlab -o .gitlab-ci.yml
  cortexops cicd generate --provider github -o .github/workflows/deploy.yml
  cortexops cicd generate --provider jenkins -o Jenkinsfile
```

### Batch Generation

```bash
cortexops batch generate <input> [options]

Options:
  --output-dir <dir>      Output directory (default: ./playbooks)
  --format <format>       Input format (txt|json|yaml)
  --parallel <n>          Parallel jobs (default: 5)
  --fail-fast             Stop on first error

Input file format (prompts.txt):
  Install nginx and PHP 8.2
  Deploy PostgreSQL cluster
  Configure firewall UFW

Examples:
  cortexops batch generate prompts.txt --output-dir ./generated
  cortexops batch generate prompts.json --parallel 10
```

### Statistics

```bash
cortexops stats [options]

Options:
  --period <period>   Time period (day|week|month|all)
  --format <format>   Output format (table|json)

Example:
  cortexops stats --period month
```

### Update CLI

```bash
cortexops update [options]

Options:
  --check             Check for updates only
  --prerelease        Include pre-release versions

Examples:
  cortexops update --check
  cortexops update
```

### Login/Logout

```bash
# Login with API key
cortexops login <api-key>

# Login interactive
cortexops login

# Logout
cortexops logout

Examples:
  cortexops login ctx_live_xxxxxxxxxxxx
  cortexops logout
```

## Configuration File

Location: `~/.cortexops/config.yml`

```yaml
# API Configuration
api:
  base_url: https://api.cortexops.com/v1
  api_key: ctx_live_xxxxxxxxxxxx
  timeout: 30s
  retries: 3

# Default Settings
defaults:
  environment: production
  become: true
  gather_facts: true

# Output Configuration
output:
  format: yaml
  directory: ./playbooks
  filename_pattern: "{timestamp}_{prompt_slug}.yml"

# Validation Settings
validation:
  ansible_lint: true
  yamllint: true
  syntax_check: true
  auto_fix: false

# Git Integration
git:
  enabled: false
  auto_commit: false
  repo: https://github.com/company/playbooks
  branch: main
  commit_message_template: "Generated playbook: {prompt}"

# CI/CD Integration
cicd:
  default_provider: gitlab
  auto_generate: false

# Logging
logging:
  level: info
  file: ~/.cortexops/logs/cli.log
  max_size: 10MB
  max_age: 30

# Telemetry (can be disabled)
telemetry:
  enabled: true
  anonymous: true
```

## Environment Variables

```bash
# API Configuration
export CORTEXOPS_API_KEY=ctx_live_xxxxxxxxxxxx
export CORTEXOPS_API_URL=https://api.cortexops.com/v1

# Default Settings
export CORTEXOPS_ENVIRONMENT=production
export CORTEXOPS_OUTPUT_DIR=./playbooks

# Behavior
export CORTEXOPS_AUTO_UPDATE=true
export CORTEXOPS_TELEMETRY=false
export CORTEXOPS_COLOR=auto
```

## Shell Completion

```bash
# Bash
cortexops completion bash > /etc/bash_completion.d/cortexops

# Zsh
cortexops completion zsh > /usr/local/share/zsh/site-functions/_cortexops

# Fish
cortexops completion fish > ~/.config/fish/completions/cortexops.fish
```

## Examples

### Complete Workflow

```bash
# 1. Generate playbook
cortexops generate "Deploy Node.js app with Nginx" -o app-deploy.yml

# 2. Validate
cortexops validate app-deploy.yml --ansible-lint

# 3. Test in dry-run
cortexops deploy app-deploy.yml -i inventory/staging --check

# 4. Deploy to staging
cortexops deploy app-deploy.yml -i inventory/staging

# 5. Verify deployment
ansible-playbook -i inventory/staging verify.yml

# 6. Deploy to production
cortexops deploy app-deploy.yml -i inventory/production

# 7. Export to Git
cortexops export app-deploy.yml --git-repo https://github.com/company/playbooks
```

### Batch Generation

```bash
# Create prompts file
cat > prompts.txt <<EOF
Install and configure Nginx with SSL
Deploy PostgreSQL 15 with replication
Configure firewall UFW with custom rules
Install Docker and Docker Compose
Setup monitoring with Prometheus and Grafana
EOF

# Generate all playbooks
cortexops batch generate prompts.txt --output-dir ./playbooks

# Validate all
for file in ./playbooks/*.yml; do
  cortexops validate "$file"
done
```

### CI/CD Integration

```bash
# Generate GitLab CI configuration
cortexops cicd generate --provider gitlab

# Commit configuration
git add .gitlab-ci.yml
git commit -m "Add CI/CD pipeline"
git push

# Now GitLab will automatically:
# - Generate playbooks
# - Validate them
# - Deploy to staging/production
```

## Troubleshooting

### Check Version
```bash
cortexops --version
```

### Debug Mode
```bash
cortexops --debug generate "Install nginx"
```

### Check Configuration
```bash
cortexops config list
```

### Reset Configuration
```bash
cortexops config reset
```

### View Logs
```bash
tail -f ~/.cortexops/logs/cli.log
```

### Test API Connection
```bash
curl https://api.cortexops.com/v1/health \
  -H "X-API-Key: $(cortexops config get api-key)"
```

## Support

- Documentation: https://docs.cortexops.com/cli
- Issues: https://github.com/cortexops/cli/issues
- Email: support@cortexops.com
- Slack: cortexops.slack.com
