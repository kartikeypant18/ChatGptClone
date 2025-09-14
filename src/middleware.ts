import { clerkMiddleware } from "@clerk/nextjs/server";

// Export the middleware without any configuration to handle auth
export default clerkMiddleware();

// Only run on specific paths
export const config = {
  matcher: [
    // Exclude static files and specific API routes
    "/((?!_next|static|favicon.ico|fonts|api/openai|api/openai.vercelai).*)",
  ],
};
