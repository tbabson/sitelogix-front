import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Image, Video, Music, File, Trash2, Search, X, Download, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { mediaApi } from '@/api/media'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, formatFileSize } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { Media, Project } from '@/types'
import { cn } from '@/utils/cn'

const rawUrl = (id: string) => `/api/v1/media/${id}/raw`

function fileIcon(contentType: string) {
  if (contentType.startsWith('image')) return <Image size={18} className="text-blue-500" />
  if (contentType.startsWith('video')) return <Video size={18} className="text-purple-500" />
  if (contentType.startsWith('audio')) return <Music size={18} className="text-pink-500" />
  return <File size={18} className="text-slate-500" />
}

export function MediaPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Media | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['media', projectFilter],
    queryFn: () => mediaApi.list(projectFilter ? { project_id: projectFilter } : undefined).then(r => r.data),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list().then(r => r.data.data as Project[]),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); toast.success('Deleted') },
  })

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!projectFilter) { toast.error('Select a project first'); return }
    setUploading(true)
    let failed = 0
    for (const file of Array.from(files)) {
      try {
        await mediaApi.upload(file, projectFilter)
      } catch (err: unknown) {
        failed++
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? `Failed to upload ${file.name}`
        toast.error(msg)
      }
    }
    setUploading(false)
    if (failed < files.length) {
      qc.invalidateQueries({ queryKey: ['media'] })
      const ok = files.length - failed
      toast.success(`${ok} file${ok > 1 ? 's' : ''} uploaded`)
    }
  }

  const mediaItems = (data?.data ?? []) as Media[]
  const filtered = mediaItems.filter(m =>
    !search || m.filename.toLowerCase().includes(search.toLowerCase())
  )

  const projects = (projectsData ?? []) as Project[]
  const images = filtered.filter(m => m.content_type.startsWith('image'))
  const others = filtered.filter(m => !m.content_type.startsWith('image'))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm outline-none focus:border-orange-400 w-48"
            />
          </div>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-sm outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,video/quicktime,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
          <Button
            icon={<Upload size={14} />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Drop zone hint */}
      {!projectFilter && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
          <span className="text-amber-500">💡</span>
          Select a project above to upload files
        </div>
      )}

      {isLoading ? (
        <Spinner fullPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Image size={22} />}
          title="No media files"
          description="Upload photos, videos, and documents from your site"
          action={
            <Button icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>
              Upload Files
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Image gallery */}
          {images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Photos ({images.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {images.map((m) => (
                  <div
                    key={m.id}
                    className="relative group bg-slate-100 rounded-xl overflow-hidden aspect-square cursor-pointer"
                    onClick={() => setPreview(m)}
                  >
                    <img
                      src={rawUrl(m.id)}
                      alt={m.filename}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all">
                        <button
                          onClick={e => { e.stopPropagation(); setPreview(m) }}
                          className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
                        >
                          <Eye size={13} className="text-slate-700" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteMutation.mutate(m.id) }}
                          className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
                        >
                          <Trash2 size={13} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-white text-xs truncate">{m.filename}</p>
                      <p className="text-white/70 text-xs">{formatFileSize(m.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other files */}
          {others.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Files ({others.length})</h3>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {others.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      {fileIcon(m.content_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.filename}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(m.size)} · {formatDate(m.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <a
                        href={rawUrl(m.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(m.id) }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={rawUrl(preview.id)}
              alt={preview.filename}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <p className="text-white font-medium">{preview.filename}</p>
                <p className="text-white/60 text-sm">{formatFileSize(preview.size)} · {formatDate(preview.created_at)}</p>
              </div>
              <a
                href={rawUrl(preview.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                <Download size={13} /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
