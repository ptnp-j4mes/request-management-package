import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { projectGithubSettings, projects, systemGithubAccount } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

async function ghFetch(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: GH_HEADERS(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function resolveProjectGithub(projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new Error("Project not found");

  const [settings] = await db
    .select()
    .from(projectGithubSettings)
    .where(eq(projectGithubSettings.projectId, projectId));

  if (!settings?.repoOwner || !settings?.repoName) {
    throw new Error("GitHub repo not configured for this project");
  }

  const [systemAccount] = await db.select().from(systemGithubAccount).limit(1);
  const token = settings.accessToken ?? systemAccount?.accessToken ?? null;
  const tokenSource = settings.accessToken ? "project" : systemAccount?.accessToken ? "system" : null;

  if (!token) {
    throw new Error("GitHub token not connected — connect project or system GitHub account first");
  }

  return {
    project,
    token,
    tokenSource,
    repoOwner: settings.repoOwner,
    repoName: settings.repoName,
    defaultBranch: settings.defaultBranch ?? "main",
  };
}

function compactCommit(commit: any) {
  return {
    sha: commit.sha?.slice(0, 7),
    fullSha: commit.sha,
    message: commit.commit?.message?.split("\n")[0] ?? "",
    authorName: commit.commit?.author?.name ?? null,
    authorEmail: commit.commit?.author?.email ?? null,
    authorGithub: commit.author?.login ?? null,
    committerName: commit.commit?.committer?.name ?? null,
    committerEmail: commit.commit?.committer?.email ?? null,
    committerGithub: commit.committer?.login ?? null,
    committedAt: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
    htmlUrl: commit.html_url,
  };
}

function compactPullRequest(pr: any) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    isDraft: pr.draft ?? false,
    authorGithub: pr.user?.login ?? null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    closedAt: pr.closed_at,
    mergedAt: pr.merged_at,
    mergedByGithub: pr.merged_by?.login ?? null,
    headBranch: pr.head?.ref ?? null,
    baseBranch: pr.base?.ref ?? null,
    htmlUrl: pr.html_url,
  };
}

type CommitRow = ReturnType<typeof compactCommit>;
type PullRequestRow = ReturnType<typeof compactPullRequest>;

function buildActorSummary(commits: CommitRow[], pullRequests: PullRequestRow[]) {
  const byActor = new Map<
    string,
    {
      actor: string;
      commitCount: number;
      prOpenedCount: number;
      prMergedCount: number;
      lastActivityAt: string | null;
    }
  >();

  function touch(
    actor: string | null | undefined,
    date: string | null | undefined,
    key: "commitCount" | "prOpenedCount" | "prMergedCount",
  ) {
    const name = actor || "unknown";
    const row =
      byActor.get(name) ?? {
        actor: name,
        commitCount: 0,
        prOpenedCount: 0,
        prMergedCount: 0,
        lastActivityAt: null,
      };

    row[key] += 1;

    if (date && (!row.lastActivityAt || new Date(date).getTime() > new Date(row.lastActivityAt).getTime())) {
      row.lastActivityAt = date;
    }

    byActor.set(name, row);
  }

  for (const commit of commits) {
    touch(commit.authorGithub ?? commit.authorName ?? commit.authorEmail, commit.committedAt, "commitCount");
  }

  for (const pr of pullRequests) {
    touch(pr.authorGithub, pr.createdAt, "prOpenedCount");
    if (pr.mergedAt) touch(pr.mergedByGithub ?? pr.authorGithub, pr.mergedAt, "prMergedCount");
  }

  return Array.from(byActor.values()).sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  });
}

export const gitReportsRouter = new Elysia({ prefix: "/reports/git" })
  .use(authenticate)
  .use(authorize(["ADMIN", "IT_MANAGER", "BA", "FULLSTACK"]))
  .get("/by-project", async ({ query }: any) => {
    const projectId = Number(query.projectId);
    if (!projectId || Number.isNaN(projectId)) return err("projectId is required");

    const perPage = Math.min(Math.max(Number(query.perPage ?? 50), 1), 100);
    const prLimit = Math.min(Math.max(Number(query.prLimit ?? 30), 1), 100);
    const prState = ["open", "closed", "all"].includes(query.prState) ? query.prState : "all";

    let cfg: Awaited<ReturnType<typeof resolveProjectGithub>>;
    try {
      cfg = await resolveProjectGithub(projectId);
    } catch (e: any) {
      return err(e.message ?? "GitHub report configuration error");
    }

    const branch = query.branch || cfg.defaultBranch;

    try {
      const commitParams = new URLSearchParams({ per_page: String(perPage), sha: branch });
      const rawCommits = (await ghFetch(
        cfg.token,
        "GET",
        `/repos/${cfg.repoOwner}/${cfg.repoName}/commits?${commitParams.toString()}`,
      )) as any[];

      const prParams = new URLSearchParams({
        state: prState,
        sort: "updated",
        direction: "desc",
        per_page: String(prLimit),
      });
      const rawPulls = (await ghFetch(
        cfg.token,
        "GET",
        `/repos/${cfg.repoOwner}/${cfg.repoName}/pulls?${prParams.toString()}`,
      )) as any[];

      const detailedPulls = await Promise.all(
        rawPulls.slice(0, prLimit).map(async (pr) => {
          try {
            return await ghFetch(cfg.token, "GET", `/repos/${cfg.repoOwner}/${cfg.repoName}/pulls/${pr.number}`);
          } catch {
            return pr;
          }
        }),
      );

      const commits = rawCommits.map(compactCommit);
      const pullRequests = detailedPulls.map(compactPullRequest);
      const actorSummary = buildActorSummary(commits, pullRequests);

      return ok({
        project: {
          id: cfg.project.id,
          projectCode: cfg.project.projectCode,
          projectName: cfg.project.projectName,
        },
        repo: {
          owner: cfg.repoOwner,
          name: cfg.repoName,
          fullName: `${cfg.repoOwner}/${cfg.repoName}`,
          defaultBranch: cfg.defaultBranch,
          branch,
          tokenSource: cfg.tokenSource,
        },
        summary: {
          commitCount: commits.length,
          prCount: pullRequests.length,
          openPrCount: pullRequests.filter((pr) => pr.state === "open").length,
          mergedPrCount: pullRequests.filter((pr) => !!pr.mergedAt).length,
          actorCount: actorSummary.length,
        },
        actors: actorSummary,
        commits,
        pullRequests,
      });
    } catch (e: any) {
      return err(e.message ?? "Failed to load GitHub report");
    }
  });
