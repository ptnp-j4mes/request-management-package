import { Elysia } from "elysia";
import { db } from "../../lib/db";
import {
  googleBotAccounts,
  googleBotAccountSessions,
  projectMeetingSettings,
  projectMeetings,
  meetingBotLogs,
  meetingActionItems,
} from "@rm/db";
import { ok, paginated, err } from "../../lib/response";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

// ── helpers ──────────────────────────────────────────────────────────────────

async function getMeeting(meetingId: number) {
  const [m] = await db.select().from(projectMeetings).where(eq(projectMeetings.id, meetingId));
  return m ?? null;
}

async function getOrCreateSettings(projectId: number) {
  const [existing] = await db
    .select()
    .from(projectMeetingSettings)
    .where(eq(projectMeetingSettings.projectId, projectId));
  if (existing) return existing;
  const [created] = await db
    .insert(projectMeetingSettings)
    .values({ projectId })
    .returning();
  return created;
}

// ── router ───────────────────────────────────────────────────────────────────
// NOTE: project segment uses ":id" to match the existing projectsRouter param name.
//       Meeting segment uses ":meetingId" to disambiguate.

export const meetingsRouter = new Elysia()
  .use(authenticate)

  // ══ A. Project Meeting Settings ══════════════════════════════════════════

  .get("/projects/:id/meeting-settings", async ({ params }: any) => {
    const settings = await getOrCreateSettings(Number(params.id));
    return ok(settings);
  })

  .use(
    new Elysia()
      .use(authorize(["IT_MANAGER", "ADMIN"]))
      .put("/projects/:id/meeting-settings", async ({ params, body }: any) => {
        const settings = await getOrCreateSettings(Number(params.id));
        const [updated] = await db
          .update(projectMeetingSettings)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(projectMeetingSettings.id, settings.id))
          .returning();
        return ok(updated);
      }),
  )

  // ══ B. Project Meetings CRUD ═════════════════════════════════════════════

  .get("/projects/:id/meetings", async ({ params, query }: any) => {
    const projectId = Number(params.id);
    const page = Number(query?.page ?? 1);
    const limit = Number(query?.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(projectMeetings.projectId, projectId)];
    if (query?.botStatus) conditions.push(eq(projectMeetings.botStatus, query.botStatus));
    if (query?.syncStatus) conditions.push(eq(projectMeetings.syncStatus, query.syncStatus));
    if (query?.summaryStatus) conditions.push(eq(projectMeetings.summaryStatus, query.summaryStatus));

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: count() }).from(projectMeetings).where(where);
    const items = await db
      .select()
      .from(projectMeetings)
      .where(where)
      .orderBy(desc(projectMeetings.startAt))
      .limit(limit)
      .offset(offset);

    return paginated(items, total, page, limit);
  })

  .get("/projects/:id/meetings/:meetingId", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) {
      return err("Meeting not found");
    }
    const logs = await db
      .select()
      .from(meetingBotLogs)
      .where(eq(meetingBotLogs.meetingId, meeting.id))
      .orderBy(desc(meetingBotLogs.createdAt))
      .limit(100);
    const actionItems = await db
      .select()
      .from(meetingActionItems)
      .where(eq(meetingActionItems.meetingId, meeting.id));
    return ok({ ...meeting, logs, actionItems });
  })

  .use(
    new Elysia()
      .use(authorize(["IT_MANAGER", "BA", "ADMIN"]))

      .post("/projects/:id/meetings", async ({ params, body, user }: any) => {
        const values = {
          ...body,
          projectId: Number(params.id),
          createdBy: user.id,
          startAt: new Date(body.startAt),
          endAt: body.endAt ? new Date(body.endAt) : undefined,
        };
        const [created] = await db.insert(projectMeetings).values(values).returning();
        return ok(created);
      })

      .put("/projects/:id/meetings/:meetingId", async ({ params, body }: any) => {
        const meeting = await getMeeting(Number(params.meetingId));
        if (!meeting || meeting.projectId !== Number(params.id)) {
          return err("Meeting not found");
        }
        const [updated] = await db
          .update(projectMeetings)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(projectMeetings.id, meeting.id))
          .returning();
        return ok(updated);
      })

      .delete("/projects/:id/meetings/:meetingId", async ({ params, set }: any) => {
        const meeting = await getMeeting(Number(params.meetingId));
        if (!meeting || meeting.projectId !== Number(params.id)) {
          return err("Meeting not found");
        }
        await db.delete(projectMeetings).where(eq(projectMeetings.id, meeting.id));
        set.status = 204;
        return;
      }),
  )

  // ══ C. Sync Actions (stubs) ══════════════════════════════════════════════

  .post("/projects/:id/meetings/:meetingId/sync-to-google", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const [updated] = await db
      .update(projectMeetings)
      .set({ syncStatus: "SYNCING", syncError: null, updatedAt: new Date() })
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    return ok(updated);
  })

  .post("/projects/:id/meetings/:meetingId/sync-from-google", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const [updated] = await db
      .update(projectMeetings)
      .set({ syncStatus: "SYNCING", syncError: null, updatedAt: new Date() })
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    return ok(updated);
  })

  .post("/projects/:id/meetings/:meetingId/resolve-conflict", async ({ params, body }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const resolveAs = body?.resolveAs;
    if (!["PROJECT", "GOOGLE"].includes(resolveAs)) {
      return err("resolveAs must be 'PROJECT' or 'GOOGLE'");
    }
    const [updated] = await db
      .update(projectMeetings)
      .set({ sourceOfTruth: resolveAs, syncStatus: "IDLE", syncError: null, updatedAt: new Date() })
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    return ok(updated);
  })

  // ══ D. Bot Actions (stubs) ════════════════════════════════════════════════

  .post("/projects/:id/meetings/:meetingId/bot-join-now", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const [updated] = await db
      .update(projectMeetings)
      .set({ botStatus: "JOINING", joinedAt: new Date(), updatedAt: new Date() })
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    await db.insert(meetingBotLogs).values({
      meetingId: meeting.id,
      level: "INFO",
      message: "Bot join triggered (stub)",
    });
    return ok(updated);
  })

  .post("/projects/:id/meetings/:meetingId/transcribe", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const [updated] = await db
      .update(projectMeetings)
      .set({ recordingStatus: "DOWNLOADING", summaryStatus: "TRANSCRIBING", updatedAt: new Date() })
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    await db.insert(meetingBotLogs).values({
      meetingId: meeting.id,
      level: "INFO",
      message: "Transcription triggered (stub)",
    });
    return ok(updated);
  })

  .post("/projects/:id/meetings/:meetingId/summarize", async ({ params, body }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const updates: Record<string, unknown> = { summaryStatus: "SUMMARIZING", updatedAt: new Date() };
    if (body?.transcriptText) updates.transcriptText = body.transcriptText;
    const [updated] = await db
      .update(projectMeetings)
      .set(updates)
      .where(eq(projectMeetings.id, meeting.id))
      .returning();
    await db.insert(meetingBotLogs).values({
      meetingId: meeting.id,
      level: "INFO",
      message: "Gemini summarization triggered (stub)",
    });
    return ok(updated);
  })

  .get("/projects/:id/meetings/:meetingId/summary", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const actionItems = await db
      .select()
      .from(meetingActionItems)
      .where(eq(meetingActionItems.meetingId, meeting.id));
    return ok({
      summaryMarkdown: meeting.summaryMarkdown,
      summaryStatus: meeting.summaryStatus,
      transcriptText: meeting.transcriptText,
      actionItems,
    });
  })

  // ══ E. Meeting Action Items ══════════════════════════════════════════════

  .get("/projects/:id/meetings/:meetingId/action-items", async ({ params }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const items = await db
      .select()
      .from(meetingActionItems)
      .where(eq(meetingActionItems.meetingId, meeting.id));
    return ok(items);
  })

  .post("/projects/:id/meetings/:meetingId/action-items", async ({ params, body }: any) => {
    const meeting = await getMeeting(Number(params.meetingId));
    if (!meeting || meeting.projectId !== Number(params.id)) return err("Meeting not found");
    const [created] = await db
      .insert(meetingActionItems)
      .values({ ...body, meetingId: meeting.id })
      .returning();
    return ok(created);
  })

  .patch("/projects/:id/meetings/:meetingId/action-items/:itemId", async ({ params, body }: any) => {
    const [updated] = await db
      .update(meetingActionItems)
      .set(body)
      .where(
        and(
          eq(meetingActionItems.id, Number(params.itemId)),
          eq(meetingActionItems.meetingId, Number(params.meetingId)),
        ),
      )
      .returning();
    if (!updated) return err("Action item not found");
    return ok(updated);
  })

  .delete("/projects/:id/meetings/:meetingId/action-items/:itemId", async ({ params, set }: any) => {
    await db
      .delete(meetingActionItems)
      .where(
        and(
          eq(meetingActionItems.id, Number(params.itemId)),
          eq(meetingActionItems.meetingId, Number(params.meetingId)),
        ),
      );
    set.status = 204;
    return;
  })

  // ══ F. Google Bot Accounts (ADMIN only) ══════════════════════════════════

  .use(
    new Elysia()
      .use(authorize(["ADMIN"]))

      .get("/google-bot-accounts", async () => {
        const accounts = await db
          .select()
          .from(googleBotAccounts)
          .orderBy(desc(googleBotAccounts.createdAt));
        return ok(accounts);
      })

      .post("/google-bot-accounts", async ({ body, user }: any) => {
        const [created] = await db
          .insert(googleBotAccounts)
          .values({ ...body, createdBy: user.id })
          .returning();
        return ok(created);
      })

      .get("/google-bot-accounts/:id", async ({ params }: any) => {
        const [account] = await db
          .select()
          .from(googleBotAccounts)
          .where(eq(googleBotAccounts.id, Number(params.id)));
        if (!account) return err("Bot account not found");
        const sessions = await db
          .select()
          .from(googleBotAccountSessions)
          .where(eq(googleBotAccountSessions.googleBotAccountId, account.id))
          .orderBy(desc(googleBotAccountSessions.createdAt))
          .limit(10);
        return ok({ ...account, sessions });
      })

      .put("/google-bot-accounts/:id", async ({ params, body }: any) => {
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok(updated);
      })

      .delete("/google-bot-accounts/:id", async ({ params }: any) => {
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ isActive: false, currentStatus: "DISABLED", updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok(updated);
      })

      .post("/google-bot-accounts/:id/set-default", async ({ params }: any) => {
        await db
          .update(googleBotAccounts)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(googleBotAccounts.isDefault, true));
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok(updated);
      })

      .post("/google-bot-accounts/:id/disable", async ({ params }: any) => {
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ isActive: false, currentStatus: "DISABLED", updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok(updated);
      })

      .post("/google-bot-accounts/:id/login", async ({ params }: any) => {
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ currentStatus: "AVAILABLE", lastLoginAt: new Date(), lastError: null, updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok(updated);
      })

      .post("/google-bot-accounts/:id/health-check", async ({ params }: any) => {
        const [updated] = await db
          .update(googleBotAccounts)
          .set({ lastHealthCheckAt: new Date(), updatedAt: new Date() })
          .where(eq(googleBotAccounts.id, Number(params.id)))
          .returning();
        if (!updated) return err("Bot account not found");
        return ok({ status: updated.currentStatus, lastHealthCheckAt: updated.lastHealthCheckAt });
      }),
  );
