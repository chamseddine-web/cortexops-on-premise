# CortexOps VSCode Extension

## Installation

### Via VSCode Marketplace
1. Open VSCode
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search "CortexOps Ansible Generator"
4. Click Install

### Via Command Line
```bash
code --install-extension cortexops.ansible-generator
```

### Manual Installation
1. Download `.vsix` from [releases](https://github.com/cortexops/vscode-extension/releases)
2. Open VSCode
3. `Ctrl+Shift+P` → "Extensions: Install from VSIX"
4. Select downloaded file

## Configuration

### Settings (File → Preferences → Settings → CortexOps)

```json
{
  // API Configuration
  "cortexops.apiKey": "ctx_live_xxxxxxxxxxxx",
  "cortexops.apiUrl": "https://api.cortexops.com/v1",

  // Generation Settings
  "cortexops.defaultEnvironment": "production",
  "cortexops.autoValidate": true,
  "cortexops.autoFormat": true,
  "cortexops.showPreview": true,

  // Editor Settings
  "cortexops.enableSnippets": true,
  "cortexops.enableInlineGeneration": true,
  "cortexops.enableHoverInfo": true,

  // Validation
  "cortexops.lintOnSave": true,
  "cortexops.lintProvider": "ansible-lint",
  "cortexops.showLintWarnings": true,

  // Git Integration
  "cortexops.gitIntegration": true,
  "cortexops.autoCommit": false,
  "cortexops.gitRepo": "https://github.com/company/playbooks",

  // AI Settings
  "cortexops.useHybridMode": false,
  "cortexops.localModels": ["codellama:7b"],

  // UI
  "cortexops.theme": "dark",
  "cortexops.fontSize": 14
}
```

## Features

### 1. Quick Generate
**Shortcut:** `Ctrl+Alt+G` (Windows/Linux) or `Cmd+Alt+G` (macOS)

1. Press shortcut
2. Enter prompt in command palette
3. Preview generated playbook
4. Accept or regenerate

### 2. Generate from Selection
**Shortcut:** `Ctrl+Alt+Shift+G`

1. Select text describing automation task
2. Right-click → "CortexOps: Generate from Selection"
3. Playbook generated inline

### 3. Inline Generation
Type `ansible:` and start describing:
```
ansible: install nginx and configure SSL with Let's Encrypt
```
Press `Tab` → Full playbook generated

### 4. Snippet Library
Auto-completion with `ansible-` prefix:

- `ansible-task` → Task template
- `ansible-handler` → Handler template
- `ansible-role` → Complete role structure
- `ansible-play` → Play template
- `ansible-vault` → Vault encrypted variable
- `ansible-loop` → Loop template
- `ansible-when` → Conditional template
- `ansible-block` → Block/Rescue template

### 5. Real-time Validation
- Ansible Lint integration
- YAML Lint integration
- Syntax checking
- Instant error highlighting
- Quick fixes

### 6. Hover Information
Hover over Ansible modules to see:
- Module documentation
- Parameters
- Examples
- Best practices

### 7. Preview Panel
Split-view preview before generation:
- Syntax highlighting
- Collapsible sections
- Line numbers
- Search functionality

### 8. Git Integration
- Auto-commit generated playbooks
- Push to remote repository
- Branch management
- Commit message templates

## Commands

Access via Command Palette (`Ctrl+Shift+P`):

### Generation Commands
- `CortexOps: Generate Playbook` - Generate new playbook
- `CortexOps: Generate from Selection` - Generate from selected text
- `CortexOps: Generate Role` - Generate Ansible role
- `CortexOps: Generate Inventory` - Generate inventory file
- `CortexOps: Generate Variables` - Generate variables file

### Validation Commands
- `CortexOps: Validate Current File` - Validate active file
- `CortexOps: Validate Workspace` - Validate all playbooks
- `CortexOps: Fix Lint Issues` - Auto-fix issues
- `CortexOps: Format Playbook` - Format YAML

### Deployment Commands
- `CortexOps: Deploy Playbook` - Deploy to environment
- `CortexOps: Dry Run` - Test without changes
- `CortexOps: Deploy with Tags` - Deploy specific tags

### Utility Commands
- `CortexOps: Show History` - View generation history
- `CortexOps: Export to Git` - Export and push to Git
- `CortexOps: Generate CI/CD Config` - Generate CI/CD pipeline
- `CortexOps: Show Statistics` - View usage stats
- `CortexOps: Open Documentation` - Open docs
- `CortexOps: Check for Updates` - Update extension

## Keybindings

### Default Keybindings

| Command | Windows/Linux | macOS |
|---------|--------------|--------|
| Generate Playbook | `Ctrl+Alt+G` | `Cmd+Alt+G` |
| Generate from Selection | `Ctrl+Alt+Shift+G` | `Cmd+Alt+Shift+G` |
| Validate Current File | `Ctrl+Alt+V` | `Cmd+Alt+V` |
| Format Playbook | `Ctrl+Alt+F` | `Cmd+Alt+F` |
| Deploy Playbook | `Ctrl+Alt+D` | `Cmd+Alt+D` |
| Show Preview | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Toggle Snippets | `Ctrl+Alt+S` | `Cmd+Alt+S` |

### Custom Keybindings

File → Preferences → Keyboard Shortcuts → Search "CortexOps"

Example `keybindings.json`:
```json
[
  {
    "key": "ctrl+alt+g",
    "command": "cortexops.generatePlaybook",
    "when": "editorTextFocus"
  },
  {
    "key": "ctrl+alt+v",
    "command": "cortexops.validatePlaybook",
    "when": "resourceExtname == .yml || resourceExtname == .yaml"
  },
  {
    "key": "ctrl+alt+d",
    "command": "cortexops.deployPlaybook",
    "when": "resourceFilename =~ /playbook.*\\.yml$/"
  }
]
```

## Workflows

### Workflow 1: Quick Generation
```
1. Ctrl+Alt+G
2. Type: "Deploy PostgreSQL HA cluster"
3. Preview appears
4. Press Enter to accept
5. File saved as postgres-ha.yml
6. Auto-validated
```

### Workflow 2: Generate from Comment
```yaml
# I need to install nginx and configure reverse proxy for Node.js app

# Select the comment above
# Ctrl+Alt+Shift+G
# Playbook generated below comment
```

### Workflow 3: Interactive Generation
```
1. Create new file: nginx-deploy.yml
2. Type: ansible: install nginx with SSL
3. Press Tab
4. Full playbook appears
5. Customize as needed
6. Save (auto-validates)
```

### Workflow 4: Role Generation
```
1. Ctrl+Shift+P → "CortexOps: Generate Role"
2. Enter role name: "webserver"
3. Complete role structure created:
   roles/
   └── webserver/
       ├── tasks/
       │   └── main.yml
       ├── handlers/
       │   └── main.yml
       ├── templates/
       ├── files/
       ├── vars/
       │   └── main.yml
       ├── defaults/
       │   └── main.yml
       └── meta/
           └── main.yml
```

### Workflow 5: Deploy from VSCode
```
1. Open playbook.yml
2. Ctrl+Alt+D
3. Select inventory
4. Choose environment
5. Confirm deployment
6. View output in terminal
```

## UI Components

### Sidebar Panel
- Recent generations
- Favorites
- Templates
- History
- Statistics

### Status Bar
- API connection status
- Current environment
- Validation status
- Generation count

### Output Panel
- Generation logs
- Validation results
- Deployment output
- Error messages

## Snippets Reference

### Task Snippets
```yaml
# ansible-task
- name: ${1:Task description}
  ${2:module}:
    ${3:parameter}: ${4:value}

# ansible-shell
- name: ${1:Execute command}
  shell: |
    ${2:command}
  register: ${3:result}
  changed_when: false

# ansible-copy
- name: ${1:Copy file}
  copy:
    src: ${2:source}
    dest: ${3:destination}
    mode: '${4:0644}'
    owner: ${5:root}
    group: ${6:root}
```

### Handler Snippets
```yaml
# ansible-handler
- name: ${1:Handler name}
  ${2:service}:
    name: ${3:service_name}
    state: ${4:restarted}
```

### Block Snippets
```yaml
# ansible-block
- name: ${1:Block description}
  block:
    ${2:# tasks here}
  rescue:
    ${3:# rescue tasks}
  always:
    ${4:# always tasks}
```

## Integration with Other Extensions

### Recommended Extensions
- YAML by Red Hat
- Ansible by Red Hat
- GitLens
- Docker
- Kubernetes

### Compatibility
Works seamlessly with:
- Remote-SSH
- Remote-Containers
- WSL
- Codespaces

## Troubleshooting

### Extension Not Working
1. Check API key: `Ctrl+Shift+P` → "CortexOps: Show Config"
2. Verify connection: Check status bar icon
3. View logs: Output panel → CortexOps
4. Restart VSCode

### Generation Fails
1. Check API limits in status bar
2. Verify prompt is technical
3. Try simpler prompt
4. Check internet connection

### Validation Issues
1. Install ansible-lint: `pip install ansible-lint`
2. Install yamllint: `pip install yamllint`
3. Configure paths in settings
4. Restart extension

### Performance Issues
1. Disable auto-validation
2. Reduce history size
3. Disable preview
4. Use local models

## API Rate Limits

Status bar shows remaining requests:
- 🟢 Green: >80% remaining
- 🟡 Yellow: 20-80% remaining
- 🔴 Red: <20% remaining

## Privacy

- Prompts sent to API (Zero retention)
- No code uploaded
- Telemetry opt-out available
- Local mode available

## Updates

Auto-updates enabled by default.

Manual update:
1. `Ctrl+Shift+P`
2. "Extensions: Check for Extension Updates"
3. Update CortexOps

## Support

- Documentation: https://docs.cortexops.com/vscode
- Issues: https://github.com/cortexops/vscode-extension/issues
- Email: support@cortexops.com
- Slack: cortexops.slack.com

## Changelog

### v1.2.0 (Latest)
- ✨ Hybrid AI mode
- ✨ Real-time collaboration
- 🐛 Fixed validation issues
- ⚡ Performance improvements

### v1.1.0
- ✨ Git integration
- ✨ Deploy from VSCode
- 🐛 Bug fixes

### v1.0.0
- 🎉 Initial release
- ✨ Generate playbooks
- ✨ Validation
- ✨ Snippets
