/**
 * Git Integration System
 * Supports GitHub and GitLab repository exports
 */

export type GitProvider = 'github' | 'gitlab';

export interface GitConfig {
  provider: GitProvider;
  token: string;
  owner: string; // GitHub username or GitLab username/group
  repo: string;
  branch?: string;
}

export interface GitFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface GitCommit {
  message: string;
  branch: string;
  files: GitFile[];
}

export interface GitRepository {
  id: string;
  name: string;
  full_name: string;
  description: string;
  url: string;
  default_branch: string;
  private: boolean;
}

/**
 * GitHub Integration
 */
export class GitHubIntegration {
  private baseUrl = 'https://api.github.com';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * List user repositories
   */
  async listRepositories(): Promise<GitRepository[]> {
    const response = await fetch(`${this.baseUrl}/user/repos?per_page=100&sort=updated`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repos = await response.json();

    return repos.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      default_branch: repo.default_branch,
      private: repo.private
    }));
  }

  /**
   * Create a new repository
   */
  async createRepository(name: string, description: string, isPrivate: boolean = false): Promise<GitRepository> {
    const response = await fetch(`${this.baseUrl}/user/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create repository');
    }

    const repo = await response.json();

    return {
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      default_branch: repo.default_branch,
      private: repo.private
    };
  }

  /**
   * Commit files to repository
   */
  async commitFiles(config: GitConfig, commit: GitCommit): Promise<string> {
    const { owner, repo, branch = 'main' } = config;

    // Get current branch reference
    const refResponse = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!refResponse.ok) {
      throw new Error(`Failed to get branch reference: ${refResponse.statusText}`);
    }

    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;

    // Get base tree
    const treeResponse = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const treeData = await treeResponse.json();
    const baseTreeSha = treeData.tree.sha;

    // Create blobs for each file
    const blobPromises = commit.files.map(async (file) => {
      const blobResponse = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding || 'utf-8'
          })
        }
      );

      const blob = await blobResponse.json();

      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      };
    });

    const tree = await Promise.all(blobPromises);

    // Create new tree
    const newTreeResponse = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree
        })
      }
    );

    const newTree = await newTreeResponse.json();

    // Create commit
    const commitResponse = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commit.message,
          tree: newTree.sha,
          parents: [latestCommitSha]
        })
      }
    );

    const newCommit = await commitResponse.json();

    // Update reference
    await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommit.sha
        })
      }
    );

    return newCommit.sha;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    config: GitConfig,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<string> {
    const { owner, repo } = config;

    const response = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          body,
          head,
          base
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create pull request: ${response.statusText}`);
    }

    const pr = await response.json();
    return pr.html_url;
  }
}

/**
 * GitLab Integration
 */
export class GitLabIntegration {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl: string = 'https://gitlab.com/api/v4') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  /**
   * List user projects
   */
  async listProjects(): Promise<GitRepository[]> {
    const response = await fetch(`${this.baseUrl}/projects?owned=true&per_page=100`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    const projects = await response.json();

    return projects.map((project: any) => ({
      id: project.id.toString(),
      name: project.name,
      full_name: project.path_with_namespace,
      description: project.description || '',
      url: project.web_url,
      default_branch: project.default_branch,
      private: project.visibility === 'private'
    }));
  }

  /**
   * Create a new project
   */
  async createProject(name: string, description: string, isPrivate: boolean = false): Promise<GitRepository> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        visibility: isPrivate ? 'private' : 'public',
        initialize_with_readme: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }

    const project = await response.json();

    return {
      id: project.id.toString(),
      name: project.name,
      full_name: project.path_with_namespace,
      description: project.description || '',
      url: project.web_url,
      default_branch: project.default_branch,
      private: project.visibility === 'private'
    };
  }

  /**
   * Commit files to project
   */
  async commitFiles(config: GitConfig, commit: GitCommit): Promise<string> {
    const projectId = encodeURIComponent(`${config.owner}/${config.repo}`);
    const { branch = 'main' } = config;

    const actions = commit.files.map(file => ({
      action: 'create',
      file_path: file.path,
      content: file.content,
      encoding: file.encoding || 'text'
    }));

    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/repository/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch,
          commit_message: commit.message,
          actions
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to commit files');
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Create a merge request
   */
  async createMergeRequest(
    config: GitConfig,
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch: string = 'main'
  ): Promise<string> {
    const projectId = encodeURIComponent(`${config.owner}/${config.repo}`);

    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/merge_requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title,
          description
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create merge request: ${response.statusText}`);
    }

    const mr = await response.json();
    return mr.web_url;
  }
}

/**
 * Git Integration Factory
 */
export function createGitIntegration(provider: GitProvider, token: string, baseUrl?: string) {
  switch (provider) {
    case 'github':
      return new GitHubIntegration(token);
    case 'gitlab':
      return new GitLabIntegration(token, baseUrl);
    default:
      throw new Error(`Unsupported Git provider: ${provider}`);
  }
}

/**
 * Export playbook to Git repository
 */
export async function exportPlaybookToGit(
  provider: GitProvider,
  token: string,
  config: GitConfig,
  playbookContent: string,
  playbookName: string,
  commitMessage?: string
): Promise<string> {
  const integration = createGitIntegration(provider, token);

  const commit: GitCommit = {
    message: commitMessage || `Add/Update ${playbookName}`,
    branch: config.branch || 'main',
    files: [
      {
        path: `playbooks/${playbookName}.yml`,
        content: playbookContent,
        encoding: 'utf-8'
      }
    ]
  };

  return await integration.commitFiles(config, commit);
}
