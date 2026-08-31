import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/GlobalToast";
import { Sidebar } from "@/components/Sidebar";
import { Analytics } from '@vercel/analytics/next';
import { isSiteLocked } from "@/lib/siteLock";
import { getAuthUser, isFullAdminRole } from "@/lib/auth";
import NationalDayLock from "@/components/NationalDayLock";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://gdvnc-web.vercel.app"),
  title: "Geometry Dash Việt Nam",
  description: "Trang web chính thức của cộng đồng GDVN",
  openGraph: {
    title: "Geometry Dash Việt Nam",
    description: "Trang web chính thức của cộng đồng GDVN",
    type: "website",
    url: "https://gdvnc-web.vercel.app/",
    siteName: "GDVN",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary",
    title: "Geometry Dash Việt Nam",
    description: "Trang web chính thức của cộng đồng GDVN",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/gdvn-logo.png', type: 'image/png' },
    ],
    apple: '/gdvn-logo.png',
    shortcut: '/favicon.ico',
  },
};

export const dynamic = "force-dynamic";

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('gdvnc_theme');document.documentElement.setAttribute('data-theme',t&&['sky','mint','peach','lavender','mono','sakura'].indexOf(t)>=0?t:'sky');var m=localStorage.getItem('gdvnc_mode');var dark=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!dark);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const locked = await isSiteLocked();
  const path = (await headers()).get("x-gdvnc-pathname") || "";
  const auth = await getAuthUser();
  const isAdmin = isFullAdminRole(auth?.role);

  if (locked && path !== "/login") {
    return (
      <html lang="vi" suppressHydrationWarning>
        <body className="qk-lock-body">
          <NationalDayLock canUnlock={isAdmin} />
          <Analytics />
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Script id="gdvnc-theme" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              {locked && path === "/login" ? (
                <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
                  {children}
                </main>
              ) : (
                <div className="min-h-screen flex flex-col md:flex-row">
                  <Sidebar />

                  <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                    <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
                      {children}
                    </main>

                    <footer className="border-t py-4 text-center text-xs tracking-widest font-black ui-dim" style={{ borderColor: 'var(--border-subtle)' }}>
                      GDVN
                    </footer>
                  </div>
                </div>
              )}
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
