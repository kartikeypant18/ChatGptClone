// import { clerkMiddleware } from "@clerk/nextjs/server";

// export default clerkMiddleware();

// export const config = {
//   matcher: [
//     // Protect everything except:
//     // - public files (ending with .*)
//     // - Next.js internals (_next)
//     // - static assets (favicon, fonts, images)
//     // - your API routes (like /api/openai)
//     "/((?!.+\\.[\\w]+$|_next|static|favicon.ico|fonts|images|api).*)",
//   ],
// };
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Protects everything except static files and Next internals
    "/((?!.+\\.[\\w]+$|_next).*)",
  ],
};
