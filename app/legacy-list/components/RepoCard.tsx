"use client"

import { LegacyRepo } from '@/types/legacy-repo'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface RepoCardProps {
  repo: LegacyRepo
}

export default function RepoCard({ repo }: RepoCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(repo.github_url)
      setCopied(true)
      toast.success('GitHub URL copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy URL')
    }
  }

  return (
    <div className="bg-background border border-foreground/20 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">{repo.repo_name}</h3>
          <p className="text-sm text-foreground/60 mb-1">
            Created by: <span className="font-medium">{repo.created_by}</span>
          </p>
          <p className="text-sm text-foreground/60">
            Created: {new Date(repo.created_at).toLocaleDateString()}
          </p>
        </div>
        {repo.svg_image_url && (
          <div className="ml-4 flex-shrink-0">
            <img
              src={repo.svg_image_url}
              alt={repo.repo_name}
              className="w-16 h-16 object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <a
          href={repo.github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 bg-primary text-white text-center rounded-md hover:bg-primary-hover transition-colors"
        >
          View on GitHub
        </a>
        <button
          onClick={handleCopy}
          className="px-4 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
          title="Copy GitHub URL"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

