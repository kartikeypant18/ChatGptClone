// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Protects everything except static files and Next internals
    "/((?!.+\\.[\\w]+$|_next).*)",
  ],
};
