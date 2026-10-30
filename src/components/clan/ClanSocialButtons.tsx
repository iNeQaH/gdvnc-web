'use client';

import React from 'react';

export interface ClanSocialLinks {
  discord?: string;
  messenger?: string;
  steam?: string;
  zalo?: string;
}

export const ClanSocialButtons = ({
  socialLinks,
  className = '',
}: {
  socialLinks?: ClanSocialLinks | null;
  className?: string;
}) => {
  if (!socialLinks) return null;

  const { discord, messenger, steam, zalo } = socialLinks;
  const hasAny = Boolean(discord || messenger || steam || zalo);
  if (!hasAny) return null;

  return (
    <div className={`pt-3 border-t flex items-center gap-2.5 flex-wrap ${className}`} style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Discord */}
      {discord && (
        <a
          href={discord}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title="Discord Server Clan"
          aria-label="Discord Server Clan"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer hover:shadow-sm"
          style={{
            backgroundColor: '#5865F2',
            borderColor: '#4752c4',
            color: '#ffffff',
          }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
      )}

      {/* Messenger */}
      {messenger && (
        <a
          href={messenger}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title="Facebook Messenger Clan"
          aria-label="Facebook Messenger Clan"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer hover:shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #00B2FF 0%, #006AFF 50%, #A033FF 100%)',
            borderColor: '#006AFF',
            color: '#ffffff',
          }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.914 1.455 5.524 3.737 7.218-.086.974-.482 2.766-1.572 4.148 0 0 2.45-.306 4.607-1.748.995.275 2.057.425 3.161.425 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.094 12.443l-2.656-2.83-5.188 2.83 5.719-6.071 2.719 2.83 5.125-2.83-5.719 6.071z"/>
          </svg>
        </a>
      )}

      {/* Steam */}
      {steam && (
        <a
          href={steam}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title="Steam Group Clan"
          aria-label="Steam Group Clan"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer hover:shadow-sm"
          style={{
            backgroundColor: '#171a21',
            borderColor: '#2a475e',
            color: '#ffffff',
          }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.008l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0zM7.544 14.832l-1.62-.67c.264-.53.743-.935 1.332-1.093l1.246 1.8c-.378-.025-.724-.047-.958-.037zm8.4-9.066c1.737 0 3.148 1.41 3.148 3.148 0 1.736-1.41 3.146-3.148 3.146-1.736 0-3.148-1.41-3.148-3.146 0-1.737 1.412-3.148 3.148-3.148zm0 1.18c-1.087 0-1.968.882-1.968 1.968 0 1.087.881 1.969 1.968 1.969 1.086 0 1.968-.882 1.968-1.969 0-1.086-.882-1.968-1.968-1.968z"/>
          </svg>
        </a>
      )}

      {/* Zalo */}
      {zalo && (
        <a
          href={zalo}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title="Zalo Group Clan"
          aria-label="Zalo Group Clan"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer hover:shadow-sm"
          style={{
            backgroundColor: '#0068FF',
            borderColor: '#0055d4',
            color: '#ffffff',
          }}
        >
          <span className="font-black text-[10px] tracking-tighter">Zalo</span>
        </a>
      )}
    </div>
  );
};
