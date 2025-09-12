import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic';

const ClerkProvider = dynamic(() => import('@clerk/nextjs').then(m => m.ClerkProvider as any), { ssr: false }) as any;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
