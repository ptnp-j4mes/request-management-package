import { Elysia } from "elysia";
import { ok } from "../../lib/response";
import { getWorkloadByUser, getWorkloadByProject, getOverdueItems, getPendingHandoffs } from "./service";

export const workloadRouter = new Elysia({ prefix: "/workload" })
  .get("/by-user", async () => ok(await getWorkloadByUser()))
  .get("/by-project", async () => ok(await getWorkloadByProject()))
  .get("/overdue", async () => ok(await getOverdueItems()))
  .get("/handoffs/pending", async () => ok(await getPendingHandoffs()));
