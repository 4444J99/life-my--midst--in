import type React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getServerEnv } from '@/env';
import { WebVitals } from '@/components/WebVitals';

// Validate server environment on first render
getServerEnv();

export const metadata: Metadata = {
  title: {
    default: 'in midst my life',
    template: '%s | in midst my life',
  },
  description:
    'Transform your static resume into a dynamic, queryable, multi-perspective profile with mask-based identity filtering and blockchain-inspired verification.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] || 'http://localhost:3000'),
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'in midst my life',
    description: 'Your identity, verified & composable.',
    type: 'website',
    siteName: 'in midst my life',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#d36b3c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">
        <a
          href="#main-content"
          className="skip-to-main"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            zIndex: 100,
            padding: '0.75rem 1.5rem',
            background: 'var(--ds-ink, #1d1a16)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
            borderRadius: '0 0 8px 0',
          }}
        >
          Skip to main content
        </a>
        <WebVitals />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
