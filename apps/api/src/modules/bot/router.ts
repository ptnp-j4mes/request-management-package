import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { botChannels, botSessions, botMessages, botRequests, botResponses } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, desc } from "drizzle-orm";

export const botRouter = new Elysia({ prefix: "/bot" })
  .get("/channels", async () => ok(await db.select().from(botChannels)))
  .get("/sessions", async () => {
    return ok(await db.select().from(botSessions).orderBy(desc(botSessions.startedAt)));
  })
  .get("/sessions/:id", async ({ params }) => {
    const [session] = await db.select().from(botSessions).where(eq(botSessions.id, Number(params.id)));
    if (!session) return err("Session not found");
    const messages = await db.select().from(botMessages).where(eq(botMessages.sessionId, session.id));
    const reqs = await db.select().from(botRequests).where(eq(botRequests.sessionId, session.id));
    return ok({ ...session, messages, requests: reqs });
  })
  .post("/sessions", async ({ body }: any) => {
    const sessionKey = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [created] = await db.insert(botSessions).values({ ...body, sessionKey }).returning();
    return ok(created);
  })
  .post("/messages", async ({ body }: any) => {
    const [created] = await db.insert(botMessages).values(body).returning();
    return ok(created);
  })
  .get("/requests", async () => {
    return ok(await db.select().from(botRequests).orderBy(desc(botRequests.createdAt)));
  })
  .post("/requests", async ({ body }: any) => {
    const requestNo = `BOT-${Date.now()}`;
    const [created] = await db.insert(botRequests).values({ ...body, requestNo }).returning();
    return ok(created);
  });
