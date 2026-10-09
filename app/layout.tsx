import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Arthur’s SEO Command Center',
  description: 'Private, full-stack SEO management platform for auditing websites, keyword research, competitor analysis, rank tracking, and actionable recommendations.',
  openGraph: {
    title: 'Arthur’s SEO Command Center',
    description: 'Private, full-stack SEO management platform for auditing websites, keyword research, competitor analysis, rank tracking, and actionable recommendations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arthur’s SEO Command Center',
    description: 'Private, full-stack SEO management platform for auditing websites, keyword research, competitor analysis, rank tracking, and actionable recommendations.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
