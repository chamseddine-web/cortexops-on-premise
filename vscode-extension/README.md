# CortexOps Ansible Generator

Generate Ansible playbooks with AI directly in VSCode.

## Features

- **Quick Generation**: Press `Ctrl+Alt+G` to generate playbooks from natural language prompts
- **Generate from Selection**: Select text and press `Ctrl+Alt+Shift+G` to convert it to a playbook
- **Real-time Validation**: Automatic YAML validation as you type
- **Intelligent Snippets**: 20+ Ansible snippets for faster development
- **Preview Panel**: Review generated playbooks before inserting
- **Deploy from VSCode**: Deploy playbooks directly from the editor

## Installation

1. Install from VSCode Marketplace: Search "CortexOps Ansible Generator"
2. Configure your API key: `File → Preferences → Settings → CortexOps`
3. Start generating playbooks!

## Quick Start

### Generate a Playbook

1. Press `Ctrl+Alt+G` (or `Cmd+Alt+G` on macOS)
2. Enter your prompt: "Install nginx and configure SSL"
3. Preview the generated playbook
4. Click "Accept" to insert

### Generate from Selection

1. Write a comment describing what you need:
   ```yaml
   # Install PostgreSQL 15 with replication setup
   ```
2. Select the comment
3. Press `Ctrl+Alt+Shift+G`
4. Playbook generated below the comment

### Use Snippets

Type `ansible-` and browse available snippets:
- `ansible-task` - Basic task
- `ansible-playbook` - Complete playbook
- `ansible-service` - Service management
- `ansible-package` - Package installation
- And 15+ more...

## Configuration

Open VSCode Settings (`Ctrl+,`) and search for "CortexOps":

```json
{
  "cortexops.apiKey": "ctx_live_xxxxxxxxxxxx",
  "cortexops.apiUrl": "https://api.cortexops.com/v1",
  "cortexops.defaultEnvironment": "production",
  "cortexops.autoValidate": true,
  "cortexops.showPreview": true
}
```

## Keybindings

| Command | Windows/Linux | macOS |
|---------|--------------|--------|
| Generate Playbook | `Ctrl+Alt+G` | `Cmd+Alt+G` |
| Generate from Selection | `Ctrl+Alt+Shift+G` | `Cmd+Alt+Shift+G` |
| Validate | `Ctrl+Alt+V` | `Cmd+Alt+V` |
| Format | `Ctrl+Alt+F` | `Cmd+Alt+F` |
| Deploy | `Ctrl+Alt+D` | `Cmd+Alt+D` |

## Commands

Access via Command Palette (`Ctrl+Shift+P`):

- `CortexOps: Generate Playbook`
- `CortexOps: Generate from Selection`
- `CortexOps: Generate Role`
- `CortexOps: Validate Current File`
- `CortexOps: Format Playbook`
- `CortexOps: Deploy Playbook`
- `CortexOps: Show History`
- `CortexOps: Export to Git`
- `CortexOps: Show Statistics`
- `CortexOps: Open Documentation`

## Requirements

- VSCode 1.80.0 or higher
- CortexOps API key (get one at https://cortexops.com)
- Optional: Ansible installed for deployment features

## Get API Key

1. Visit https://cortexops.com
2. Sign up for a free account
3. Navigate to Settings → API Keys
4. Generate a new API key
5. Copy and paste into VSCode settings

## Support

- Documentation: https://docs.cortexops.com/vscode
- Issues: https://github.com/cortexops/vscode-extension/issues
- Email: support@cortexops.com

## License

MIT
