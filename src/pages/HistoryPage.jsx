import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle2, Clock, XCircle, Loader2,
  Image, File, Search, ChevronRight, RefreshCw, Upload
} from 'lucide-react'
import { getDocuments } from '../lib/supabase.js'

const STATUS_CONFIG = {
  completed:  { label: 'Completed', icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  processing: { label: 'Processing', icon: Loader2,     color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
  failed:     { label: 'Failed',     icon: XCircle,     color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
  uploaded:   { label: 'Uploaded',   icon: Clock,       color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  pending:    { label: 'Pending',    icon: Clock,       color: 'text-slate-400', bg: 'bg-slate-700/30', border: 'border-slate-600/30' },
}

function FileTypeIcon({ type }) {
  if (type?.startsWith('image/')) return <Image size={18} className="text-blue-400" />
  if (type === 'application/pdf') return <FileText size={18} className="text-red-400" />
  return <File size={18} className="text-slate-400" />
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => { loadDocuments() }, [])

  async function loadDocuments() {
    try {
      setLoading(true)
      setError(null)
      const docs = await getDocuments(50)
      setDocuments(docs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = documents.filter(d =>
    d.file_name?.toLowerCase().includes(search.toLowerCase())
  )

  const getDocStatus = (doc) => {
    if (doc.workflow_runs?.length) {
      const latest = doc.workflow_runs[doc.workflow_runs.length - 1]
      return latest.status || 'pending'
    }
    return doc.status || 'uploaded'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Document History</h1>
          <p className="text-slate-400">{documents.length} documents processed</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDocuments} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => navigate('/app/upload')} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Upload size={14} /> New Scan
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search documents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-brand-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-2">
            {search ? 'No matching documents' : 'No documents yet'}
          </p>
          {!search && (
            <button onClick={() => navigate('/app/upload')} className="btn-primary text-sm mt-4">
              Upload your first invoice
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const status = getDocStatus(doc)
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            const isComplete = status === 'completed'
            const hasResults = doc.ocr_results?.length > 0 || isComplete

            return (
              <div
                key={doc.id}
                onClick={() => hasResults && navigate(`/app/results/${doc.id}`)}
                className={`flex items-center gap-4 p-4 rounded-2xl border bg-slate-900/60 transition-all duration-200 ${
                  hasResults
                    ? 'cursor-pointer hover:bg-slate-800/60 hover:border-slate-700 border-slate-800'
                    : 'border-slate-800/60 opacity-70'
                }`}
              >
                {/* File icon */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <FileTypeIcon type={doc.file_type} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{doc.file_name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {formatDate(doc.created_at)} · {formatBytes(doc.file_size)}
                  </p>
                </div>

                {/* Status badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border} flex-shrink-0`}>
                  <StatusIcon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
                  {cfg.label}
                </div>

                {/* Arrow */}
                {hasResults && (
                  <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
