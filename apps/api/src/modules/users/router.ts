import { Elysia } from "elysia";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { ok, err } from "../../lib/response";
import { authenticate, authorize } from "../../lib/auth";
import { roles, userRoles, users } from "@rm/db";
import { CreateUserSchema, UpdateUserSchema, SetUserRolesSchema } from "@rm/types";

const PROFILE_FIELDS = ["fullName", "email", "companyName", "githubUsername", "departmentId"] as const;
const ADMIN_UPDATE_FIELDS = ["username", ...PROFILE_FIELDS] as const;
const ADMIN_ROLE_CODE = "ADMIN";

type RoleRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

function normalizeRoleCode(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

function stripPasswordHash<T extends Record<string, any>>(row: T) {
  const { passwordHash: _passwordHash, ...safe } = row;
  return safe;
}

async function getUserRoleRows(userId: number, client = db) {
  return client
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
      description: roles.description,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
}

async function getUsersWithRoles() {
  const userRows = await db.select().from(users).orderBy(users.fullName);
  const roleRows = await db
    .select({
      userId: userRoles.userId,
      roleCode: roles.code,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId));

  const roleMap = new Map<number, string[]>();
  for (const row of roleRows) {
    const list = roleMap.get(row.userId) ?? [];
    list.push(row.roleCode);
    roleMap.set(row.userId, list);
  }

  return userRows.map((user) => ({
    ...stripPasswordHash(user),
    roles: roleMap.get(user.id)?.sort() ?? [],
  }));
}

async function getUserWithRoles(userId: number, client = db) {
  const [userRow] = await client.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) return null;
  const assignedRoles = await getUserRoleRows(userId, client);
  return {
    ...stripPasswordHash(userRow),
    roles: assignedRoles.map((role) => role.code).sort(),
  };
}

async function resolveRolesByInput(tx: typeof db, roleIds?: number[], roleCodes?: string[]) {
  const uniqueIds = Array.from(new Set((roleIds ?? []).filter((value) => Number.isFinite(value))));
  const normalizedCodes = Array.from(
    new Set((roleCodes ?? []).map((code) => normalizeRoleCode(code)).filter(Boolean)),
  );

  const resolved: RoleRow[] = [];
  if (uniqueIds.length > 0) {
    const idRows = await tx
      .select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description })
      .from(roles)
      .where(inArray(roles.id, uniqueIds));
    resolved.push(...idRows);
  }

  if (normalizedCodes.length > 0) {
    const codeRows = await tx
      .select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description })
      .from(roles)
      .where(inArray(roles.code, normalizedCodes));
    resolved.push(...codeRows);
  }

  const deduped = new Map<number, RoleRow>();
  for (const role of resolved) deduped.set(role.id, role);

  const foundIds = new Set(Array.from(deduped.values()).map((role) => role.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  const foundCodes = new Set(Array.from(deduped.values()).map((role) => role.code));
  const missingCodes = normalizedCodes.filter((code) => !foundCodes.has(code));

  if (missingIds.length > 0 || missingCodes.length > 0) {
    throw new Error("One or more roles were not found");
  }

  return Array.from(deduped.values()).sort((a, b) => a.code.localeCompare(b.code));
}

async function syncUserRoles(tx: typeof db, userId: number, nextRoles: RoleRow[]) {
  await tx.delete(userRoles).where(eq(userRoles.userId, userId));
  if (nextRoles.length === 0) return;
  await tx.insert(userRoles).values(nextRoles.map((role) => ({ userId, roleId: role.id })));
}

async function countAdminUsers(tx: typeof db) {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.code, ADMIN_ROLE_CODE));

  return rows[0]?.count ?? 0;
}

