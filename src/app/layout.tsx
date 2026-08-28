import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/GlobalToast";
import { Sidebar } from "@/components/Sidebar";
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://gdvnc-web.vercel.app"),
  title: "Geometry Dash Vietnam Community",
  description: "Trang web chính thức của cộng đồng GDVN",
  openGraph: {
    title: "Geometry Dash Vietnam Community",
    description: "Trang web chính thức của cộng đồng GDVN",
    type: "website",
    url: "https://gdvnc-web.vercel.app/",
    siteName: "GDVNC",
    locale: "vi_VN",
    images: [{ url: "/api/og/site?title=Geometry%20Dash%20Vietnam%20Community&desc=Trang%20web%20chinh%20thuc%20cua%20cong%20dong%20GDVN", width: 1200, height: 630, alt: "Geometry Dash Vietnam Community" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geometry Dash Vietnam Community",
    description: "Trang web chính thức của cộng đồng GDVN",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('gdvnc_theme');document.documentElement.setAttribute('data-theme',t&&['sky','mint','peach','lavender','mono','sakura'].indexOf(t)>=0?t:'sky');var m=localStorage.getItem('gdvnc_mode');var dark=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!dark);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Script id="gdvnc-theme" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col md:flex-row">
                <Sidebar />

                <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                  <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
                    {children}
                  </main>

                  <footer className="border-t py-4 text-center text-xs tracking-widest font-black ui-dim" style={{ borderColor: 'var(--border-subtle)' }}>
                    GDVNC
                  </footer>
                </div>
              </div>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
