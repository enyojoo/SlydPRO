"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileText, Presentation, Download, CheckCircle, AlertCircle } from "lucide-react"
import { SlideExporter, downloadFile, type ExportSlide, type ExportProgress } from "@/lib/export-utils"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  slides: ExportSlide[]
  presentationTitle: string
}

export function ExportDialog({ isOpen, onClose, slides, presentationTitle }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  const handleExport = async (format: "pdf" | "pptx") => {
    if (!slides || slides.length === 0) {
      setExportError("No slides available to export")
      return
    }

    setIsExporting(true)
    setExportError(null)
    setExportSuccess(null)
    setExportProgress(null)

    try {
      const exporter = new SlideExporter((progress) => {
        setExportProgress(progress)
      })

      let blob: Blob
      let filename: string

      if (format === "pdf") {
        blob = await exporter.exportToPDF(slides, presentationTitle)
        filename = `${presentationTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`
      } else {
        blob = await exporter.exportToPowerPoint(slides, presentationTitle)
        filename = `${presentationTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`
      }

      await downloadFile(blob, filename)
      setExportSuccess(`Successfully exported ${format.toUpperCase()}!`)

      // Auto-close after success
      setTimeout(() => {
        onClose()
        setExportSuccess(null)
        setExportProgress(null)
      }, 2000)
    } catch (error) {
      console.error("Export error:", error)
      setExportError(error instanceof Error ? error.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const resetDialog = () => {
    setExportError(null)
    setExportSuccess(null)
    setExportProgress(null)
    setIsExporting(false)
  }

  const handleClose = () => {
    if (!isExporting) {
      resetDialog()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Presentation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Progress */}
          {exportProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{exportProgress.stage}</span>
                <span className="text-muted-foreground">
                  {exportProgress.currentSlide && exportProgress.totalSlides
                    ? `${exportProgress.currentSlide}/${exportProgress.totalSlides}`
                    : `${exportProgress.progress}%`}
                </span>
              </div>
              <Progress value={exportProgress.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{exportProgress.message}</p>
            </div>
          )}

          {/* Success Message */}
          {exportSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">{exportSuccess}</span>
            </div>
          )}

          {/* Error Message */}
          {exportError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{exportError}</span>
            </div>
          )}

          {/* Export Options */}
          {!exportProgress && !exportSuccess && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Choose your export format:</div>

              <div className="grid grid-cols-1 gap-3">
                {/* PDF Export */}
                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">Export as PDF</div>
                      <div className="text-sm text-muted-foreground">High-quality PDF for sharing and printing</div>
                    </div>
                  </div>
                </Button>

                {/* PowerPoint Export */}
                <Button
                  variant="outline"
                  className="h-auto p-4 justify-start bg-transparent"
                  onClick={() => handleExport("pptx")}
                  disabled={isExporting}
                >
                  <div className="flex items-center gap-3">
                    <Presentation className="w-8 h-8 text-orange-600" />
                    <div className="text-left">
                      <div className="font-medium">Export as PowerPoint</div>
                      <div className="text-sm text-muted-foreground">Editable PPTX file for Microsoft PowerPoint</div>
                    </div>
                  </div>
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Slides: {slides.length} • Title: {presentationTitle}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {exportError && (
              <Button variant="outline" onClick={resetDialog} disabled={isExporting}>
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={isExporting}>
              {exportSuccess ? "Done" : "Cancel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