async function ensureAdminRoleRemovalAllowed(tx: typeof db, userId: number, nextRoles: RoleRow[]) {
  const currentRoles = await getUserRoleRows(userId, tx);
  const currentlyHasAdmin = currentRoles.some((role) => role.code === ADMIN_ROLE_CODE);
  const nextHasAdmin = nextRoles.some((role) => role.code === ADMIN_ROLE_CODE);
  if (!currentlyHasAdmin || nextHasAdmin) return;

  const adminCount = await countAdminUsers(tx);
  if (adminCount <= 1) {
    throw new Error("Cannot remove the last ADMIN role from the system");
  }
}

async function formatUserResponse(userId: number) {
  const user = await getUserWithRoles(userId);
  if (!user) return null;
  return user;
}

export const usersRouter = new Elysia({ prefix: "/users" })
  .use(authenticate)
  .get("/", async () => {
    return ok(await getUsersWithRoles());
  })
  .get("/:id", async ({ params, set }: any) => {
    const user = await getUserWithRoles(Number(params.id));
    if (!user) {
      set.status = 404;
      return err("User not found");
    }
    return ok(user);
  })
  // ── Own profile update (no ADMIN required) ────────────────────────────────
  .patch("/me", async ({ body, user, set }: any) => {
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid profile payload", parsed.error.flatten());
    }

    const filtered = Object.fromEntries(
      Object.entries(parsed.data as Record<string, unknown>).filter(([k]) =>
        (PROFILE_FIELDS as readonly string[]).includes(k),
      ),
    );

    const [updated] = await db
      .update(users)
      .set({ ...filtered, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) {
      set.status = 404;
      return err("User not found");
    }

    return ok(stripPasswordHash(updated));
  })
  .use(authorize(["ADMIN"]))
  .post("/", async ({ body, set }: any) => {
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid user payload", parsed.error.flatten());
    }

    const {
      password,
      roleIds,
      roleCodes,
      isActive,
      roleName,
      ...profile
    } = parsed.data;

    const payload: Record<string, unknown> = {
      ...profile,
      isActive: isActive ?? true,
      updatedAt: new Date(),
    };

    if (password) {
      payload.passwordHash = await Bun.password.hash(password);
    }
    if (roleName) {
      payload.roleName = roleName;
    }

    const created = await db.transaction(async (tx) => {
      const [userRow] = await tx.insert(users).values(payload as any).returning();
      if (!userRow) throw new Error("Failed to create user");

      const nextRoles = await resolveRolesByInput(tx, roleIds, roleCodes);
      if (nextRoles.length > 0) {
        await tx.insert(userRoles).values(nextRoles.map((role) => ({ userId: userRow.id, roleId: role.id })));
        if (!payload.roleName) {
          await tx.update(users).set({ roleName: nextRoles[0].code, updatedAt: new Date() }).where(eq(users.id, userRow.id));
          userRow.roleName = nextRoles[0].code;
        }
      }

      return userRow;
    });

    return ok((await formatUserResponse(created.id)) ?? stripPasswordHash(created));
  })
  .patch("/:id", async ({ params, body, set }: any) => {
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid user payload", parsed.error.flatten());
    }

    const userId = Number(params.id);
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing.length) {
      set.status = 404;
      return err("User not found");
    }

    const {
      password,
      roleIds,
      roleCodes,
      roleName,
      isActive,
      ...rest
    } = parsed.data;

    const payload: Record<string, unknown> = {
      ...Object.fromEntries(Object.entries(rest).filter(([k, v]) => (ADMIN_UPDATE_FIELDS as readonly string[]).includes(k) && v !== undefined)),
      updatedAt: new Date(),
    };

    if (password) {
      payload.passwordHash = await Bun.password.hash(password);
    }
    if (roleName !== undefined) {
      payload.roleName = roleName;
    }
    if (isActive !== undefined) {
      payload.isActive = isActive;
    }

    const [updated] = await db
      .update(users)
      .set(payload as any)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      set.status = 404;
      return err("User not found");
    }

    if (roleIds || roleCodes) {
      const nextRoles = await db.transaction(async (tx) => {
        const resolvedRoles = await resolveRolesByInput(tx, roleIds, roleCodes);
        await ensureAdminRoleRemovalAllowed(tx, userId, resolvedRoles);
        await syncUserRoles(tx, userId, resolvedRoles);
        if (!payload.roleName && resolvedRoles.length > 0) {
          await tx.update(users).set({ roleName: resolvedRoles[0].code, updatedAt: new Date() }).where(eq(users.id, userId));
        }
        return resolvedRoles;
      });
      return ok({ ...stripPasswordHash(updated), roles: nextRoles.map((role) => role.code) });
    }

    const response = await formatUserResponse(userId);
    return ok(response);
  })
  .delete("/:id", async ({ params, set }: any) => {
    const userId = Number(params.id);
    const [existing] = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, userId));
    return ok({ deleted: true, mode: "soft" as const });
  })
  .post("/:id/restore", async ({ params, set }: any) => {
    const userId = Number(params.id);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    await db.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, userId));
    return ok({ restored: true });
  })
  .get("/:id/roles", async ({ params, set }: any) => {
    const userId = Number(params.id);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    return ok(await getUserRoleRows(userId));
  })
  .put("/:id/roles", async ({ params, body, set }: any) => {
    const userId = Number(params.id);
    const parsed = SetUserRolesSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid role payload", parsed.error.flatten());
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    const nextRoles = await db.transaction(async (tx) => {
      const resolvedRoles = await resolveRolesByInput(tx, parsed.data.roleIds, parsed.data.roleCodes);
      await ensureAdminRoleRemovalAllowed(tx, userId, resolvedRoles);
      await syncUserRoles(tx, userId, resolvedRoles);
      if (resolvedRoles.length > 0) {
        await tx.update(users).set({ roleName: resolvedRoles[0].code, updatedAt: new Date() }).where(eq(users.id, userId));
      }
      return resolvedRoles;
    });

    const response = await formatUserResponse(userId);
    return ok({ ...(response ?? {}), roles: nextRoles.map((role) => role.code) });
  })
  .post("/:id/roles", async ({ params, body, set, user }: any) => {
    const userId = Number(params.id);
    const parsed = SetUserRolesSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid role payload", parsed.error.flatten());
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    const nextRoles = await db.transaction(async (tx) => {
      const currentRoles = await getUserRoleRows(userId, tx);
      const currentRoleIds = new Set(currentRoles.map((role) => role.id));
      const additionalRoles = await resolveRolesByInput(tx, parsed.data.roleIds, parsed.data.roleCodes);
      const merged = [...currentRoles, ...additionalRoles.filter((role) => !currentRoleIds.has(role.id))];
      await ensureAdminRoleRemovalAllowed(tx, userId, merged);
      await syncUserRoles(tx, userId, merged);
      if (merged.length > 0) {
        await tx.update(users).set({ roleName: merged[0].code, updatedAt: new Date() }).where(eq(users.id, userId));
      }
      return merged;
    });

    const response = await formatUserResponse(userId);
    return ok({ ...(response ?? {}), roles: nextRoles.map((role) => role.code) });
  })
  .delete("/:id/roles/:roleId", async ({ params, set, user }: any) => {
    const userId = Number(params.id);
    const roleId = Number(params.roleId);

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("User not found");
    }

    const [role] = await db.select({ id: roles.id, code: roles.code }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!role) {
      set.status = 404;
      return err("Role not found");
    }

    await db.transaction(async (tx) => {
      const currentRoles = await getUserRoleRows(userId, tx);
      const nextRoles = currentRoles.filter((item) => item.id !== roleId);
      if (role.code === ADMIN_ROLE_CODE) {
        await ensureAdminRoleRemovalAllowed(tx, userId, nextRoles);
      }
      await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
      if (nextRoles.length > 0) {
        await tx.update(users).set({ roleName: nextRoles[0].code, updatedAt: new Date() }).where(eq(users.id, userId));
      } else {
        await tx.update(users).set({ roleName: null, updatedAt: new Date() }).where(eq(users.id, userId));
      }
    });

    return ok({ removed: true });
  });
