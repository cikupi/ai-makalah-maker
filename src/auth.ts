import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import type { Session, Account } from "next-auth";

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
    async jwt({ token, account }: { token: JWT; account?: Account | null }) {
      if (account) {
        // Persist access token from GitHub
        token.access_token = (account as any).access_token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Expose access token on session for server actions
      (session as any).access_token = token.access_token;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
