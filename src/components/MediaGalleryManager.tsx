import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { ApiMedia } from '../types';
import { parseApiError } from '../utils/apiErrors';
import {
  ImageIcon,
  Film,
  Upload,
  Link as LinkIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';

const MAX_MEDIAS = 10;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const extractVimeoId = (url: string): string | null => {
  const m = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
  return m ? m[1] : null;
};

const isVideoPlatformUrl = (url: string): boolean =>
  Boolean(extractYouTubeId(url)) || Boolean(extractVimeoId(url));

const mediaPreviewUrl = (media: ApiMedia): string =>
  toAbsoluteApiUrl(media.fichier, API_BASE_URL) || media.url_externe || '';

const mediaIsEmbedVideo = (media: ApiMedia): boolean =>
  media.type_media === 'VIDEO' && !media.fichier && isVideoPlatformUrl(media.url_externe || '');

const MediaEmbed = ({ media, className }: { media: ApiMedia; className?: string }) => {
  const url = media.url_externe || '';
  const yt = extractYouTubeId(url);
  const vimeo = extractVimeoId(url);
  const src = yt
    ? `https://www.youtube.com/embed/${yt}`
    : vimeo
    ? `https://player.vimeo.com/video/${vimeo}`
    : '';
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={media.id}
      className={className}
      frameBorder={0}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
};

const MediaThumb = ({ media }: { media: ApiMedia }) => {
  const url = mediaPreviewUrl(media);
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        <Film className="w-4 h-4" />
      </div>
    );
  }
  if (mediaIsEmbedVideo(media)) {
    return <MediaEmbed media={media} className="w-full h-full" />;
  }
  if (media.type_media === 'VIDEO' && media.fichier) {
    return (
      <video src={url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
    );
  }
  return <img referrerPolicy="no-referrer" src={url} alt="média événement" className="w-full h-full object-cover" />;
};

