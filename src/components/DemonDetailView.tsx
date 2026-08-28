'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Video, Clock, Trash2 } from 'lucide-react';
import LevelTagChips from '@/components/LevelTagChips';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import LevelNeighborNav from '@/components/LevelNeighborNav';
import FloatingNav from '@/components/FloatingNav';
import { awardedPpForProgress } from '@/lib/ScoringEngine';

const PAGE_SIZE = 5;

export default function DemonDetailView({
  level,
  prevLevel,
  nextLevel,
  firstLevel,
  lastLevel,
}: {
  level: any;
  prevLevel?: { id: string; gdLevelId: number; name: string; placement: number | null } | null;
  nextLevel?: { id: string; gdLevelId: number; name: string; placement: number | null } | null;
  firstLevel?: { id: string; gdLevelId: number; name: string; placement: number | null } | null;
  lastLevel?: { id: string; gdLevelId: number; name: string; placement: number | null } | null;
}) {
  const { t } = useLanguage();
  const { showConfirm, showToast } = useToast();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
  }, []);

  const records = level.records || [];
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pageRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const deleteRecord = (id: string) => {
    showConfirm(t('levelslist.delete_record_confirm'), async () => {
      const res = await fetch(`/api/admin/records/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('admin.action_fail'), 'error');
        return;
      }
      showToast(t('common.deleted'), 'success');
      router.refresh();
    });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <Link href={level.isChallenge ? '/challenges' : '/levels'} className="inline-flex items-center gap-1.5 text-xs font-bold ui-dim hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          {t('levelslist.back')}
        </Link>

        <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-video bg-black flex items-center justify-center">
          {level.youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${level.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${level.youtubeId}`}
              className="w-full h-full border-0 absolute inset-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex flex-col items-center justify-center text-center p-6">
              <Video className="w-12 h-12 mb-4 opacity-30" />
              <h2 className="text-xl font-bold ui-dim">{t('levelslist.no_showcase')}</h2>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-black shadow-lg">
                {level.placement != null ? `#${level.placement}` : 'Unranked'}
              </span>
              <LevelTagChips level={level} contrast="onDark" />
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-black/50 text-white backdrop-blur-md border border-white/10 shadow-lg">
                {level.difficulty}
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/80 text-white backdrop-blur-md shadow-lg">
                {level.minPercent && level.minPercent < 100
                  ? t('levelslist.points_range', {
                      min: awardedPpForProgress(level.minPercent, level.minPercent, level.basePp).toFixed(2),
                      req: level.minPercent,
                      max: Number(level.basePp).toFixed(2),
                    })
                  : `${level.basePp} ${t('leaderboard.points')}`}
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white drop-shadow-2xl tracking-tight">
              {level.name}
            </h1>
            <p className="text-sm sm:text-base text-white/80 font-medium">
              {t('levelslist.created_by')} <span className="text-white font-bold">{level.creatorName || t('common.unknown')}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 md:col-span-1">
            <div className="ui-card p-5 space-y-4">
              <h3 className="font-bold ui-title text-sm border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>{t('levelslist.info')}</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase font-bold ui-dim">{t('levelslist.level_id')}</div>
                  <div className="font-semibold text-sm ui-title">{level.gdLevelId}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold ui-dim">{t('levelslist.difficulty')}</div>
                  <div className="font-semibold text-sm ui-title">{level.difficulty}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold ui-dim">{t('leaderboard.points')}</div>
                  <div className="font-semibold text-sm ui-title" style={{ color: 'var(--accent)' }}>
                    {level.minPercent && level.minPercent < 100
                      ? t('levelslist.points_range', {
                          min: awardedPpForProgress(level.minPercent, level.minPercent, level.basePp).toFixed(2),
                          req: level.minPercent,
                          max: Number(level.basePp).toFixed(2),
                        })
                      : `${Number(level.basePp).toFixed(2)} ${t('leaderboard.points')}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold ui-dim">{t('levelslist.description')}</div>
                  <div className="text-xs ui-dim mt-1 line-clamp-4 italic">
                    {level.description || t('levelslist.no_description')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold ui-dim">{t('levelslist.min_percent')}</div>
                  <div className="font-semibold text-sm text-red-500">{t('levelslist.min_percent_val', { n: level.minPercent })}</div>
                </div>
              </div>

              <Link
                href={`/submit?levelId=${level.id}`}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}
              >
                {t('levelslist.submit_record')}
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="font-black text-lg ui-title flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              {t('levelslist.victors_list', { n: records.length })}
            </h3>

            <div className="ui-card overflow-hidden">
              {records.length === 0 ? (
                <div className="p-12 text-center text-sm font-medium ui-dim italic">
                  {t('levelslist.no_victors')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                        <th className="px-5 py-3.5 text-xs font-bold ui-dim uppercase tracking-wider w-16 text-center">{t('leaderboard.rank')}</th>
                        <th className="px-5 py-3.5 text-xs font-bold ui-dim uppercase tracking-wider">{t('levelslist.player')}</th>
                        <th className="px-5 py-3.5 text-xs font-bold ui-dim uppercase tracking-wider text-right">{t('levelslist.achievement')}</th>
                        <th className="px-5 py-3.5 text-xs font-bold ui-dim uppercase tracking-wider text-right">{t('levelslist.video')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRecords.map((rec: any, idx: number) => {
                        const rank = (currentPage - 1) * PAGE_SIZE + idx + 1;
                        const displayName = rec.user
                          ? (rec.user.gdUsername || rec.user.username)
                          : (rec.legacyPlayerName || t('levelslist.legacy_player'));
                        return (
                        <tr key={rec.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-5 py-3 text-center font-black" style={{ color: rank <= 3 ? 'var(--accent)' : 'var(--text-dim)' }}>
                            #{rank}
                          </td>
                          <td className="px-5 py-3 font-bold ui-title">
                            {rec.user ? (
                              <Link href={`/profile/${rec.user.username}`} className="hover:underline flex items-center gap-2">
                                {rec.user.avatarUrl ? (
                                  <img src={rec.user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">
                                    {displayName[0]}
                                  </div>
                                )}
                                {displayName}
                              </Link>
                            ) : (
                              <span className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] ui-dim">
                                  {(displayName || '?')[0]}
                                </div>
                                <span>{displayName}</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                                  {t('levelslist.unclaimed')}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold ui-dim">
                            {level.mode === 'PLATFORMER' ? (
                              <span className="flex items-center justify-end gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {rec.timeMs ? (rec.timeMs / 1000).toFixed(3) + 's' : '-'}
                              </span>
                            ) : (
                              `${rec.progress}%`
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              {rec.videoUrl && (
                                <a href={rec.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                                  <Video className="w-4 h-4" />
                                </a>
                              )}
                              {isStaff && (
                                <button
                                  type="button"
                                  title={t('levelslist.delete_record')}
                                  onClick={() => deleteRecord(rec.id)}
                                  className="inline-flex p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingNav
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        alwaysVisible={totalPages > 1}
      />

      <LevelNeighborNav
        currentPlacement={level.placement}
        prevLevel={prevLevel}
        nextLevel={nextLevel}
        firstLevel={firstLevel}
        lastLevel={lastLevel}
      />
    </>
  );
}
