/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth/next";
import { authOptions } from "../../../../auth";

const handler = NextAuth(authOptions as any);

export { handler as GET, handler as POST };
