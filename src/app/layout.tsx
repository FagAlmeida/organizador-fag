import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Organizador FAG", template: "%s · Organizador FAG" },
  description: "Gestão de tarefas em quadros, listas e cartões.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col font-sans">
        <ToastProvider>
          <ConfirmProvider>
            <header className="flex h-12 shrink-0 items-center gap-3 bg-slate-900 px-4 text-white">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded bg-blue-500 text-xs font-bold"
                >
                  F
                </span>
                Organizador FAG
              </Link>
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            </header>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
