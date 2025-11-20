"use client"

import { useState, useEffect } from 'react'
import { LegacyRepo } from '@/types/legacy-repo'
import SvgUpload from './SvgUpload'

interface RepoFormProps {
  repo?: LegacyRepo | null
  onSave: (repo: Partial<LegacyRepo>) => void
  onCancel: () => void
}

export default function RepoForm({ repo, onSave, onCancel }: RepoFormProps) {
  const [formData, setFormData] = useState({
    repo_name: repo?.repo_name || '',
    github_url: repo?.github_url || '',
    created_by: repo?.created_by || '',
    created_at: repo?.created_at
      ? new Date(repo.created_at).toISOString().slice(0, 16)
      : '',
    svg_image_url: repo?.svg_image_url || null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.repo_name.trim()) {
      newErrors.repo_name = 'Repo name is required'
    }
    if (!formData.github_url.trim()) {
      newErrors.github_url = 'GitHub URL is required'
    } else if (!formData.github_url.startsWith('http')) {
      newErrors.github_url = 'Please enter a valid URL'
    }
    if (!formData.created_by.trim()) {
      newErrors.created_by = 'Creator username is required'
    }
    if (!formData.created_at) {
      newErrors.created_at = 'Creation date is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      ...formData,
      created_at: new Date(formData.created_at).toISOString(),
    })
  }

  const handleSvgUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, svg_image_url: url }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="repo_name" className="block text-sm font-medium mb-1">
          Repo Name *
        </label>
        <input
          id="repo_name"
          type="text"
          value={formData.repo_name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, repo_name: e.target.value }))
          }
          className="w-full px-3 py-2 border border-foreground/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.repo_name && (
          <p className="text-sm text-red-500 mt-1">{errors.repo_name}</p>
        )}
      </div>

      <div>
        <label htmlFor="github_url" className="block text-sm font-medium mb-1">
          GitHub URL *
        </label>
        <input
          id="github_url"
          type="url"
          value={formData.github_url}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, github_url: e.target.value }))
          }
          className="w-full px-3 py-2 border border-foreground/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.github_url && (
          <p className="text-sm text-red-500 mt-1">{errors.github_url}</p>
        )}
      </div>

      <div>
        <label htmlFor="created_by" className="block text-sm font-medium mb-1">
          Created By (Username) *
        </label>
        <input
          id="created_by"
          type="text"
          value={formData.created_by}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, created_by: e.target.value }))
          }
          className="w-full px-3 py-2 border border-foreground/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.created_by && (
          <p className="text-sm text-red-500 mt-1">{errors.created_by}</p>
        )}
      </div>

      <div>
        <label htmlFor="created_at" className="block text-sm font-medium mb-1">
          Creation Date *
        </label>
        <input
          id="created_at"
          type="datetime-local"
          value={formData.created_at}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, created_at: e.target.value }))
          }
          className="w-full px-3 py-2 border border-foreground/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.created_at && (
          <p className="text-sm text-red-500 mt-1">{errors.created_at}</p>
        )}
      </div>

      <SvgUpload
        onUploadComplete={handleSvgUpload}
        existingUrl={formData.svg_image_url}
        repoId={repo?.id}
      />

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
        >
          {repo ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

