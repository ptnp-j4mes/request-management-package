import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { projects, projectMembers, users, mitItems } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, and, count } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

export const projectsRouter = new Elysia({ prefix: "/projects" })
  .use(authenticate)
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

    // MD summary
    const mits = await db
      .select({ id: mitItems.id, mitNo: mitItems.mitNo, title: mitItems.title, estimatedMd: mitItems.estimatedMd })
      .from(mitItems)
      .where(eq(mitItems.projectId, project.id));

    const allocatedMd = mits.reduce((sum, m) => sum + Number(m.estimatedMd ?? 0), 0);
    const projectMd = Number(project.estimatedMd ?? 0);

    const mdSummary = {
      estimatedMd: projectMd,
      allocatedMd: Number(allocatedMd.toFixed(2)),
      remainingMd: Number((projectMd - allocatedMd).toFixed(2)),
      items: mits.map((m) => ({
        mitNo: m.mitNo,
        title: m.title,
        estimatedMd: Number(m.estimatedMd ?? 0),
        percent: projectMd > 0
          ? Number(((Number(m.estimatedMd ?? 0) / projectMd) * 100).toFixed(1))
          : 0,
      })),
    };

    return ok({ ...project, members, mdSummary });
  })
  .use(authorize(["ADMIN", "IT_MANAGER"]))
  .post("/", async ({ body }: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const [{ total }] = await db.select({ total: count() }).from(projects);
    const projectCode = `AIT-${year}${String(Number(total) + 1).padStart(4, "0")}`;
    const [created] = await db.insert(projects)
      .values({ ...body, projectCode })
      .returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
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
