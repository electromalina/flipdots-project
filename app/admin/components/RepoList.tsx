"use client"

import { LegacyRepo } from '@/types/legacy-repo'
import { useState } from 'react'

interface RepoListProps {
  repos: LegacyRepo[]
  onEdit: (repo: LegacyRepo) => void
  onDelete: (id: string) => void
}

export default function RepoList({ repos, onEdit, onDelete }: RepoListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filteredRepos = repos.filter(
    (repo) =>
      repo.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (repos.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/60">
        No repos found. Create your first repo!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Search by name or creator..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-foreground/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/20">
              <th className="text-left py-3 px-4 font-semibold">Repo Name</th>
              <th className="text-left py-3 px-4 font-semibold">GitHub URL</th>
              <th className="text-left py-3 px-4 font-semibold">Created By</th>
              <th className="text-left py-3 px-4 font-semibold">Created At</th>
              <th className="text-left py-3 px-4 font-semibold">SVG</th>
              <th className="text-right py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepos.map((repo) => (
              <tr
                key={repo.id}
                className="border-b border-foreground/10 hover:bg-foreground/5"
              >
                <td className="py-3 px-4">{repo.repo_name}</td>
                <td className="py-3 px-4">
                  <a
                    href={repo.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block max-w-xs"
                  >
                    {repo.github_url}
                  </a>
                </td>
                <td className="py-3 px-4">{repo.created_by}</td>
                <td className="py-3 px-4">
                  {new Date(repo.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  {repo.svg_image_url ? (
                    <img
                      src={repo.svg_image_url}
                      alt={repo.repo_name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <span className="text-foreground/40">No image</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onEdit(repo)}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(repo.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-foreground/20 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-foreground/80 mb-4">
              Are you sure you want to delete this repo? This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

