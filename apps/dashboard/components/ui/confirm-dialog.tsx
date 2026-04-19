'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm rounded-xl bg-[#0d0d24] border border-[rgba(139,92,246,0.12)] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 p-2 rounded-lg ${variant === 'danger' ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[rgba(251,191,36,0.1)]'}`}
              >
                <AlertTriangle
                  size={18}
                  className={variant === 'danger' ? 'text-[#ef4444]' : 'text-[#fbbf24]'}
                />
              </div>
              <div className="flex-1">
                <h3 id="confirm-title" className="text-sm font-semibold text-[#ededed]">
                  {title}
                </h3>
                <p id="confirm-desc" className="text-xs text-[#737373] mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'secondary'}
                size="sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
