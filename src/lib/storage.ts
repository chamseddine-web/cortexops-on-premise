import type { GeneratedPlaybook } from './playbookGenerator';

const STORAGE_KEY = 'ansible_playbook_history';
const MAX_HISTORY_ITEMS = 50;

export function savePlaybookToHistory(playbook: GeneratedPlaybook): void {
  try {
    const history = getPlaybookHistory();
    history.unshift(playbook);

    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save playbook to history:', error);
  }
}

export function getPlaybookHistory(): GeneratedPlaybook[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const history = JSON.parse(data);
    return history.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
  } catch (error) {
    console.error('Failed to load playbook history:', error);
    return [];
  }
}

export function deletePlaybookFromHistory(id: string): void {
  try {
    const history = getPlaybookHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete playbook from history:', error);
  }
}

export function clearPlaybookHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear playbook history:', error);
  }
}

export function exportHistory(): void {
  try {
    const history = getPlaybookHistory();
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ansible-playbook-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export history:', error);
  }
}
