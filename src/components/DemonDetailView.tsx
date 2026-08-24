'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Video, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function DemonDetailView({
  level,
  prevLevel,
  nextLevel,
}: {
  level: any;
  prevLevel?: { id: string; name: string; placement: number | null } | null;
  nextLevel?: { id: string; name: string; placement: number | null } | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/levels" className="inline-flex items-center gap-1.5 text-xs font-bold ui-dim hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          {t('levelslist.back')}
        </Link>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {prevLevel ? (
            <Link
              href={`/levels/${prevLevel.id}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border hover:opacity-90"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="truncate max-w-[140px]">
                {prevLevel.placement ? `#${prevLevel.placement}` : ''} {prevLevel.name}
              </span>
            </Link>
          ) : (
            <span
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border opacity-40"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              {t('levelslist.prev')}
            </span>
          )}
          {nextLevel ? (
            <Link
              href={`/levels/${nextLevel.id}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <span className="truncate max-w-[140px]">
                {nextLevel.placement ? `#${nextLevel.placement}` : ''} {nextLevel.name}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {t('levelslist.next')}
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

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
              #{level.placement || '-'}
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-black/50 text-white backdrop-blur-md border border-white/10 shadow-lg">
              {level.difficulty}
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/80 text-white backdrop-blur-md shadow-lg">
              {level.basePp} {t('leaderboard.points')}
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
            >
              {t('levelslist.submit_record')}
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="font-black text-lg ui-title flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            {t('levelslist.victors_list', { n: level.records.length })}
          </h3>

          <div className="ui-card overflow-hidden">
            {level.records.length === 0 ? (
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
                    {level.records.map((rec: any, idx: number) => (
                      <tr key={rec.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="px-5 py-3 text-center font-black" style={{ color: idx < 3 ? 'var(--accent)' : 'var(--text-dim)' }}>
                          #{idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold ui-title">
                          <Link href={`/profile/${rec.user.username}`} className="hover:underline flex items-center gap-2">
                            {rec.user.avatarUrl ? (
                              <img src={rec.user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">
                                {rec.user.username[0]}
                              </div>
                            )}
                            {rec.user.username}
                          </Link>
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
                          {rec.videoUrl && (
                            <a href={rec.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                              <Video className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
