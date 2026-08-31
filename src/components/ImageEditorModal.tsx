'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  RotateCw, 
  ZoomIn, 
  Maximize2, 
  Sliders, 
  Check, 
  RefreshCw,
  Image as ImageIcon,
  MoveHorizontal,
  MoveVertical,
  Droplet
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { uploadImagesToUt } from '@/lib/uploadthingClient';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  type: 'avatar' | 'cover';
  currentImage?: string;
}

export default function ImageEditorModal({
  isOpen,
  onClose,
  onSave,
  type,
  currentImage,
}: ImageEditorModalProps) {
  const { t } = useLanguage();
  const [imageSrc, setImageSrc] = useState<string | null>(currentImage || null);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [skewX, setSkewX] = useState<number>(0);
  const [skewY, setSkewY] = useState<number>(0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [blurAmount, setBlurAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGifSource, setIsGifSource] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string>('');

  const maxBytes = type === 'avatar' ? 10 * 1024 * 1024 : 20 * 1024 * 1024;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const gifFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(currentImage || null);
      setScale(1);
      setRotation(0);
      setSkewX(0);
      setSkewY(0);
      setOffsetX(0);
      setOffsetY(0);
      setBlurAmount(0);
      setIsGifSource(false);
      setFileError('');
      gifFileRef.current = null;
    }
  }, [isOpen, currentImage]);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
    }
  }, [imageSrc]);

  // Redraw canvas whenever any transform changes
  useEffect(() => {
    if (imgRef.current) {
      drawCanvas();
    }
  }, [scale, rotation, skewX, skewY, offsetX, offsetY, blurAmount]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = type === 'avatar' ? 400 : 800;
    const height = type === 'avatar' ? 400 : 260;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Save state
    ctx.save();

    // Center transform point
    ctx.translate(width / 2 + offsetX, height / 2 + offsetY);

    // Apply rotation (rad)
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply skew: transform(scaleX, skewY, skewX, scaleY, 0, 0)
    const radSkewX = (skewX * Math.PI) / 180;
    const radSkewY = (skewY * Math.PI) / 180;
    ctx.transform(scale, Math.tan(radSkewY), Math.tan(radSkewX), scale, 0, 0);

    // Draw image centered
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawW = width;
    let drawH = height;

    if (imgAspect > canvasAspect) {
      drawH = height;
      drawW = height * imgAspect;
    } else {
      drawW = width;
      drawH = width / imgAspect;
    }

    if (blurAmount > 0) {
      ctx.filter = `blur(${blurAmount}px)`;
    }
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.filter = 'none';

    // Restore state
    ctx.restore();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    if (file.size > maxBytes) {
      setFileError(
        type === 'avatar'
          ? t('editor.max_avatar', { mb: '10' })
          : t('editor.max_cover', { mb: '20' })
      );
      return;
    }

    const isGif = file.type === 'image/gif';
    setIsGifSource(isGif);
    gifFileRef.current = isGif ? file : null;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        setScale(1);
        setRotation(0);
        setSkewX(0);
        setSkewY(0);
        setOffsetX(0);
        setOffsetY(0);
        setBlurAmount(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setSkewX(0);
    setSkewY(0);
    setOffsetX(0);
    setOffsetY(0);
    setBlurAmount(0);
  };

    const handleSave = async () => {
    if (!imageSrc) return;

    setIsSaving(true);
    try {
      let file: File;
      if (isGifSource && gifFileRef.current) {
        const orig = gifFileRef.current;
        const ext = (orig.name.split('.').pop() || 'gif').replace(/[^a-z0-9]/gi, '') || 'gif';
        file = new File([orig], `${type}-${Date.now()}.${ext}`, { type: orig.type || 'image/gif' });
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.88)
        );
        if (!blob) throw new Error('Could not encode image');
        file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      }

      const [url] = await uploadImagesToUt([file]);
      await onSave(url);
      onClose();
    } catch (e) {
      alert(t('editor.save_error', { msg: (e as any).message }));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-2xl rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm ui-title">
                {type === 'avatar' ? t('editor.avatar') : t('editor.cover')}
              </h3>
              <p className="text-[11px] ui-dim">{t('editor.hint')}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl ui-dim hover:opacity-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload Trigger / Canvas Area */}
        <div className="space-y-3">
          {!imageSrc ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-8 text-center space-y-2 cursor-pointer hover:opacity-90 transition-all"
              style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                <Upload className="w-6 h-6" />
              </div>
              <div className="font-bold text-xs ui-title">{t('editor.select_file')}</div>
              <div className="text-[11px] ui-dim">
                {type === 'avatar' ? t('editor.formats_avatar') : t('editor.formats_cover')}
              </div>
              {fileError && <div className="text-[11px] text-red-500 font-medium">{fileError}</div>}
            </div>
          ) : (
              <div className="space-y-3">
              {/* Canvas Preview Container */}
              <div className="flex items-center justify-center p-2 rounded-2xl bg-black/10 dark:bg-black/40 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className={`border shadow-md max-h-56 max-w-full object-contain ${
                    type === 'avatar' ? 'rounded-full aspect-square w-44' : 'rounded-xl aspect-[16/6] w-full'
                  }`}
                  style={{ borderColor: 'var(--border-ui)' }}
                />
              </div>

              {/* Change Image Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <Upload className="w-3.5 h-3.5" /> {t('editor.pick_other')}
                </button>
              </div>

              {/* Transformation Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl ui-subtle text-xs">
                {/* Scale / Zoom */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><ZoomIn className="w-3 h-3" /> {t('editor.zoom')}:</span>
                    <span className="font-bold ui-title">{scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Pan X */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><MoveHorizontal className="w-3 h-3" /> {t('editor.pan_x')}:</span>
                    <span className="font-bold ui-title">{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Pan Y */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><MoveVertical className="w-3 h-3" /> {t('editor.pan_y')}:</span>
                    <span className="font-bold ui-title">{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><RotateCw className="w-3 h-3" /> {t('editor.rotate')}:</span>
                    <span className="font-bold ui-title">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Skew X */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><Sliders className="w-3 h-3" /> {t('editor.skew_x')}:</span>
                    <span className="font-bold ui-title">{skewX}°</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={skewX}
                    onChange={(e) => setSkewX(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="ui-dim font-medium flex items-center gap-1"><Droplet className="w-3 h-3" /> {t('editor.blur')}:</span>
                    <span className="font-bold ui-title">{blurAmount}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={blurAmount}
                    onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {imageSrc ? (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs ui-dim hover:opacity-100 font-semibold"
            >
              <RefreshCw className="w-3 h-3" /> {t('editor.reset_default')}
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
            >
              {t('editor.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!imageSrc || isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? t('editor.saving') : t('editor.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
