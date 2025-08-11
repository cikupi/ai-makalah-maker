import GitHub from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

export const authOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: { scope: "read:user repo user:email" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: { token: JWT; account?: { [k: string]: unknown } | null }) {
      if (account) {
        const acc = account as { access_token?: string };
        token.access_token = acc.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.access_token = token.access_token as string | undefined;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
// Handler is created in route.ts to support App Router with v4
