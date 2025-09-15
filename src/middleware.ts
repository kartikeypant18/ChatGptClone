import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Protect all API routes and all other pages except static files and Next.js internals
    "/api/:path*",
    "/((?!.+\\.[\\w]+$|_next|static|favicon.ico|fonts|images).*)",
  ],
};
