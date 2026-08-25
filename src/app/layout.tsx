import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/GlobalToast";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://gdvnc-web.vercel.app"),
  title: "GDVNC - GDVNC Leaderboard & Levels List",
  description: "Geometry Dash Việt Nam",
  openGraph: {
    title: "GDVNC - GDVNC Leaderboard & Levels List",
    description: "Geometry Dash Việt Nam",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col transition-colors duration-200`}>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <Sidebar />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                  <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
                    {children}
                  </main>

                  {/* Minimal Clean Footer */}
                  <footer className="border-t py-4 text-center text-xs tracking-widest font-black ui-dim" style={{ borderColor: 'var(--border-subtle)' }}>
                    GDVNC
                  </footer>
                </div>
              </div>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
