"use client"

import { LegacyRepo } from '@/types/legacy-repo'
import RepoCard from './RepoCard'

interface RepoGridProps {
  repos: LegacyRepo[]
}

export default function RepoGrid({ repos }: RepoGridProps) {
  if (repos.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/60">
        No repos found. Check back later!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  )
}

