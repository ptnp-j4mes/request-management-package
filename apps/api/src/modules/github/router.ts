import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { projectGithubSettings, mitItems, users, projects } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI ?? "http://localhost:9898/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:9899";

// ── GitHub API helper ──────────────────────────────────────────────────────────

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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
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

// ── Router ─────────────────────────────────────────────────────────────────────

export const githubRouter = new Elysia()
  // ── OAuth: initiate ───────────────────────────────────────────────────────────
  .use(authenticate)
  .get("/auth/github/connect", ({ query, set, user }: any) => {
    if (!GITHUB_CLIENT_ID) {
      set.status = 500;
      return { error: "GITHUB_CLIENT_ID not configured" };
    }
    const projectId = query.projectId ?? "";
    const state = Buffer.from(JSON.stringify({ projectId, userId: user.id })).toString("base64url");
    const githubUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}` +
      `&scope=repo` +
      `&state=${state}`;
    set.redirect = githubUrl;
  })

  // ── OAuth: callback ──────────────────────────────────────────────────────────
  .get("/auth/github/callback", async ({ query, set }: any) => {
    const { code, state, error } = query;

    if (error) {
      set.redirect = `${FRONTEND_URL}?github_error=${encodeURIComponent(error)}`;
      return;
    }

    let projectId: number | null = null;
    let userId: number | null = null;
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
      projectId = Number(parsed.projectId) || null;
      userId = Number(parsed.userId) || null;
    } catch {
      set.redirect = `${FRONTEND_URL}?github_error=invalid_state`;
      return;
    }

    // Exchange code for access token
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

    // Upsert token into project_github_settings (only update token if settings already exist)
    if (projectId) {
      const [existing] = await db
        .select()
        .from(projectGithubSettings)
        .where(eq(projectGithubSettings.projectId, projectId));

      if (existing) {
        await db
          .update(projectGithubSettings)
          .set({ accessToken, connectedByUserId: userId, updatedAt: new Date() })
          .where(eq(projectGithubSettings.projectId, projectId));
      } else {
        // Create with placeholder repo info — user must fill in via PUT
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
      set.redirect = `${FRONTEND_URL}?github_connected=1`;
    }
  })

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

    // Mask token — only expose whether it's connected
    return ok({
      ...settings,
      isConnected: !!settings.isConnected,
    });
  })

  .use(authorize(["IT_MANAGER", "ADMIN"]))
  .put("/projects/:id/github-settings", async ({ params, body, user }: any) => {
    const projectId = Number(params.id);
    const { repoOwner, repoName, defaultBranch = "main" } = body as any;

    if (!repoOwner || !repoName) {
      return err("repoOwner and repoName are required");
    }

    const [existing] = await db
      .select()
      .from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, projectId));

    if (existing) {
      const [updated] = await db
        .update(projectGithubSettings)
        .set({ repoOwner, repoName, defaultBranch, updatedAt: new Date() })
        .where(eq(projectGithubSettings.projectId, projectId))
        .returning();
      return ok({ ...updated, accessToken: undefined, isConnected: !!updated.accessToken });
    } else {
      const [created] = await db
        .insert(projectGithubSettings)
        .values({ projectId, repoOwner, repoName, defaultBranch, connectedByUserId: user.id })
        .returning();
      return ok({ ...created, accessToken: undefined, isConnected: false });
    }
  })

  // ── Commits: by project ────────────────────────────────────────────────────────
  .get("/projects/:id/commits", async ({ params, query }: any) => {
    const [settings] = await db
      .select()
      .from(projectGithubSettings)
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

  // ── Commits: by MIT item (filtered by assigned developer's GitHub username) ────
  .get("/mit-items/:id/commits", async ({ params }: any) => {
    const [mitRow] = await db
      .select({
        projectId: mitItems.projectId,
        githubUsername: users.githubUsername,
        ownerName: users.fullName,
      })
      .from(mitItems)
      .leftJoin(users, eq(users.id, mitItems.currentOwnerUserId))
      .where(eq(mitItems.id, Number(params.id)));

    if (!mitRow) return err("MIT item not found");

    const [settings] = await db
      .select()
      .from(projectGithubSettings)
      .where(eq(projectGithubSettings.projectId, mitRow.projectId));

    if (!settings) return err("GitHub not configured for this project");
    if (!settings.accessToken) return err("GitHub token not connected — please complete OAuth");
    if (!settings.repoOwner || !settings.repoName) return err("GitHub repo not configured");

    try {
      const commits = await fetchGithubCommits(
        settings.accessToken,
        settings.repoOwner,
        settings.repoName,
        settings.defaultBranch,
        mitRow.githubUsername,
      );
      return ok({
        repo: `${settings.repoOwner}/${settings.repoName}`,
        branch: settings.defaultBranch,
        filterBy: mitRow.githubUsername ?? null,
        ownerName: mitRow.ownerName,
        commits,
      });
    } catch (e: any) {
      return err(e.message ?? "Failed to fetch commits");
    }
  });
