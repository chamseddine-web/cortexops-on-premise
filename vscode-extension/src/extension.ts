import * as vscode from 'vscode';
import axios from 'axios';
import * as yaml from 'js-yaml';

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('CortexOps extension activated');

    outputChannel = vscode.window.createOutputChannel('CortexOps');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(rocket) CortexOps';
    statusBarItem.tooltip = 'CortexOps Ansible Generator';
    statusBarItem.show();

    context.subscriptions.push(
        vscode.commands.registerCommand('cortexops.generatePlaybook', generatePlaybook),
        vscode.commands.registerCommand('cortexops.generateFromSelection', generateFromSelection),
        vscode.commands.registerCommand('cortexops.generateRole', generateRole),
        vscode.commands.registerCommand('cortexops.validatePlaybook', validatePlaybook),
        vscode.commands.registerCommand('cortexops.formatPlaybook', formatPlaybook),
        vscode.commands.registerCommand('cortexops.deployPlaybook', deployPlaybook),
        vscode.commands.registerCommand('cortexops.showHistory', showHistory),
        vscode.commands.registerCommand('cortexops.exportToGit', exportToGit),
        vscode.commands.registerCommand('cortexops.showStats', showStats),
        vscode.commands.registerCommand('cortexops.openDocs', openDocs),
        statusBarItem,
        outputChannel
    );

    vscode.window.showInformationMessage('CortexOps: Ready to generate Ansible playbooks!');
}

async function generatePlaybook() {
    const config = vscode.workspace.getConfiguration('cortexops');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
        const result = await vscode.window.showErrorMessage(
            'CortexOps API key not configured',
            'Configure Now'
        );
        if (result === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'cortexops.apiKey');
        }
        return;
    }

    const prompt = await vscode.window.showInputBox({
        prompt: 'Describe the automation task',
        placeHolder: 'e.g., Install nginx and configure SSL with Let\'s Encrypt',
        validateInput: (value) => {
            return value.length < 5 ? 'Prompt too short' : null;
        }
    });

    if (!prompt) {
        return;
    }

    await generateAndInsertPlaybook(prompt);
}

async function generateFromSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const selection = editor.selection;
    const prompt = editor.document.getText(selection);

    if (!prompt) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    await generateAndInsertPlaybook(prompt, editor, selection);
}

async function generateAndInsertPlaybook(
    prompt: string,
    editor?: vscode.TextEditor,
    selection?: vscode.Selection
) {
    const config = vscode.workspace.getConfiguration('cortexops');
    const apiKey = config.get<string>('apiKey');
    const apiUrl = config.get<string>('apiUrl');
    const environment = config.get<string>('defaultEnvironment');

    statusBarItem.text = '$(loading~spin) Generating...';
    outputChannel.appendLine(`Generating playbook for: ${prompt}`);

    try {
        const response = await axios.post(
            `${apiUrl}/api/generate-playbook`,
            {
                prompt,
                environment,
                become: true,
                gather_facts: true
            },
            {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const playbookYaml = response.data.yaml;

        if (config.get<boolean>('showPreview')) {
            const result = await showPreviewDialog(playbookYaml, prompt);
            if (!result) {
                statusBarItem.text = '$(rocket) CortexOps';
                return;
            }
        }

        if (editor && selection) {
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, playbookYaml);
            });
        } else {
            const doc = await vscode.workspace.openTextDocument({
                content: playbookYaml,
                language: 'yaml'
            });
            await vscode.window.showTextDocument(doc);
        }

        statusBarItem.text = '$(rocket) CortexOps';
        outputChannel.appendLine('Playbook generated successfully');
        vscode.window.showInformationMessage('Playbook generated successfully!');

        if (config.get<boolean>('autoValidate')) {
            await validatePlaybook();
        }

    } catch (error: any) {
        statusBarItem.text = '$(error) CortexOps';
        const errorMsg = error.response?.data?.message || error.message;
        outputChannel.appendLine(`Error: ${errorMsg}`);
        vscode.window.showErrorMessage(`Generation failed: ${errorMsg}`);
    }
}

