import { getServerSession } from "@/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { db } from "./db/db";
import jwt from "jsonwebtoken";

const t = initTRPC.context().create();

const { router, procedure } = t;

export const withLoggerProcedure = procedure.use(async ({ ctx, next }) => {
  const start = Date.now();

  const res = await next();
  const end = Date.now();
  console.log(`API time: ${end - start}ms`);

  return res;
});

export const withSessionMiddleware = t.middleware(async ({ ctx, next }) => {
  const session = await getServerSession();
  return next({
    ctx: {
      session,
    },
  });
});

export const protectedProcedure = withLoggerProcedure
  .use(withSessionMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be logged in to access this resource",
      });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session!.user.id),
      columns: {
        plan: true,
      },
    });

    const plan = user!.plan;

    return next({
      ctx: {
        session: ctx.session!,
        plan,
      },
    });
  });

export const withAppProcedure = withLoggerProcedure.use(
  async ({ ctx, next }) => {
    const header = await headers();
    const apiKey = header.get("api-key");
    const signedToken = header.get("signed-token");
    if (apiKey) {
      const apiKeyAndAppUser = await db.query.apiKeys.findFirst({
        where: (apiKeys, { eq, and, isNull }) =>
          and(eq(apiKeys.key, apiKey), isNull(apiKeys.deletedAt)),
        with: {
          app: {
            with: {
              user: true,
              storage: true,
            },
          },
        },
      });

      if (!apiKeyAndAppUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return next({
        ctx: {
          app: apiKeyAndAppUser.app,
          user: apiKeyAndAppUser.app.user,
        },
      });
    } else if (signedToken) {
      const payload = jwt.decode(signedToken!) as jwt.JwtPayload;
      if (!payload?.clientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client ID not found in signed token",
        });
      }

      const apiKeyAndAppUser = await db.query.apiKeys.findFirst({
        where: (apiKeys, { eq, and, isNull }) =>
          and(
            eq(apiKeys.clientId, payload.clientId),
            isNull(apiKeys.deletedAt)
          ),
        with: {
          app: {
            with: {
              user: true,
              storage: true,
            },
          },
        },
      });

      if (!apiKeyAndAppUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      try {
        jwt.verify(signedToken!, apiKeyAndAppUser.key);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid signed token",
        });
      }

      return next({
        ctx: {
          app: apiKeyAndAppUser.app,
          user: apiKeyAndAppUser.app.user,
        },
      });
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You must provide an API key or signed token to access this resource",
    });
  }
);

export { router };
