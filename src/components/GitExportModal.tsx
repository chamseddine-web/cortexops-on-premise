import { useState } from 'react';
import { X, Github, GitBranch, Lock, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportPlaybookToGit, GitProvider, GitConfig } from '../lib/gitIntegration';

interface GitExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbookContent: string;
  playbookName: string;
}

export function GitExportModal({ isOpen, onClose, playbookContent, playbookName }: GitExportModalProps) {
  const [provider, setProvider] = useState<GitProvider>('github');
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState(`Add ${playbookName} playbook`);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const config: GitConfig = {
        provider,
        token,
        owner,
        repo,
        branch
      };

      const commitSha = await exportPlaybookToGit(
        provider,
        token,
        config,
        playbookContent,
        playbookName,
        commitMessage
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('git_exports').insert({
          user_id: user.id,
          provider,
          repository: `${owner}/${repo}`,
          branch,
          commit_sha: commitSha,
          playbook_name: playbookName
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to export to Git');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <GitBranch className="text-cyan-400" size={24} />
              Export vers Git
            </h2>
            <p className="text-sm text-slate-400 mt-1">Exportez votre playbook vers GitHub ou GitLab</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleExport} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Plateforme Git
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('github')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === 'github'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <Github className={`mx-auto mb-2 ${provider === 'github' ? 'text-cyan-400' : 'text-slate-400'}`} size={32} />
                <p className="text-sm font-semibold text-white">GitHub</p>
              </button>
              <button
                type="button"
                onClick={() => setProvider('gitlab')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === 'gitlab'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <GitBranch className={`mx-auto mb-2 ${provider === 'gitlab' ? 'text-cyan-400' : 'text-slate-400'}`} size={32} />
                <p className="text-sm font-semibold text-white">GitLab</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Token d'accès personnel
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={provider === 'github' ? 'ghp_xxxxxxxxxxxxx' : 'glpat-xxxxxxxxxxxxx'}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              {provider === 'github' ? (
                <>Créez un token sur <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">GitHub Settings</a></>
              ) : (
                <>Créez un token sur <a href="https://gitlab.com/-/profile/personal_access_tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">GitLab Settings</a></>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Propriétaire / Organisation
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="username"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nom du dépôt
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="ansible-playbooks"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Branche
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Message de commit
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isPrivate
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-slate-600 bg-slate-800 text-slate-400'
              }`}
            >
              {isPrivate ? <Lock size={18} /> : <Globe size={18} />}
              <span className="text-sm font-medium">
                {isPrivate ? 'Privé' : 'Public'}
              </span>
            </button>
            <p className="text-xs text-slate-400">
              {isPrivate
                ? 'Le dépôt sera visible uniquement par vous'
                : 'Le dépôt sera visible publiquement'
              }
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <AlertCircle className="text-red-400" size={20} />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
              <CheckCircle className="text-green-400" size={20} />
              <p className="text-sm text-green-400">Playbook exporté avec succès!</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isLoading ? 'Export en cours...' : success ? 'Exporté !' : 'Exporter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
