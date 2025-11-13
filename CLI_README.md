# @cortexops/cli

CortexOps CLI - Generate Ansible playbooks with AI from the command line.

## Installation

```bash
npm install -g @cortexops/cli
```

## Quick Start

```bash
# Initialize configuration
cortexops init

# Login with your API key
cortexops login

# Generate your first playbook
cortexops generate "Install nginx and configure SSL" -o nginx.yml

# Validate it
cortexops validate nginx.yml

# Deploy it
cortexops deploy nginx.yml -i inventory/hosts
```

## Commands

### init

Initialize CortexOps configuration:

```bash
cortexops init [--api-key <key>] [--environment <env>] [--force]
```

### login / logout

Authenticate with your API key:

```bash
cortexops login [api-key]
cortexops logout
```

### generate

Generate Ansible playbook from prompt:

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
  --complexity <level>        Force complexity level
```

### interactive

Interactive playbook generation:

```bash
cortexops interactive [--examples] [--no-validation]
```

### validate

Validate playbook:

```bash
cortexops validate <file> [options]

Options:
  --ansible-lint      Run ansible-lint
  --yamllint          Run yamllint
  --syntax            Check syntax only
  --strict            Strict validation
  --fix               Auto-fix issues
```

### deploy

Deploy playbook with Ansible:

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
```

### history

Show generation history:

```bash
cortexops history [options]

Options:
  --limit <n>         Show last n entries (default: 10)
  --all               Show all history
  --format <format>   Output format (table|json|yaml)
  --filter <filter>   Filter by prompt
  --export <file>     Export history to file
```

### export

Export playbook to Git or directory:

```bash
cortexops export <file> [options]

Options:
  --git-repo <url>            Git repository URL
  --git-branch <branch>       Git branch (default: main)
  --git-commit-message <m>    Commit message
  --directory <dir>           Export directory
  --format <format>           Export format (yaml|json|tar)
```

### cicd

Generate CI/CD configuration:

```bash
cortexops cicd generate [options]

Options:
  --provider <provider>   CI/CD provider (gitlab|jenkins|github)
  --output <file>         Output file
  --playbook <file>       Reference playbook
```

### batch

Batch generation from file:

```bash
cortexops batch generate <input> [options]

Options:
  --output-dir <dir>      Output directory (default: ./playbooks)
  --format <format>       Input format (txt|json|yaml)
  --parallel <n>          Parallel jobs (default: 5)
  --fail-fast             Stop on first error
```

### stats

Show usage statistics:

```bash
cortexops stats [--period <period>] [--format <format>]
```

### config

Manage configuration:

```bash
cortexops config <command> [args...]

Commands:
  set <key> <value>   Set configuration value
  get <key>           Get configuration value
  list                List all configuration
  reset               Reset to defaults
```

### update

Update CLI to latest version:

```bash
cortexops update [--check] [--prerelease]
```

## Configuration

Configuration is stored in `~/.cortexops/config.json`

### Environment Variables

```bash
export CORTEXOPS_API_KEY=ctx_live_xxxxxxxxxxxx
export CORTEXOPS_API_URL=https://api.cortexops.com/v1
export CORTEXOPS_ENVIRONMENT=production
export CORTEXOPS_OUTPUT_DIR=./playbooks
```

## Examples

### Complete Workflow

```bash
# Generate
cortexops generate "Deploy Node.js app" -o app.yml

# Validate
cortexops validate app.yml --ansible-lint

# Test in staging
cortexops deploy app.yml -i inventory/staging --check

# Deploy to production
cortexops deploy app.yml -i inventory/production
```

### Batch Generation

```bash
# Create prompts.txt
cat > prompts.txt <<EOF
Install nginx with SSL
Deploy PostgreSQL cluster
Configure firewall UFW
EOF

# Generate all
cortexops batch generate prompts.txt --output-dir ./playbooks
```

### CI/CD Integration

```bash
# Generate GitLab CI
cortexops cicd generate --provider gitlab

# Commit and push
git add .gitlab-ci.yml
git commit -m "Add CI/CD"
git push
```

## Support

- Documentation: https://docs.cortexops.com/cli
- Issues: https://github.com/cortexops/cli/issues
- Email: support@cortexops.com

## License

MIT
