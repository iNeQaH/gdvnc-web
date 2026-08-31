'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TIERS } from '@/lib/timeline/tiers';
import { toDateInput, fromDateInput, TIMELINE_ORIGIN, timelineEnd } from '@/lib/timeline/time';
import type { ChronicleEvent, TimelineNature, TimelineTierId } from '@/lib/timeline/types';
import type { DictKey } from '@/lib/dictionaries';

const TIER_KEYS: Record<TimelineTierId, DictKey> = {
  '5y': 'timeline.tier.5y',
  '1y': 'timeline.tier.1y',
  '6m': 'timeline.tier.6m',
  '1m': 'timeline.tier.1m',
  week: 'timeline.tier.week',
  day: 'timeline.tier.day',
};

const empty = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  image: '',
  glowColor: '',
  start: '',
  end: '',
  approximate: false,
  nature: 'positive' as TimelineNature,
  tier: '1y' as TimelineTierId,
};

export default function EventForm({
  event,
  onClose,
  onSave,
  t,
}: {
  event?: ChronicleEvent;
  onClose: () => void;
  onSave: (next: ChronicleEvent) => void;
  t: (key: DictKey) => string;
}) {
  const [form, setForm] = useState(empty);
  const minDate = toDateInput(TIMELINE_ORIGIN);
  const maxDate = toDateInput(timelineEnd());

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title ?? '',
        shortDescription: event.shortDescription ?? '',
        fullDescription: event.fullDescription ?? '',
        image: event.image ?? '',
        glowColor: event.glowColor ?? '',
        start: toDateInput(event.start),
        end: toDateInput(event.end ?? event.start),
        approximate: Boolean(event.approximate),
        nature: event.nature ?? 'positive',
        tier: event.tier ?? '1y',
      });
    } else {
      setForm(empty);
    }
  }, [event]);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const start = fromDateInput(form.start);
    const end = fromDateInput(form.end) ?? start;
    if (!form.title.trim() || start == null) return;
    onSave({
      ...(event ?? { id: '' }),
      id: event?.id ?? '',
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      fullDescription: form.fullDescription,
      image: form.image.trim(),
      glowColor: form.glowColor.trim() || null,
      start,
      end: end != null && end < start ? start : (end ?? start),
      approximate: form.approximate,
      nature: form.nature,
      tier: form.tier,
    });
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="form-sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{event ? t('timeline.form_edit') : t('timeline.form_new')}</h3>
        <div className="field">
          <label>{t('timeline.title_field')}</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div className="field">
          <label>{t('timeline.short')}</label>
          <input
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            placeholder={t('timeline.short_ph')}
          />
        </div>
        <div className="field">
          <label>{t('timeline.full')}</label>
          <textarea
            value={form.fullDescription}
            onChange={(e) => set('fullDescription', e.target.value)}
            placeholder="<p>…</p>"
          />
        </div>
        <div className="field">
          <label>{t('timeline.image')}</label>
          <input
            value={form.image}
            onChange={(e) => set('image', e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="field">
          <label>{t('timeline.glow_color')}</label>
          <div className="glow-pick">
            <input
              type="color"
              value={form.glowColor || '#f59e0b'}
              onChange={(e) => set('glowColor', e.target.value)}
              aria-label={t('timeline.glow_color')}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={!form.glowColor}
                onChange={(e) => set('glowColor', e.target.checked ? '' : '#f59e0b')}
              />
              {t('timeline.glow_off')}
            </label>
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label>{t('timeline.from')}</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={form.start}
              onChange={(e) => set('start', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>{t('timeline.to')}</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={form.end}
              onChange={(e) => set('end', e.target.value)}
            />
          </div>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.approximate}
            onChange={(e) => set('approximate', e.target.checked)}
          />
          {t('timeline.approx')}
        </label>
        <div className="row-2">
          <div className="field">
            <label>{t('timeline.tier')}</label>
            <select
              value={form.tier}
              onChange={(e) => set('tier', e.target.value as TimelineTierId)}
            >
              {TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {t(TIER_KEYS[tier.id])}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('timeline.nature')}</label>
            <div className="nature-toggle">
              <button
                type="button"
                className={`pos ${form.nature === 'positive' ? 'on' : ''}`}
                onClick={() => set('nature', 'positive')}
              >
                {t('timeline.positive')}
              </button>
              <button
                type="button"
                className={`neg ${form.nature === 'negative' ? 'on' : ''}`}
                onClick={() => set('nature', 'negative')}
              >
                {t('timeline.negative')}
              </button>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="gold-btn" type="submit">
            {t('timeline.save')}
          </button>
          <button className="gold-btn ghost" type="button" onClick={onClose}>
            {t('timeline.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
