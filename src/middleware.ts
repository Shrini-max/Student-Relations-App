export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/departments/:path*",
    "/teams/:path*",
    "/members/:path*",
    "/roles/:path*",
    "/admin/:path*",
    "/logs/:path*",
    "/notifications/:path*",
  ],
};
