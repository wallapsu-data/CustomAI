const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.scgjwd.com/webhook/ocr-trigger'

/**
 * Trigger the n8n OCR workflow
 * @param {object} payload - { documentId, fileUrl, fileName, workflowType, runId }
 */
export async function triggerOcrWorkflow(payload) {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: payload.documentId,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName,
      workflowType: payload.workflowType || 'invoice_ocr',
      runId: payload.runId,
      callbackUrl: `${window.location.origin}/api/ocr-callback`,
      timestamp: new Date().toISOString(),
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`n8n webhook failed: ${response.status} – ${text}`)
  }

  const result = await response.json().catch(() => ({ status: 'triggered' }))
  return result
}

/**
 * Poll n8n execution status (fallback if realtime isn't available)
 */
export async function pollWorkflowStatus(runId, maxAttempts = 60, intervalMs = 3000) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const poll = async () => {
      attempts++
      if (attempts > maxAttempts) {
        reject(new Error('Workflow timed out after 3 minutes'))
        return
      }

      try {
        // Check Supabase for status update (n8n callbacks update the DB)
        const { getWorkflowRun } = await import('./supabase.js')
        const run = await getWorkflowRun(runId)

        if (run.status === 'completed') {
          resolve(run)
        } else if (run.status === 'failed') {
          reject(new Error(run.error_message || 'Workflow failed'))
        } else {
          setTimeout(poll, intervalMs)
        }
      } catch (err) {
        reject(err)
      }
    }

    setTimeout(poll, intervalMs)
  })
}

export const WORKFLOW_TYPES = {
  INVOICE_OCR: {
    id: 'invoice_ocr',
    label: 'Invoice & Receipt OCR',
    description: 'Extract vendor, amount, tax, line items',
    icon: '🧾',
    estimatedSeconds: 15,
  },
  ADVANCED_LLM: {
    id: 'advanced_llm',
    label: 'Advanced LLM Layout Analysis',
    description: 'Deep structure extraction with GPT-4o vision',
    icon: '🤖',
    estimatedSeconds: 30,
  },
  DOCUMENT_COMPARISON: {
    id: 'document_comparison',
    label: 'Document Comparison',
    description: 'Compare two documents for differences',
    icon: '🔍',
    estimatedSeconds: 25,
  },
}
