import Link from 'next/link';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Gatherly
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-600 sm:flex">
            <Link href="/" className="hover:text-slate-900">
              Events
            </Link>
            <SignedIn>
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/admin" className="hover:text-slate-900">
                Organize
              </Link>
            </SignedIn>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-slate-600 hover:text-slate-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
