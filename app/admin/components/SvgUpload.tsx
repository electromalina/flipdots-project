"use client"

import { useState } from 'react'

interface SvgUploadProps {
  onUploadComplete: (url: string) => void
  existingUrl?: string | null
  repoId?: string
}

export default function SvgUpload({
  onUploadComplete,
  existingUrl,
  repoId,
}: SvgUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(existingUrl || null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      setError('Please select an SVG file')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (repoId) {
        formData.append('repoId', repoId)
      }

      const response = await fetch('/api/upload-svg', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setPreview(data.url)
        onUploadComplete(data.url)
      } else {
        setError(data.error || 'Failed to upload file')
      }
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">SVG Image</label>
      <input
        type="file"
        accept=".svg,image/svg+xml"
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {uploading && (
        <p className="text-sm text-foreground/60">Uploading...</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {preview && (
        <div className="mt-2">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-32 border border-foreground/20 rounded"
          />
        </div>
      )}
    </div>
  )
}

