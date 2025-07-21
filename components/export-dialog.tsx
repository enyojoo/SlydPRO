"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, FileText, Presentation, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  slideCount: number
  slides?: any[]
}

export function ExportDialog({ open, onOpenChange, projectName, slideCount, slides = [] }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">("idle")
  const [exportMessage, setExportMessage] = useState("")
  const [exportType, setExportType] = useState<"pdf" | "pptx" | null>(null)

  const handleExport = async (format: "pdf" | "pptx") => {
    if (!slides || slides.length === 0) {
      setExportStatus("error")
      setExportMessage("No slides available to export")
      return
    }

    setIsExporting(true)
    setExportStatus("exporting")
    setExportType(format)
    setExportProgress(0)
    setExportMessage(`Preparing ${format.toUpperCase()} export...`)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 200)

      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slides,
          projectName,
        }),
      })

      clearInterval(progressInterval)
      setExportProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to export ${format.toUpperCase()}`)
      }

      // Get the file blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${projectName || "presentation"}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setExportStatus("success")
      setExportMessage(`${format.toUpperCase()} exported successfully!`)

      // Auto close after success
      setTimeout(() => {
        onOpenChange(false)
        setExportStatus("idle")
        setExportProgress(0)
        setExportMessage("")
        setExportType(null)
      }, 2000)
    } catch (error) {
      console.error("Export error:", error)
      setExportStatus("error")
      setExportMessage(error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()}`)
    } finally {
      setIsExporting(false)
    }
  }

  const resetDialog = () => {
    setExportStatus("idle")
    setExportProgress(0)
    setExportMessage("")
    setExportType(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) resetDialog()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Presentation</span>
          </DialogTitle>
          <DialogDescription>Export your presentation with {slideCount} slides as PDF or PowerPoint.</DialogDescription>
        </DialogHeader>

        {exportStatus === "idle" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-red-50 hover:border-red-200 bg-transparent"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                <FileText className="h-8 w-8 text-red-600" />
                <div className="text-center">
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-muted-foreground">For sharing</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-orange-50 hover:border-orange-200 bg-transparent"
                onClick={() => handleExport("pptx")}
                disabled={isExporting}
              >
                <Presentation className="h-8 w-8 text-orange-600" />
                <div className="text-center">
                  <div className="font-medium">PowerPoint</div>
                  <div className="text-xs text-muted-foreground">For editing</div>
                </div>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              <p>
                <strong>PDF:</strong> Perfect for sharing and viewing
              </p>
              <p>
                <strong>PowerPoint:</strong> Fully editable in Microsoft PowerPoint
              </p>
            </div>
          </div>
        )}

        {exportStatus === "exporting" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="font-medium">Exporting {exportType?.toUpperCase()}...</div>
                <div className="text-sm text-muted-foreground">{exportMessage}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {exportStatus === "success" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <div>
                <div className="font-medium">Export Successful!</div>
                <div className="text-sm text-muted-foreground">{exportMessage}</div>
              </div>
            </div>
          </div>
        )}

        {exportStatus === "error" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <div>
                <div className="font-medium">Export Failed</div>
                <div className="text-sm text-muted-foreground">{exportMessage}</div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={resetDialog} className="flex-1 bg-transparent">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
