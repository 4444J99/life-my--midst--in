import type React from 'react';
import './globals.css';

// Use system fonts to avoid network calls during build
// CSS variables --font-display and --font-sans are set in globals.css

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
