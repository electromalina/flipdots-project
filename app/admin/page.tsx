"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordGate from './components/PasswordGate'
import RepoList from './components/RepoList'
import RepoForm from './components/RepoForm'
import { LegacyRepo } from '@/types/legacy-repo'

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [repos, setRepos] = useState<LegacyRepo[]>([])
  const [editingRepo, setEditingRepo] = useState<LegacyRepo | null>(null)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true'
    setAuthenticated(isAuthenticated)
    setLoading(false)

    if (isAuthenticated) {
      fetchRepos()
    }
  }, [])

  const fetchRepos = async () => {
    try {
      const response = await fetch('/api/repos')
      if (response.ok) {
        const data = await response.json()
        setRepos(data)
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error)
    }
  }

  const handleSave = async (repoData: Partial<LegacyRepo>) => {
    try {
      const url = editingRepo
        ? `/api/repos/${editingRepo.id}`
        : '/api/repos'
      const method = editingRepo ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoData),
      })

      if (response.ok) {
        await fetchRepos()
        setShowForm(false)
        setEditingRepo(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save repo')
      }
    } catch (error) {
      alert('Failed to save repo')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/repos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRepos()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete repo')
      }
    } catch (error) {
      alert('Failed to delete repo')
    }
  }

  const handleEdit = (repo: LegacyRepo) => {
    setEditingRepo(repo)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRepo(null)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated')
    setAuthenticated(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return <PasswordGate />
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel - Legacy Repos</h1>
          <div className="flex gap-2">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
              >
                Create New Repo
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {showForm ? (
          <div className="bg-background border border-foreground/20 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingRepo ? 'Edit Repo' : 'Create New Repo'}
            </h2>
            <RepoForm
              repo={editingRepo}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <RepoList repos={repos} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}

