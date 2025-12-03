"use client"

import { useEffect, useState } from 'react'
import { LegacyRepo } from '@/types/legacy-repo'
import RepoGrid from './components/RepoGrid'
import SearchBar from './components/SearchBar'
import { Toaster } from 'react-hot-toast'

export default function LegacyListPage() {
  const [repos, setRepos] = useState<LegacyRepo[]>([])
  const [filteredRepos, setFilteredRepos] = useState<LegacyRepo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRepos()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRepos(repos)
    } else {
      const filtered = repos.filter(
        (repo) =>
          repo.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.created_by.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredRepos(filtered)
    }
  }, [searchTerm, repos])

  const fetchRepos = async () => {
    try {
      const response = await fetch('/api/repos')
      if (response.ok) {
        const data = await response.json()
        setRepos(data)
        setFilteredRepos(data)
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Legacy List</h1>
          <p className="text-foreground/60">
            Browse and copy GitHub repositories for room
          </p>
        </div>

        <SearchBar value={searchTerm} onChange={setSearchTerm} />

        <RepoGrid repos={filteredRepos} />
      </div>
    </div>
  )
}

