import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Uploadcare Widget */}
        <script src="https://ucarecdn.com/libs/widget/3.x/uploadcare.full.min.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.UPLOADCARE_PUBLIC_KEY = '${process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ''}';`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <body className="bg-background">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-black/70 focus:text-white focus:px-3 focus:py-2 focus:rounded">Skip to main content</a>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
