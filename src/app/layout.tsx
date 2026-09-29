import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

import { Header } from '@/components/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gatherly — community event platform',
  description:
    'Register, check in, form teams, submit projects, vote, and get certified — one platform for community events and hackathons.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
