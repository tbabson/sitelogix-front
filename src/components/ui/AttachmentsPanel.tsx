import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Paperclip, Image, Video, Music, File, Download, X } from 'lucide-react'
import { mediaApi } from '@/api/media'
import type { Media } from '@/types'

interface Props {
  logId?: string
  issueId?: string
}

const rawUrl = (id: string) => `/api/v1/media/${id}/raw`

function fileIcon(contentType: string) {
  if (contentType.startsWith('image')) return <Image size={13} className="text-blue-500" />
  if (contentType.startsWith('video')) return <Video size={13} className="text-purple-500" />
  if (contentType.startsWith('audio')) return <Music size={13} className="text-pink-500" />
  return <File size={13} className="text-slate-400" />
}

export function AttachmentsPanel({ logId, issueId }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Media | null>(null)

  const params = logId ? { log_id: logId } : issueId ? { issue_id: issueId } : null

  const { data, isLoading } = useQuery({
    queryKey: ['media-attachments', logId ?? issueId],
    queryFn: () => mediaApi.list(params!).then(r => r.data.data as Media[]),
    // Only fetch when the panel is opened — no N+1 on page load
    enabled: !!params && open,
  })

  const items = (data ?? []) as Media[]
  const images = items.filter(m => m.content_type.startsWith('image'))
  const others = items.filter(m => !m.content_type.startsWith('image'))

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-500 transition-colors"
      >
        <Paperclip size={11} />
        <span>{open ? 'Hide attachments' : 'Attachments'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-slate-400">Loading...</p>}

          {!isLoading && items.length === 0 && (
            <p className="text-xs text-slate-400 italic">No attachments</p>
          )}

          {/* Image thumbnails */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {images.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreview(m)}
                  className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity shrink-0"
                >
                  <img
                    src={rawUrl(m.id)}
                    alt={m.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Non-image files */}
          {others.length > 0 && (
            <div className="space-y-1">
              {others.map(m => (
                <a
                  key={m.id}
                  href={rawUrl(m.id)}
                  download={m.filename}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                >
                  {fileIcon(m.content_type)}
                  <span className="flex-1 text-xs text-slate-700 truncate">{m.filename}</span>
                  <Download size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image preview lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
            <img
              src={rawUrl(preview.id)}
              alt={preview.filename}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-white/80 text-sm truncate">{preview.filename}</p>
              <a
                href={rawUrl(preview.id)}
                download={preview.filename}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                <Download size={12} /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
