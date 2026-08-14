import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        // Akun yang dinonaktifkan admin tidak boleh login.
        if (user.active === false) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  events: {
    // Catat login admin ke audit log (best-effort, tidak memblokir login).
    async signIn({ user }) {
      if (user?.role !== "ADMIN" || !user?.email) return;
      try {
        await prisma.auditLog.create({
          data: {
            adminId: user.id ?? null,
            adminEmail: user.email,
            action: "auth.login",
            target: "admin",
          },
        });
      } catch {
        // abaikan — kegagalan pencatatan tidak boleh menggagalkan login
      }
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