async function showPreviewDialog(content: string, prompt: string): Promise<boolean> {
    const panel = vscode.window.createWebviewPanel(
        'cortexopsPreview',
        'Preview: ' + prompt.substring(0, 50),
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    panel.webview.html = getPreviewHtml(content);

    return new Promise((resolve) => {
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'accept') {
                    panel.dispose();
                    resolve(true);
                } else if (message.command === 'reject') {
                    panel.dispose();
                    resolve(false);
                }
            }
        );

        panel.onDidDispose(() => {
            resolve(false);
        });
    });
}

function getPreviewHtml(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        pre {
            background: #252526;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .actions {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            border: none;
            border-radius: 4px;
        }
        .accept {
            background: #0e639c;
            color: white;
        }
        .reject {
            background: #d73a49;
            color: white;
        }
        button:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <h2>Generated Playbook Preview</h2>
    <pre>${escapeHtml(content)}</pre>
    <div class="actions">
        <button class="reject" onclick="reject()">Cancel</button>
        <button class="accept" onclick="accept()">Accept & Insert</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function accept() {
            vscode.postMessage({ command: 'accept' });
        }
        function reject() {
            vscode.postMessage({ command: 'reject' });
        }
    </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function generateRole() {
    const roleName = await vscode.window.showInputBox({
        prompt: 'Enter role name',
        placeHolder: 'e.g., webserver',
        validateInput: (value) => {
            return /^[a-z0-9_-]+$/.test(value) ? null : 'Invalid role name';
        }
    });

    if (!roleName) {
        return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    vscode.window.showInformationMessage(`Creating role: ${roleName}...`);
}

async function validatePlaybook() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    outputChannel.appendLine('Validating playbook...');

    try {
        const content = editor.document.getText();
        yaml.load(content);
        vscode.window.showInformationMessage('✓ Playbook is valid YAML');
        outputChannel.appendLine('Validation passed');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Validation failed: ${error.message}`);
        outputChannel.appendLine(`Validation failed: ${error.message}`);
    }
}

async function formatPlaybook() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    try {
        const content = editor.document.getText();
        const parsed = yaml.load(content);
        const formatted = yaml.dump(parsed, { indent: 2, lineWidth: 120 });

        await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(content.length)
            );
            editBuilder.replace(fullRange, formatted);
        });

        vscode.window.showInformationMessage('Playbook formatted');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Format failed: ${error.message}`);
    }
}

async function deployPlaybook() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const inventory = await vscode.window.showInputBox({
        prompt: 'Enter inventory file path',
        placeHolder: 'e.g., inventory/hosts'
    });

    if (!inventory) {
        return;
    }

    const terminal = vscode.window.createTerminal('CortexOps Deploy');
    terminal.show();
    terminal.sendText(`ansible-playbook ${editor.document.uri.fsPath} -i ${inventory}`);
}

async function showHistory() {
    vscode.window.showInformationMessage('History feature coming soon!');
}

async function exportToGit() {
    vscode.window.showInformationMessage('Git export feature coming soon!');
}

async function showStats() {
    const config = vscode.workspace.getConfiguration('cortexops');
    const apiKey = config.get<string>('apiKey');
    const apiUrl = config.get<string>('apiUrl');

    try {
        const response = await axios.get(`${apiUrl}/api/stats?period=month`, {
            headers: { 'X-API-Key': apiKey }
        });

        const stats = response.data;
        vscode.window.showInformationMessage(
            `Usage: ${stats.total_playbooks || 0} playbooks generated this month`
        );
    } catch (error) {
        vscode.window.showErrorMessage('Failed to fetch statistics');
    }
}

async function openDocs() {
    vscode.env.openExternal(vscode.Uri.parse('https://docs.cortexops.com/vscode'));
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
