import type React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Profile | in midst my life',
  description:
    'A verifiable, context-specific professional presentation powered by mask-based identity filtering.',
  openGraph: {
    title: 'Shared Profile — in midst my life',
    description:
      'View this verifiable professional presentation. Each mask provides a unique perspective on the same professional identity.',
    type: 'profile',
    siteName: 'in midst my life',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shared Profile — in midst my life',
    description: 'A verifiable, context-specific professional presentation.',
  },
};

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