export const MediaGalleryManager: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [medias, setMedias] = useState<ApiMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [mode, setMode] = useState<'FILE' | 'URL'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const flash = useCallback((text: string, type: 'success' | 'error') => {
    setActionMsg({ text, type });
    window.setTimeout(() => setActionMsg(null), 4000);
  }, []);

  const loadMedias = useCallback(async () => {
    try {
      const res = await api.events.getMedias(eventId);
      const list = (res?.results || []).slice().sort((a, b) => a.ordre - b.ordre);
      setMedias(list);
    } catch (err) {
      flash(parseApiError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, flash]);

  useEffect(() => {
    loadMedias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const persistOrder = async (ordered: ApiMedia[]) => {
    setSavingOrder(true);
    try {
      const ids = ordered.map((m) => m.id);
      await api.events.reordonnerMedias(eventId, ids);
      flash('Ordre des médias enregistré.', 'success');
      const res = await api.events.getMedias(eventId);
      setMedias((res?.results || []).slice().sort((a, b) => a.ordre - b.ordre));
    } catch (err) {
      const parsed = parseApiError(err);
      flash(
        parsed.code === 'validation_echouee' || parsed.code === 'champ_invalide'
          ? `Ordre refusé : le backend attend la liste complète des ${MAX_MEDIAS} médias (ou moins actifs).`
          : parsed.message,
        'error'
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const moveMedia = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= medias.length || to >= medias.length) return;
    const next = medias.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMedias(next);
    persistOrder(next);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type === 'video/mp4';
    if (!isImage && !isVideo) {
      setSelectedFile(null);
      flash('Format non accepté : choisissez une photo (JPG/PNG/WebP) ou une vidéo MP4.', 'error');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setSelectedFile(null);
      flash('Vidéo trop volumineuse : la taille maximale est de 50 Mo.', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;

    if (medias.length >= MAX_MEDIAS) {
      flash(`Limite atteinte : ${MAX_MEDIAS} médias maximum par événement. Supprimez-en un avant d\'en ajouter.`, 'error');
      return;
    }

    if (mode === 'FILE') {
      if (!selectedFile) {
        flash('Veuillez choisir un fichier à téléverser (photo ou vidéo MP4).', 'error');
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('type_media', selectedFile.type === 'video/mp4' ? 'VIDEO' : 'IMAGE');
        fd.append('fichier', selectedFile);
        await api.events.addMedia(eventId, fd);
        setSelectedFile(null);
        flash('Média téléversé avec succès.', 'success');
        await loadMedias();
      } catch (err) {
        flash(parseApiError(err).message, 'error');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Mode URL externe : YouTube / Vimeo uniquement
    const url = externalUrl.trim();
    if (!url) {
      flash('Veuillez coller une URL YouTube ou Vimeo.', 'error');
      return;
    }
    if (!isVideoPlatformUrl(url)) {
      flash('URL non acceptée : seuls les liens YouTube et Vimeo sont autorisés pour une URL externe.', 'error');
      return;
    }
    setUploading(true);
    try {
      await api.events.addMedia(eventId, { type_media: 'VIDEO', url_externe: url });
      setExternalUrl('');
      flash('Vidéo externe ajoutée à la galerie.', 'success');
      await loadMedias();
    } catch (err) {
      flash(parseApiError(err).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (media: ApiMedia) => {
    if (!window.confirm('Supprimer définitivement ce média de la galerie ?')) return;
    try {
      await api.events.deleteMedia(eventId, media.id);
      setMedias((prev) => prev.filter((m) => m.id !== media.id));
      flash('Média supprimé.', 'success');
    } catch (err) {
      flash(parseApiError(err).message, 'error');
    }
  };

  const atLimit = medias.length >= MAX_MEDIAS;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-purple-600" />
          Galerie Médias de l'Événement
          <span className="text-[9px] font-mono text-slate-400 font-semibold">
            ({medias.length}/{MAX_MEDIAS})
          </span>
        </span>
        {savingOrder && (
          <span className="text-[9px] font-mono text-slate-400">Enregistrement de l'ordre…</span>
        )}
      </div>

      {actionMsg && (
        <div className={`p-2.5 rounded-xl text-[10px] font-bold flex items-start gap-2 border animate-fade-in ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {actionMsg.type === 'success'
            ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {loading ? (
        <p className="text-[11px] text-slate-400 py-4 text-center">Chargement des médias…</p>
      ) : medias.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-4 text-center">
          Aucun média. Ajoutez photos, vidéos MP4 ou liens YouTube/Vimeo.
        </p>
      ) : (
        <div className="space-y-1.5">
          {medias.map((media, idx) => (
            <div
              key={media.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== idx) moveMedia(dragIdx, idx);
                setDragIdx(null);
              }}
              className={`flex items-center gap-2 p-1.5 rounded-xl border bg-slate-50/60 transition-all ${
                dragIdx === idx ? 'border-purple-400 ring-2 ring-purple-200/50' : 'border-slate-200/80'
              }`}
            >
              <span className="text-slate-300 cursor-grab active:cursor-grabbing" title="Glisser pour réordonner">
                <GripVertical className="w-4 h-4" />
              </span>

              <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                <MediaThumb media={media} />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  media.type_media === 'VIDEO'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {media.type_media === 'VIDEO' ? mediaIsEmbedVideo(media) ? 'YOUTUBE/VIMEO' : 'VIDÉO' : 'IMAGE'}
                </span>
                <p className="text-[9px] font-mono text-slate-400 truncate">
                  ordre {media.ordre} • {media.date_ajout}
                </p>
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveMedia(idx, idx - 1)}
                  disabled={idx === 0 || savingOrder}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Monter"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMedia(idx, idx + 1)}
                  disabled={idx === medias.length - 1 || savingOrder}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Descendre"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(media)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer le média"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add area */}
      <div className={`pt-2 border-t border-slate-100 space-y-2 ${atLimit ? 'opacity-60 pointer-events-none' : ''}`}>
        {atLimit && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>
              Limite atteinte : {MAX_MEDIAS} médias maximum par événement. Supprimez un média pour en ajouter un nouveau.
            </span>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('FILE'); setExternalUrl(''); }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
              mode === 'FILE'
                ? 'bg-purple-50 border-purple-300 text-purple-800'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline-block mr-1" />
            Téléverser un fichier
          </button>
          <button
            type="button"
            onClick={() => { setMode('URL'); setSelectedFile(null); }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
              mode === 'URL'
                ? 'bg-purple-50 border-purple-300 text-purple-800'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 inline-block mr-1" />
            Lien YouTube / Vimeo
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-2">
          {mode === 'FILE' ? (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="p-3 rounded-xl border-2 border-dashed border-purple-300/70 bg-purple-50/40 hover:bg-purple-50 transition-colors flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                  {selectedFile ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {selectedFile ? selectedFile.name : 'Choisir une photo ou vidéo MP4'}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} Mo`
                      : 'JPG, PNG, WebP • MP4 ≤ 50 Mo'}
                  </p>
                </div>
                {selectedFile && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedFile(null);
                    }}
                    className="ml-auto p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                    title="Retirer le fichier"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </label>
          ) : (
            <div className="space-y-1">
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… ou https://vimeo.com/…"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
              />
              <p className="text-[9px] text-slate-400">
                Seuls les liens YouTube et Vimeo sont acceptés pour une URL externe.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || atLimit || (mode === 'FILE' && !selectedFile)}
            className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              uploading || atLimit || (mode === 'FILE' && !selectedFile)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {uploading ? 'Ajout en cours…' : 'Ajouter ce média'}
          </button>
        </form>
      </div>
    </div>
  );
};