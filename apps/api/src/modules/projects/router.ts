import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { projects, projectMembers, users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, and } from "drizzle-orm";

export const projectsRouter = new Elysia({ prefix: "/projects" })
  .get("/", async () => {
    const data = await db.select().from(projects).orderBy(projects.projectCode);
    return ok(data);
  })
  .get("/:id", async ({ params }) => {
    const [project] = await db.select().from(projects).where(eq(projects.id, Number(params.id)));
    if (!project) return err("Project not found");
    const members = await db
      .select({ userId: projectMembers.userId, memberRole: projectMembers.memberRole, fullName: users.fullName, email: users.email })
      .from(projectMembers)
      .leftJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, project.id));
    return ok({ ...project, members });
  })
  .post("/", async ({ body }) => {
    const [created] = await db.insert(projects).values(body as any).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }) => {
    const [updated] = await db.update(projects).set({ ...(body as any), updatedAt: new Date() })
      .where(eq(projects.id, Number(params.id))).returning();
    if (!updated) return err("Project not found");
    return ok(updated);
  })
  .post("/:id/members", async ({ params, body }: any) => {
    const [member] = await db.insert(projectMembers).values({
      projectId: Number(params.id),
      userId: body.userId,
      memberRole: body.memberRole,
    }).returning();
    return ok(member);
  })
  .delete("/:id/members/:userId", async ({ params }) => {
    await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, Number(params.id)),
        eq(projectMembers.userId, Number(params.userId)),
      ));
    return ok({ deleted: true });
  });
