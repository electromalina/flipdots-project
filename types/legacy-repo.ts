export interface LegacyRepo {
  id: string
  repo_name: string
  github_url: string
  created_by: string
  created_at: string
  svg_image_url: string | null
  created_at_db: string
  updated_at: string
}

export interface LegacyRepoInsert {
  repo_name: string
  github_url: string
  created_by: string
  created_at: string
  svg_image_url?: string | null
}

export interface LegacyRepoUpdate {
  repo_name?: string
  github_url?: string
  created_by?: string
  created_at?: string
  svg_image_url?: string | null
}

