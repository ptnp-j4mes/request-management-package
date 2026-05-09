import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";

import { authRouter } from "./modules/auth/router";
import { usersRouter } from "./modules/users/router";
import { projectsRouter } from "./modules/projects/router";
import { maRouter } from "./modules/maintenance-agreements/router";
import { uatRouter } from "./modules/uat/router";
import { requestsRouter } from "./modules/requests/router";
import { mitItemsRouter } from "./modules/mit-items/router";
import { workloadRouter } from "./modules/workload/router";
import { botRouter } from "./modules/bot/router";
import { performanceRouter } from "./modules/performance/router";

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:9899",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }))
  .use(swagger({ path: "/docs" }))
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRouter)
  .use(usersRouter)
  .use(projectsRouter)
  .use(maRouter)
  .use(uatRouter)
  .use(requestsRouter)
  .use(mitItemsRouter)
  .use(workloadRouter)
  .use(botRouter)
  .use(performanceRouter)
  .onError(({ error, code }) => {
    console.error(`[${code}]`, error);
    return { success: false, error: String(error) };
  });

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port);
console.log(`🚀 API running at http://localhost:${port}`);
console.log(`📖 Docs at http://localhost:${port}/docs`);
