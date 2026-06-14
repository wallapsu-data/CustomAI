import { useState, useEffect } from 'react'
import {
  CheckCircle2, Circle, Loader2, XCircle, AlertTriangle,
  RefreshCw, Copy, ChevronDown, Zap, FileCheck, Brain,
  FileText, CheckCheck
} from 'lucide-react'

const STEPS = [
  {
    id: 'ingestion',
    label: 'File Ingestion & Validation',
    desc: 'Verifying file format, size, and readability',
    icon: FileCheck,
  },
  {
    id: 'workflow_triggered',
    label: 'n8n Workflow Triggered',
    desc: 'Webhook received — pipeline is now running',
    icon: Zap,
  },
  {
    id: 'llm_scanning',
    label: 'LLM Visual OCR Scanning',
    desc: 'GPT-4o Vision is reading your document',
    icon: Brain,
  },
  {
    id: 'extraction',
    label: 'Structured Text Extraction',
    desc: 'Parsing fields: vendor, amount, date, line items',
    icon: FileText,
  },
  {
    id: 'complete',
    label: 'Ready for Review',
    desc: 'All data extracted and validated',
    icon: CheckCheck,
  },
]

// Map workflow run status → which step is active
function getActiveStepIndex(workflowStatus) {
  switch (workflowStatus) {
    case 'pending':      return 0
    case 'triggered':    return 1
    case 'processing':   return 2
    case 'extracting':   return 3
    case 'completed':    return 5  // all done
    case 'failed':       return -1
    default:             return 0
  }
}

function StepIcon({ step, status }) {
  const Icon = step.icon

  if (status === 'completed') {
    return (
      <div className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 size={18} className="text-green-400" />
      </div>
    )
  }
  if (status === 'active') {
    return (
      <div className="relative w-10 h-10 flex-shrink-0">
        <div className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping-slow" />
        <div className="w-10 h-10 rounded-full bg-brand-600/30 border-2 border-brand-500 flex items-center justify-center relative">
          <Loader2 size={18} className="text-brand-400 animate-spin" />
        </div>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
        <XCircle size={18} className="text-red-400" />
      </div>
    )
  }
  // pending
  return (
    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-slate-500" />
    </div>
  )
}

function ErrorCard({ error, errorId, onRetry }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`Error ID: ${errorId}\n${error}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 animate-fade-in">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-300 text-sm">Workflow Error</p>
          <p className="text-red-400/80 text-sm mt-1">{error}</p>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-lg px-3 py-2 flex items-center justify-between gap-2 mb-3 font-mono text-xs">
        <span className="text-slate-500">Error ID:</span>
        <span className="text-slate-300">{errorId}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <Copy size={12} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-sm font-medium text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all duration-200"
      >
        <RefreshCw size={14} />
        Retry Workflow
      </button>
    </div>
  )
}

export default function WorkflowStatusTracker({
  workflowStatus = 'pending',
  error = null,
  errorId = null,
  selectedWorkflow,
  onWorkflowChange,
  onRetry,
  autoCompare = false,
  onAutoCompareChange,
  className = ''
}) {
  const [expanded, setExpanded] = useState(true)
  const activeIndex = getActiveStepIndex(workflowStatus)
  const isError = workflowStatus === 'failed'
  const isComplete = workflowStatus === 'completed'

  const WORKFLOW_OPTIONS = [
    { id: 'invoice_ocr',       label: 'Invoice OCR (Fast)',            est: '~10s' },
    { id: 'advanced_llm',      label: 'Advanced LLM Layout Analysis',  est: '~25s' },
    { id: 'document_comparison', label: 'Invoice Reconciliation',        est: '~20s' },
  ]

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <Zap size={15} className="text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Workflow Status</p>
            <p className="text-slate-500 text-xs capitalize">
              {isComplete ? '✓ Completed' : isError ? '⚠ Failed' : workflowStatus === 'pending' ? 'Waiting…' : 'Running…'}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 animate-fade-in">
          {/* Workflow Selector */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">AI Analysis Model</label>
              <select
                value={selectedWorkflow}
                onChange={e => onWorkflowChange?.(e.target.value)}
                className="input-field text-sm"
                disabled={workflowStatus !== 'pending'}
              >
                {WORKFLOW_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.est})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => onAutoCompareChange?.(!autoCompare)}
                  className={`w-10 h-5 rounded-full transition-all duration-200 relative cursor-pointer ${
                    autoCompare ? 'bg-brand-600' : 'bg-slate-700'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                    autoCompare ? 'left-5' : 'left-0.5'
                  }`} />
                </div>
                <span className="text-sm text-slate-300">Auto-compare on completion</span>
              </label>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              let status = 'pending'
              if (isError && i === activeIndex) status = 'error'
              else if (isComplete || i < activeIndex) status = 'completed'
              else if (i === activeIndex) status = 'active'

              return (
                <div key={step.id} className="relative">
                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div className={`absolute left-5 top-10 w-0.5 h-6 transition-colors duration-500 ${
                      status === 'completed' ? 'bg-green-500/40' : 'bg-slate-700/60'
                    }`} />
                  )}

                  <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    status === 'active'
                      ? 'bg-brand-600/10 border border-brand-500/20'
                      : status === 'completed'
                      ? 'opacity-80'
                      : 'opacity-40'
                  }`}>
                    <StepIcon step={step} status={status} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-none mb-1 ${
                        status === 'completed' ? 'text-green-300'
                        : status === 'active' ? 'text-white'
                        : status === 'error' ? 'text-red-300'
                        : 'text-slate-500'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500 leading-snug">{step.desc}</p>
                    </div>
                    {status === 'active' && (
                      <span className="text-xs text-brand-400 font-medium bg-brand-600/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        Running
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="text-xs text-green-400 font-medium flex-shrink-0">Done</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error card */}
          {isError && (
            <ErrorCard
              error={error || 'The workflow encountered an unexpected error.'}
              errorId={errorId || `ERR-${Date.now().toString(36).toUpperCase()}`}
              onRetry={onRetry}
            />
          )}

          {/* Complete banner */}
          {isComplete && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 animate-fade-in">
              <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-300">Extraction complete!</p>
                <p className="text-xs text-slate-400">Scroll down to review the structured data.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
