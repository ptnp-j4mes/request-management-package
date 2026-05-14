import { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { ok, err } from "../../lib/response";
import { authenticate, authorize } from "../../lib/auth";
import { roles, userRoles } from "@rm/db";
import { CreateRoleSchema, UpdateRoleSchema } from "@rm/types";

const PROTECTED_ROLE_CODES = new Set([
  "ADMIN",
  "IT_MANAGER",
  "APPROVER",
  "BA",
  "DEVELOPER",
  "QA",
  "FULLSTACK",
  "REQUESTER",
]);

function normalizeRoleCode(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

async function listRoles() {
  return db.select().from(roles).orderBy(roles.code);
}

export const rolesRouter = new Elysia({ prefix: "/roles" })
  .use(authenticate)
  .get("/", async () => {
    return ok(await listRoles());
  })
  .get("/:id", async ({ params, set }: any) => {
    const roleId = Number(params.id);
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!role) {
      set.status = 404;
      return err("Role not found");
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    return ok({
      ...role,
      assignedUserCount: countRow?.count ?? 0,
    });
  })
  .use(authorize(["ADMIN"]))
  .post("/", async ({ body, set }: any) => {
    const parsed = CreateRoleSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid role payload", parsed.error.flatten());
    }

    const code = normalizeRoleCode(parsed.data.code);
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, code)).limit(1);
    if (existing) {
      set.status = 409;
      return err("Role code already exists");
    }

    const [created] = await db
      .insert(roles)
      .values({ code, name: parsed.data.name, description: parsed.data.description ?? null })
      .returning();

    return ok(created);
  })
  .patch("/:id", async ({ params, body, set }: any) => {
    const roleId = Number(params.id);
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid role payload", parsed.error.flatten());
    }

    const [existing] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Role not found");
    }

    if (parsed.data.name === undefined && parsed.data.description === undefined) {
      return ok(existing);
    }

    const [updated] = await db
      .update(roles)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      })
      .where(eq(roles.id, roleId))
      .returning();

    return ok(updated);
  })
  .delete("/:id", async ({ params, set }: any) => {
    const roleId = Number(params.id);
    const [existing] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Role not found");
    }

    const code = existing.code.toUpperCase();
    if (PROTECTED_ROLE_CODES.has(code)) {
      set.status = 400;
      return err("Protected system roles cannot be deleted");
    }

    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));
    if ((usage?.count ?? 0) > 0) {
      set.status = 409;
      return err("Cannot delete role while assigned to users");
    }

    await db.delete(roles).where(eq(roles.id, roleId));
    return ok({ deleted: true });
  });
