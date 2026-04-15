import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "DEPT_HEAD" | "VIEWER";
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "DEPT_HEAD" | "VIEWER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: "ADMIN" | "DEPT_HEAD" | "VIEWER";
  }
}
