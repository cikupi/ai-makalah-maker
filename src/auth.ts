import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // Request scopes for repository access if needed later
      // For public repo listing, "read:user" is sufficient; adding "repo" enables private repo access
      authorization: {
        params: { scope: "read:user repo user:email" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: { token: JWT; account?: { [k: string]: unknown } | null }) {
      if (account) {
        // Persist access token from GitHub (property provided at runtime by provider)
        const acc = account as { access_token?: string };
        token.access_token = acc.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Expose access token on session for server actions
      session.access_token = token.access_token as string | undefined;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
