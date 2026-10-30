import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageContext";
import { ToastProvider } from "@/components/GlobalToast";
import { Sidebar } from "@/components/Sidebar";
import { SiteLockGate } from "@/components/SiteLockGate";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8088"),
  title: "Geometry Dash Việt Nam",
  description: "Trang web chính thức của cộng đồng GDVN",
  openGraph: {
    title: "Geometry Dash Việt Nam",
    description: "Trang web chính thức của cộng đồng GDVN",
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8088",
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

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('gdvnc_theme');document.documentElement.setAttribute('data-theme',t&&['sky','mint','peach','lavender','mono','sakura','custom'].indexOf(t)>=0?t:'sky');var m=localStorage.getItem('gdvnc_mode');var dark=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!!dark);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          id="gdvnc-theme"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Audiowide&family=Black+Ops+One&family=Cinzel+Decorative:wght@700&family=Exo+2:ital,wght@0,400..900;1,400..900&family=Fira+Code:wght@400..700&family=Monoton&family=Montserrat:ital,wght@0,400..900;1,400..900&family=Orbitron:wght@400..900&family=Outfit:wght@400..900&family=Permanent+Marker&family=Press+Start+2P&family=Righteous&family=Rubik+Glitch&family=Unbounded:wght@400..900&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <SiteLockGate>
                <AnalyticsTracker />
                <div className="min-h-screen flex flex-col md:flex-row">
                  <Sidebar />

                  <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                    <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
                      {children}
                    </main>

                    <Footer />
                  </div>
                </div>
              </SiteLockGate>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
