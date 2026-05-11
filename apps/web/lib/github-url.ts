export type ParsedRepo = { owner: string; repo: string } | null;

/** Parse a GitHub SSH or HTTPS URL into { owner, repo } */
export function parseGithubUrl(url: string): ParsedRepo {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // SSH: git@github.com:owner/repo.git  or  git@github.com:owner/repo
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^\s]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // HTTPS: https://github.com/owner/repo(.git)(/)
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/\s]+)\/([^\s/]+?)(?:\.git)?\/?$/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  return null;
}

export interface CloneCommands {
  https: string;
  ssh: string;
  cli: string;
}

/** Build the 3 clone command variants for a given owner/repo */
export function buildCloneCommands(owner: string, repo: string): CloneCommands {
  return {
    https: `git clone https://github.com/${owner}/${repo}.git`,
    ssh:   `git clone git@github.com:${owner}/${repo}.git`,
    cli:   `gh repo clone ${owner}/${repo}`,
  };
}
