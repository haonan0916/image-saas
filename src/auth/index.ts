import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, {
  AuthOptions,
  DefaultSession,
  DefaultUser,
  getServerSession as nextAuthGetServerSeesion,
} from "next-auth";
import { db } from "@/server/db/db";
import Github from "next-auth/providers/github";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: AuthOptions = {
  adapter: DrizzleAdapter(db),
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  providers: [
    Github({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
};

const handlers = NextAuth(authOptions);

export { handlers as GET, handlers as POST };

export function getServerSession() {
  return nextAuthGetServerSeesion(authOptions);
}
