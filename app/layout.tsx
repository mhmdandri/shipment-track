import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/layout/AppSidebar";
import "./globals.css";
import Providers from "@/components/layout/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Forwarding Workflow Management System",
  description: "Internal CS Eksim tracking suite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} font-sans antialiased h-full min-h-screen bg-background text-foreground`}
      >
        <Providers>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 lg:pl-64 bg-background min-w-0 overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
