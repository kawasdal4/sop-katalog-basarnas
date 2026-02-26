'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExcelViewer } from './ExcelViewer'

interface ExcelViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentName?: string
}

export function ExcelViewerDialog({ 
  open, 
  onOpenChange, 
  documentId,
  documentName 
}: ExcelViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Excel Viewer - {documentName || 'Document'}
          </DialogTitle>
        </DialogHeader>
        <div className="h-[90vh]">
          <ExcelViewer 
            documentId={documentId} 
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
