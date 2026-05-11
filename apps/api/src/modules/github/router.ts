import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { projectGithubSettings, systemGithubAccount, mitItems, users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI ?? "http://localhost:9898/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:9899";

// ── GitHub API helpers ─────────────────────────────────────────────────────────

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
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function fetchGithubCommits(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  author?: string | null,
  perPage = 50,
) {
  const params = new URLSearchParams({ per_page: String(perPage), sha: branch });
  if (author) params.set("author", author);

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?${params}`, {
    headers: GH_HEADERS(accessToken),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  const commits = (await res.json()) as any[];
  return commits.map((c) => ({
    sha: c.sha.slice(0, 7),
    fullSha: c.sha,
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name ?? null,
    githubUsername: c.author?.login ?? null,
    committedAt: c.commit.author?.date ?? null,
    htmlUrl: c.html_url,
  }));
}

// Resolve GitHub token: project token first, fallback to system account
async function resolveSettings(projectId: number) {
  const [ps] = await db
    .select()
    .from(projectGithubSettings)
    .where(eq(projectGithubSettings.projectId, projectId));

  if (ps?.accessToken && ps.repoOwner && ps.repoName) {
    return { token: ps.accessToken, owner: ps.repoOwner, repo: ps.repoName, branch: ps.defaultBranch };
  }

  // Fallback: system account (needs project settings for owner/repo)
  const [sys] = await db.select().from(systemGithubAccount).limit(1);
  if (sys?.accessToken && ps?.repoOwner && ps?.repoName) {
    return { token: sys.accessToken, owner: ps.repoOwner, repo: ps.repoName, branch: ps.defaultBranch };
  }

  throw new Error("No GitHub token available — connect GitHub in Settings or Project");
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const githubRouter = new Elysia()
  .use(authenticate)

  // ── OAuth: initiate (project-level) ──────────────────────────────────────────
  .get("/auth/github/connect", ({ query, set, user }: any) => {
    if (!GITHUB_CLIENT_ID) {
      set.status = 500;
      return { error: "GITHUB_CLIENT_ID not configured" };
    }
    const projectId = query.projectId ?? "";
    const isSystem = query.system === "true";
    const state = Buffer.from(
      JSON.stringify({ projectId, userId: user.id, isSystem }),
    ).toString("base64url");
    const githubUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}` +
      `&scope=repo` +
      `&state=${state}`;
    set.redirect = githubUrl;
  })

  // ── OAuth: callback ───────────────────────────────────────────────────────────
  .get("/auth/github/callback", async ({ query, set }: any) => {
    const { code, state, error } = query;

    if (error) {
      set.redirect = `${FRONTEND_URL}?github_error=${encodeURIComponent(error)}`;
      return;
    }

    let projectId: number | null = null;
    let userId: number | null = null;
    let isSystem = false;
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
      projectId = Number(parsed.projectId) || null;
      userId = Number(parsed.userId) || null;
      isSystem = !!parsed.isSystem;
    } catch {
      set.redirect = `${FRONTEND_URL}?github_error=invalid_state`;
      return;
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      set.redirect = `${FRONTEND_URL}?github_error=token_exchange_failed`;
      return;
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken: string = tokenData.access_token;

    if (!accessToken) {
      set.redirect = `${FRONTEND_URL}?github_error=${encodeURIComponent(tokenData.error ?? "no_token")}`;
      return;
    }

    // Get GitHub username from /user
    let githubUsername: string | null = null;
    try {
      const uRes = await fetch("https://api.github.com/user", { headers: GH_HEADERS(accessToken) });
      if (uRes.ok) githubUsername = ((await uRes.json()) as any).login ?? null;
    } catch { /* ignore */ }

    if (isSystem) {
      // Upsert system github account
      const [existing] = await db.select().from(systemGithubAccount).limit(1);
      if (existing) {
        await db.update(systemGithubAccount)
          .set({ accessToken, githubUsername, connectedByUserId: userId, updatedAt: new Date() })
          .where(eq(systemGithubAccount.id, existing.id));
      } else {
        await db.insert(systemGithubAccount)
          .values({ label: "default", accessToken, githubUsername, connectedByUserId: userId });
      }
      set.redirect = `${FRONTEND_URL}/settings?tab=github&connected=system`;
      return;
    }

    if (projectId) {
      const [existing] = await db
        .select()
        .from(projectGithubSettings)
        .where(eq(projectGithubSettings.projectId, projectId));

      if (existing) {
        await db.update(projectGithubSettings)
          .set({ accessToken, connectedByUserId: userId, updatedAt: new Date() })
          .where(eq(projectGithubSettings.projectId, projectId));
      } else {
        await db.insert(projectGithubSettings).values({
          projectId,
          repoOwner: "",
          repoName: "",
          defaultBranch: "main",
          accessToken,
          connectedByUserId: userId,
        });
      }
      set.redirect = `${FRONTEND_URL}/projects/${projectId}?tab=github&connected=1`;
    } else {
      set.redirect = `${FRONTEND_URL}/settings?tab=github&connected=1`;
    }
  })

  // ── System GitHub Account (ADMIN) ─────────────────────────────────────────────
  .get("/settings/github-account", async () => {
    const [account] = await db.select().from(systemGithubAccount).limit(1);
    if (!account) return ok(null);
    const { accessToken: _, ...safe } = account;
    return ok({ ...safe, isConnected: !!account.accessToken });
  })

  .use(new Elysia().use(authorize(["ADMIN"])).put("/settings/github-account", async ({ body, user }: any) => {
    const { label = "default", githubUsername, accessToken } = body as any;
    const [existing] = await db.select().from(systemGithubAccount).limit(1);
    if (existing) {
      const updateData: any = { label, githubUsername, updatedAt: new Date(), connectedByUserId: user.id };
      if (accessToken) updateData.accessToken = accessToken;
      const [updated] = await db.update(systemGithubAccount)
        .set(updateData)
        .where(eq(systemGithubAccount.id, existing.id))
        .returning();
      const { accessToken: _, ...safe } = updated;
      return ok({ ...safe, isConnected: !!updated.accessToken });
    } else {
      const [created] = await db.insert(systemGithubAccount)
        .values({ label, githubUsername, accessToken, connectedByUserId: user.id })
        .returning();
      const { accessToken: _, ...safe } = created;
      return ok({ ...safe, isConnected: !!created.accessToken });
    }
  }))

  // ── Project GitHub settings ───────────────────────────────────────────────────
  .get("/projects/:id/github-settings", async ({ params }: any) => {
    const [settings] = await db
      .select({
        id: projectGithubSettings.id,
        projectId: projectGithubSettings.projectId,
        repoOwner: projectGithubSettings.repoOwner,
        repoName: projectGithubSettings.repoName,
        defaultBranch: projectGithubSettings.defaultBranch,
        connectedByUserId: projectGithubSettings.connectedByUserId,
        isConnected: projectGithubSettings.accessToken,
        createdAt: projectGithubSettings.createdAt,
        updatedAt: projectGithubSettings.updatedAt,
      })
      .from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, Number(params.id)));

    if (!settings) return ok(null);
    return ok({ ...settings, isConnected: !!settings.isConnected });
  })

  .use(new Elysia().use(authorize(["IT_MANAGER", "ADMIN"]))
    .put("/projects/:id/github-settings", async ({ params, body, user }: any) => {
      const projectId = Number(params.id);
      const { repoOwner, repoName, defaultBranch = "main" } = body as any;

      if (!repoOwner || !repoName) return err("repoOwner and repoName are required");

      const [existing] = await db.select().from(projectGithubSettings)
        .where(eq(projectGithubSettings.projectId, projectId));

      if (existing) {
        const [updated] = await db.update(projectGithubSettings)
          .set({ repoOwner, repoName, defaultBranch, updatedAt: new Date() })
          .where(eq(projectGithubSettings.projectId, projectId))
          .returning();
        return ok({ ...updated, accessToken: undefined, isConnected: !!updated.accessToken });
      } else {
        const [created] = await db.insert(projectGithubSettings)
          .values({ projectId, repoOwner, repoName, defaultBranch, connectedByUserId: user.id })
          .returning();
        return ok({ ...created, accessToken: undefined, isConnected: false });
      }
    })
  )

  // ── Commits: by project ───────────────────────────────────────────────────────
  .get("/projects/:id/commits", async ({ params, query }: any) => {
    const [settings] = await db.select().from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, Number(params.id)));

    if (!settings) return err("GitHub not configured for this project");
    if (!settings.accessToken) return err("GitHub token not connected — please complete OAuth");
    if (!settings.repoOwner || !settings.repoName) return err("GitHub repo not configured");

    try {
      const commits = await fetchGithubCommits(
        settings.accessToken,
        settings.repoOwner,
        settings.repoName,
        settings.defaultBranch,
        query.author ?? null,
      );
      return ok(commits);
    } catch (e: any) {
      return err(e.message ?? "Failed to fetch commits");
    }
  })

  // ── Commits: by MIT item ──────────────────────────────────────────────────────
  .get("/mit-items/:id/commits", async ({ params }: any) => {
    const [mitRow] = await db
      .select({
        projectId: mitItems.projectId,
        githubBranchName: mitItems.githubBranchName,
        githubUsername: users.githubUsername,
        ownerName: users.fullName,
      })
      .from(mitItems)
      .leftJoin(users, eq(users.id, mitItems.currentOwnerUserId))
      .where(eq(mitItems.id, Number(params.id)));

    if (!mitRow) return err("MIT item not found");

    const [settings] = await db.select().from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, mitRow.projectId));

    // Try to get token (project or system)
    let token: string | null = settings?.accessToken ?? null;
    if (!token) {
      const [sys] = await db.select().from(systemGithubAccount).limit(1);
      token = sys?.accessToken ?? null;
    }

    if (!token) return err("GitHub not connected — set up in Settings or Project");
    if (!settings?.repoOwner || !settings?.repoName) return err("GitHub repo not configured");

    // Use MIT branch if linked, otherwise default branch
    const branch = mitRow.githubBranchName ?? settings.defaultBranch;

    try {
      const commits = await fetchGithubCommits(
        token,
        settings.repoOwner,
        settings.repoName,
        branch,
        // Only filter by author when on default branch (not MIT branch)
        mitRow.githubBranchName ? null : mitRow.githubUsername,
      );
      return ok({
        repo: `${settings.repoOwner}/${settings.repoName}`,
        branch,
        filterBy: mitRow.githubBranchName ? null : (mitRow.githubUsername ?? null),
        ownerName: mitRow.ownerName,
        commits,
      });
    } catch (e: any) {
      return err(e.message ?? "Failed to fetch commits");
    }
  })

  // ── Git Operations on MIT Items ───────────────────────────────────────────────

  // POST /mit-items/:id/github/create-branch
  .post("/mit-items/:id/github/create-branch", async ({ params, body }: any) => {
    const mitId = Number(params.id);
    const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
    if (!mit) return err("MIT item not found");
    if (mit.githubBranchName) return err(`Branch already exists: ${mit.githubBranchName}`);

    let cfg;
    try { cfg = await resolveSettings(mit.projectId); } catch (e: any) { return err(e.message); }

    const branchName: string = (body as any)?.branchName
      ?? `mit/${mit.mitNo.toLowerCase().replace(/\s+/g, "-")}`;

    try {
      // Get SHA of default branch HEAD
      const refData = await ghFetch(cfg.token, "GET",
        `/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${cfg.branch}`);
      const sha: string = refData.object.sha;

      // Create new branch
      await ghFetch(cfg.token, "POST",
        `/repos/${cfg.owner}/${cfg.repo}/git/refs`, {
          ref: `refs/heads/${branchName}`,
          sha,
        });

      // Save to DB
      await db.update(mitItems)
        .set({ githubBranchName: branchName, updatedAt: new Date() })
        .where(eq(mitItems.id, mitId));

      return ok({ branchName, baseSha: sha.slice(0, 7) });
    } catch (e: any) {
      return err(e.message);
    }
  })

  // POST /mit-items/:id/github/create-pr
  .post("/mit-items/:id/github/create-pr", async ({ params, body }: any) => {
    const mitId = Number(params.id);
    const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
    if (!mit) return err("MIT item not found");
    if (!mit.githubBranchName) return err("No branch linked — create a branch first");
    if (mit.githubPrNumber) return err(`PR already exists: #${mit.githubPrNumber}`);

    let cfg;
    try { cfg = await resolveSettings(mit.projectId); } catch (e: any) { return err(e.message); }

    try {
      const pr = await ghFetch(cfg.token, "POST",
        `/repos/${cfg.owner}/${cfg.repo}/pulls`, {
          title: (body as any)?.title ?? `[${mit.mitNo}] ${mit.title}`,
          body: (body as any)?.body ?? `Auto-generated PR for MIT item **${mit.mitNo}**: ${mit.title}`,
          head: mit.githubBranchName,
          base: cfg.branch,
        });

      await db.update(mitItems)
        .set({ githubPrUrl: pr.html_url, githubPrNumber: pr.number, updatedAt: new Date() })
        .where(eq(mitItems.id, mitId));

      return ok({ prUrl: pr.html_url, prNumber: pr.number, title: pr.title });
    } catch (e: any) {
      return err(e.message);
    }
  })

  // POST /mit-items/:id/github/merge-pr
  .post("/mit-items/:id/github/merge-pr", async ({ params }: any) => {
    const mitId = Number(params.id);
    const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
    if (!mit) return err("MIT item not found");
    if (!mit.githubPrNumber) return err("No PR linked — create a PR first");

    let cfg;
    try { cfg = await resolveSettings(mit.projectId); } catch (e: any) { return err(e.message); }

    try {
      await ghFetch(cfg.token, "PUT",
        `/repos/${cfg.owner}/${cfg.repo}/pulls/${mit.githubPrNumber}/merge`, {
          merge_method: "squash",
          commit_title: `[${mit.mitNo}] ${mit.title}`,
        });

      return ok({ merged: true, prNumber: mit.githubPrNumber });
    } catch (e: any) {
      return err(e.message);
    }
  })

  // ── Create GitHub Repo for a Project ─────────────────────────────────────────
  // POST /projects/:id/github/create-repo
  .post("/projects/:id/github/create-repo", async ({ params, body, user }: any) => {
    const projectId = Number(params.id);
    const { repoName, repoOwner, isPrivate = false, description = "" } = body as any;

    if (!repoName) return err("repoName is required");

    // Resolve token: project token → system account
    let token: string | null = null;
    const [ps] = await db.select().from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, projectId));
    if (ps?.accessToken) token = ps.accessToken;
    if (!token) {
      const [sys] = await db.select().from(systemGithubAccount).limit(1);
      token = sys?.accessToken ?? null;
    }
    if (!token) return err("No GitHub token — set up a system GitHub account in Settings first");

    try {
      // Use /orgs/:owner/repos if repoOwner specified, otherwise /user/repos
      const endpoint = repoOwner ? `/orgs/${repoOwner}/repos` : `/user/repos`;
      const repo = await ghFetch(token, "POST", endpoint, {
        name: repoName,
        private: isPrivate,
        description,
        auto_init: true,
        gitignore_template: "Node",
      });

      const owner: string = repo.owner.login;
      const name: string = repo.name;
      const defaultBranch: string = repo.default_branch ?? "main";

      // Upsert project_github_settings
      const [existing] = await db.select().from(projectGithubSettings)
        .where(eq(projectGithubSettings.projectId, projectId));

      if (existing) {
        await db.update(projectGithubSettings)
          .set({ repoOwner: owner, repoName: name, defaultBranch, updatedAt: new Date() })
          .where(eq(projectGithubSettings.projectId, projectId));
      } else {
        await db.insert(projectGithubSettings)
          .values({ projectId, repoOwner: owner, repoName: name, defaultBranch, connectedByUserId: user.id });
      }

      return ok({
        repoOwner: owner,
        repoName: name,
        defaultBranch,
        htmlUrl: repo.html_url,
        sshUrl: repo.ssh_url,
        cloneUrl: repo.clone_url,
        isPrivate: repo.private,
      });
    } catch (e: any) {
      return err(e.message ?? "Failed to create GitHub repository");
    }
  })

  // DELETE /mit-items/:id/github/delete-branch
  .delete("/mit-items/:id/github/delete-branch", async ({ params }: any) => {
    const mitId = Number(params.id);
    const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
    if (!mit) return err("MIT item not found");
    if (!mit.githubBranchName) return err("No branch linked");

    let cfg;
    try { cfg = await resolveSettings(mit.projectId); } catch (e: any) { return err(e.message); }

    try {
      await ghFetch(cfg.token, "DELETE",
        `/repos/${cfg.owner}/${cfg.repo}/git/refs/heads/${mit.githubBranchName}`);
    } catch (e: any) {
      // If branch not found on GitHub, still clear from DB
      if (!e.message.includes("422") && !e.message.includes("Reference does not exist")) {
        return err(e.message);
      }
    }

    await db.update(mitItems)
      .set({ githubBranchName: null, githubPrUrl: null, githubPrNumber: null, updatedAt: new Date() })
      .where(eq(mitItems.id, mitId));

    return ok({ deleted: true });
  });
