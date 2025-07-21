"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Presentation, Settings, Check, Loader2, ImageIcon, Palette, Layout } from "lucide-react"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  slideCount: number
  slides?: any[]
}

export function ExportDialog({ open, onOpenChange, projectName, slideCount, slides = [] }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "pptx" | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportComplete, setExportComplete] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async (format: "pdf" | "pptx") => {
    if (!slides || slides.length === 0) {
      setExportError("No slides available for export")
      return
    }

    setSelectedFormat(format)
    setIsExporting(true)
    setExportProgress(0)
    setExportError(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 300)

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

      setExportProgress(100)
      setIsExporting(false)
      setExportComplete(true)

      setTimeout(() => {
        setExportComplete(false)
        setSelectedFormat(null)
        onOpenChange(false)
      }, 2000)
    } catch (error) {
      console.error("Export error:", error)
      setExportError(error instanceof Error ? error.message : "Export failed")
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const resetDialog = () => {
    setSelectedFormat(null)
    setIsExporting(false)
    setExportProgress(0)
    setExportComplete(false)
    setExportError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) resetDialog()
      }}
    >
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#027659] to-[#10b981] rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5 text-white" />
            </div>
            <span>Export Presentation</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-8">
          {!selectedFormat && !isExporting && !exportComplete && !exportError && (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-gradient-to-r from-[#027659]/5 to-[#10b981]/5 rounded-xl p-6 border border-[#027659]/20 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{projectName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{slideCount} slides ready for export</p>
                  </div>
                  <Badge variant="secondary" className="bg-[#027659]/10 text-[#027659] border-[#027659]/20">
                    Ready
                  </Badge>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-6">
                <h4 className="font-semibold text-gray-900 text-xl mb-6">Choose export format:</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PDF Option */}
                  <Card
                    className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-[#027659]/30 bg-gradient-to-br from-[#027659]/5 to-[#10b981]/5 hover:scale-105"
                    onClick={() => handleExport("pdf")}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-[#027659] to-[#10b981] rounded-2xl flex items-center justify-center">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">PDF Document</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Perfect for sharing and printing. Maintains formatting across all devices.
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ImageIcon className="h-3 w-3" />
                          <span>High Quality</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Layout className="h-3 w-3" />
                          <span>Fixed Layout</span>
                        </div>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-[#027659] to-[#10b981] hover:from-[#065f46] hover:to-[#059669] text-white">
                        Export as PDF
                      </Button>
                    </div>
                  </Card>

                  {/* PowerPoint Option */}
                  <Card
                    className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-[#10b981]/30 bg-gradient-to-br from-[#10b981]/5 to-[#34d399]/5 hover:scale-105"
                    onClick={() => handleExport("pptx")}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-[#10b981] to-[#34d399] rounded-2xl flex items-center justify-center">
                        <Presentation className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">PowerPoint</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Editable presentation for Microsoft PowerPoint and compatible apps.
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Settings className="h-3 w-3" />
                          <span>Editable</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Palette className="h-3 w-3" />
                          <span>Customizable</span>
                        </div>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-[#10b981] to-[#34d399] hover:from-[#059669] hover:to-[#10b981] text-white">
                        Export as PowerPoint
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-[#027659] to-[#10b981] rounded-2xl flex items-center justify-center mx-auto">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Exporting to {selectedFormat?.toUpperCase()}...
                </h3>
                <p className="text-gray-600 mb-4">Processing {slideCount} slides with high-quality rendering</p>
              </div>

              <div className="space-y-2">
                <Progress value={exportProgress} className="w-full h-3" />
                <p className="text-sm text-gray-500">{exportProgress}% complete</p>
              </div>

              <div className="bg-[#027659]/5 rounded-xl p-4 border border-[#027659]/20">
                <p className="text-sm text-[#027659]">
                  This may take a few moments depending on the number of slides and complexity.
                </p>
              </div>
            </div>
          )}

          {/* Export Complete */}
          {exportComplete && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-[#10b981] to-[#34d399] rounded-2xl flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-white" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Export Complete!</h3>
                <p className="text-gray-600">
                  Your presentation has been exported as {selectedFormat?.toUpperCase()} and downloaded.
                </p>
              </div>

              <div className="bg-[#10b981]/10 rounded-xl p-4 border border-[#10b981]/20">
                <p className="text-sm text-[#10b981]">
                  ✅ File saved: {projectName}.{selectedFormat}
                </p>
              </div>
            </div>
          )}

          {/* Export Error */}
          {exportError && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="h-10 w-10 text-white" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Export Failed</h3>
                <p className="text-gray-600 mb-4">{exportError}</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={resetDialog} variant="outline">
                  Try Again
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-gradient-to-r from-[#027659] to-[#10b981] hover:from-[#065f46] hover:to-[#059669] text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
