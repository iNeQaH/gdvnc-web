'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Crown,
  ShieldCheck,
  UserX,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { UserDisplayName } from '@/components/UserDisplayName';
import { useTheme } from '@/components/ThemeProvider';
import { getUserListRowStyle } from '@/lib/userListRowStyle';

interface ClanDiscordMemberSidebarProps {
  clan: any;
  tierInfo: { maxMembers: number; tier: number; name: string };
  isLeader: boolean;
  isClanMod?: boolean;
  isOwnerWeb: boolean;
  isEn: boolean;
  isOpen: boolean;
  onToggle?: () => void;
  onClose: () => void;
  onRoleChange: (memberId: string, newRole: 'MODERATOR' | 'MEMBER') => void;
  onKick: (memberId: string, username: string) => void;
  onLeave?: () => void;
}

export default function ClanDiscordMemberSidebar({
  clan,
  tierInfo,
  isLeader,
  isClanMod = false,
  isOwnerWeb,
  isEn,
  isOpen,
  onToggle,
  onClose,
  onRoleChange,
  onKick,
  onLeave,
}: ClanDiscordMemberSidebarProps) {
  const leader = clan.membersGrouped?.leader;
  const mods: any[] = clan.membersGrouped?.mods || [];
  const members: any[] = clan.membersGrouped?.members || [];
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const canManage = isLeader || isOwnerWeb;
  const canKick = isLeader || isOwnerWeb || isClanMod;

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay (when open on screens < 1280px) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Fixed Full-Height Discord-style Right Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 flex flex-col border-l backdrop-blur-2xl transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 88%, transparent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Header Bar */}
        <div
          className="h-14 px-4 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <h3 className="text-xs font-black ui-title tracking-wider uppercase truncate">
              {isEn ? 'Clan Members' : 'Thành viên'}
            </h3>
            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shrink-0 text-sky-600 dark:text-sky-400">
              {clan.memberCount}/{tierInfo.maxMembers}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg ui-dim hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              title={isEn ? 'Collapse Members' : 'Thu gọn danh sách'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {canManage && (
          <div className="px-2 pt-2 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <Link
              href={`/clan/${clan.slug}/settings?tab=members`}
              className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? 'Manage Roles & Mod' : 'Quản lý & Trao Mod'}</span>
            </Link>
          </div>
        )}

        {/* Scrollable Members Roster */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* 1. Category: LEADER */}
          <div className="space-y-1">
            <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400/90 flex items-center justify-between">
              <span>Leader — 1</span>
            </div>

            {leader && (
              <div
                className="group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl border transition-all shadow-xs"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                }}
              >
                <Link
                  href={`/profile/${leader.user.username}`}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:underline"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/50 dark:border-amber-400/60 bg-amber-500/10 dark:bg-slate-900 shadow-[0_0_8px_rgba(251,191,36,0.25)]">
                      {leader.user.avatarUrl ? (
                        <img src={leader.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 text-xs">
                          {leader.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <UserDisplayName user={leader.user} showClanTag={false} clanRole="LEADER" />
                    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                      {(leader.user.classicPp || 0).toLocaleString()} Pt
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 2. Category: MODERATORS */}
          {mods.length > 0 && (
            <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400/90 flex items-center justify-between">
                <span>{isEn ? 'Moderators' : 'Mod Clan'} — {mods.length}</span>
              </div>

              {mods.map((m: any) => {
                const customRow = getUserListRowStyle(m.user, isDark);
                return (
                <div
                  key={m.id}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-colors ${customRow.hasCustomBg ? 'hover:brightness-110 shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  style={customRow.hasCustomBg ? { ...customRow.style, borderLeft: `3px solid ${customRow.color}` } : { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <Link
                    href={`/profile/${m.user.username}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1 hover:underline"
                  >
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/50 dark:border-emerald-400/50 bg-emerald-500/10 dark:bg-slate-900 shadow-xs">
                        {m.user.avatarUrl ? (
                          <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {m.user.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <UserDisplayName user={m.user} showClanTag={false} clanRole="MODERATOR" />
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400/90 font-bold block">
                        {(m.user.classicPp || 0).toLocaleString()} Pt
                      </span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 group-hover:hidden" />
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onRoleChange(m.id, 'MEMBER')}
                        className="hidden group-hover:flex items-center gap-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title={isEn ? 'Demote to Member' : 'Hạ cấp xuống Member'}
                      >
                        <ArrowDownCircle className="w-3 h-3" />
                        <span>{isEn ? 'Demote' : 'Hạ cấp'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* 3. Category: MEMBERS */}
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ui-dim flex items-center justify-between">
              <span>{isEn ? 'Members' : 'Thành viên'} — {members.length}</span>
            </div>

            {members.length > 0 ? (
              members.map((m: any) => {
                const customRow = getUserListRowStyle(m.user, isDark);
                return (
                <div
                  key={m.id}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-colors ${customRow.hasCustomBg ? 'hover:brightness-110 shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  style={customRow.hasCustomBg ? { ...customRow.style, borderLeft: `3px solid ${customRow.color}` } : { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <Link
                    href={`/profile/${m.user.username}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1 hover:underline"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-slate-200 dark:bg-slate-900 shrink-0">
                      {m.user.avatarUrl ? (
                        <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                          {m.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <UserDisplayName user={m.user} showClanTag={false} />
                      <span className="font-mono text-[10px] ui-dim font-bold block">
                        {(m.user.classicPp || 0).toLocaleString()} Pt
                      </span>
                    </div>
                  </Link>

                  {(canManage || canKick) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onRoleChange(m.id, 'MODERATOR')}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                          title={isEn ? 'Promote to Clan Mod' : 'Bổ nhiệm làm Mod Clan'}
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canKick && (
                        <button
                          type="button"
                          onClick={() => onKick(m.id, m.user.username)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                          title={isEn ? 'Kick from Clan' : 'Trục xuất khỏi Clan'}
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
              })
            ) : (
              <p className="text-[11px] ui-dim px-2 py-2 italic">
                {isEn ? 'No other members yet.' : 'Chưa có thành viên nào khác.'}
              </p>
            )}
          </div>
        </div>

        {/* Subtle Footer Bar */}
        <div
          className="p-3 border-t shrink-0 flex items-center justify-between text-[11px] ui-dim bg-black/5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold truncate">{tierInfo.name}</span>
            <span className="font-mono font-bold text-sky-400 text-[10px]">
              {clan.memberCount} / {tierInfo.maxMembers}
            </span>
          </div>

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="px-2.5 py-1 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/60 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title={isEn ? 'Leave Clan' : 'Rời khỏi Clan'}
            >
              <LogOut className="w-3 h-3" />
              <span>{isEn ? 'Leave' : 'Rời'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Collapsed Docked Tab on Right Edge */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle || onClose}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-3 px-2 rounded-l-2xl border border-r-0 backdrop-blur-2xl transition-all duration-200 shadow-2xl hover:translate-x-[-3px] cursor-pointer group"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
          title={isEn ? `Expand Members (${clan.memberCount})` : `Mở danh sách thành viên (${clan.memberCount})`}
        >
          <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
          <Users className="w-3.5 h-3.5 ui-dim group-hover:text-sky-400 transition-colors" />
          <span className="font-mono text-[10px] font-black text-sky-400 [writing-mode:vertical-rl] rotate-180">
            {clan.memberCount}
          </span>
        </button>
      )}
    </>
  );
}
