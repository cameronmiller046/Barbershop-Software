import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Per-account brute-force lockout: after this many consecutive failed sign-ins,
// the account is locked for the cooldown below. A successful login clears it.
const LOCK_THRESHOLD = 8;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 7-day sessions (down from NextAuth's 30-day default), refreshed daily.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Throttle credential attempts per source IP to blunt brute-force /
        // credential-stuffing. Fail open if the limiter itself errors so a bug
        // here can never lock legitimate users out.
        try {
          const ip = request ? clientIp(request as unknown as Request) : "unknown";
          if (!rateLimit(`login:${ip}`, 20, 60_000).ok) return null;
        } catch { /* fail open */ }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        // Account-level lockout: refuse while a lock is active (don't extend it).
        const now = Date.now();
        if (user.lockedUntil && user.lockedUntil.getTime() > now) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          // Count the failure and lock once the threshold is crossed. A lock
          // that has already expired starts a fresh window. Fail open on any DB
          // error so a write hiccup can't wedge the account.
          try {
            const priorFails = user.lockedUntil && user.lockedUntil.getTime() <= now ? 0 : user.failedLoginCount;
            const fails = priorFails + 1;
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginCount: fails, lockedUntil: fails >= LOCK_THRESHOLD ? new Date(now + LOCK_MS) : null },
            });
          } catch { /* fail open */ }
          return null;
        }

        // Success — clear any accumulated failures / lock.
        if (user.failedLoginCount > 0 || user.lockedUntil) {
          try {
            await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
          } catch { /* non-fatal */ }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId ?? null;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role | undefined;
        session.user.tenantId = (token.tenantId as string | null) ?? null;
      }
      return session;
    },
  },
});
