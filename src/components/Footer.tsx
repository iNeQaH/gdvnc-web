'use client';

import React from 'react';
import Link from 'next/link';
import { SITE_LINKS } from '@/lib/siteLinks';
import BrandMark from '@/components/BrandMark';

export function Footer() {
  return (
    <footer
      className="border-t mt-auto text-xs transition-colors backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.2)] bg-card/85 border-border/60"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-9 space-y-7">
        
        {/* Top bar: Brand (WITHOUT DESCRIPTION) & Social Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <BrandMark size={38} className="shadow-lg rounded-xl group-hover:scale-105 transition-transform" />
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-sky-500/30 to-pink-500/30 blur-sm -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-sky-400 via-primary to-pink-400 bg-clip-text text-transparent">
                GDVN Community
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 shadow-xs">
                Portal
              </span>
            </div>
          </Link>

          {/* Social Links with Official Brand Colors & Glowing Hover */}
          <div className="flex items-center gap-2.5">
            {/* Discord */}
            <a
              href={SITE_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              title="GDVN Discord Server"
              aria-label="GDVN Discord Server"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 text-white font-extrabold text-xs shadow-md hover:shadow-indigo-500/30 cursor-pointer"
              style={{
                backgroundColor: '#5865F2',
              }}
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Discord</span>
            </a>

            {/* Facebook Group */}
            <a
              href={SITE_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              title="Cộng đồng GDVN trên Facebook"
              aria-label="Cộng đồng GDVN trên Facebook"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 text-white font-extrabold text-xs shadow-md hover:shadow-blue-500/30 cursor-pointer"
              style={{
                backgroundColor: '#1877F2',
              }}
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </a>
          </div>
        </div>

        {/* Links Grid with High-Contrast Typography & Subtle Glow Dots */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              Bảng Xếp Hạng
            </h4>
            <ul className="space-y-2 text-xs">
              {SITE_LINKS.leaderboards.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    className="text-foreground/75 hover:text-primary font-semibold transition-all hover:translate-x-1 inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              Danh Sách Màn Chơi
            </h4>
            <ul className="space-y-2 text-xs">
              {SITE_LINKS.levels.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    className="text-foreground/75 hover:text-primary font-semibold transition-all hover:translate-x-1 inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              Cộng Đồng
            </h4>
            <ul className="space-y-2 text-xs">
              {SITE_LINKS.community.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    className="text-foreground/75 hover:text-primary font-semibold transition-all hover:translate-x-1 inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.6)]" />
              Hỗ Trợ & Hệ Thống
            </h4>
            <ul className="space-y-2 text-xs">
              {SITE_LINKS.support.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    className="text-foreground/75 hover:text-primary font-semibold transition-all hover:translate-x-1 inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/70 font-semibold">
          <span>&copy; {new Date().getFullYear()} GDVN Community. All rights reserved.</span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Geometry Dash &copy; RobTop Games. GDVN is a community platform.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;