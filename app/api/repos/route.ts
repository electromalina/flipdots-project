import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LegacyRepoInsert } from '@/types/legacy-repo'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('legacy_repos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch repos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LegacyRepoInsert = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legacy_repos')
      .insert([body])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create repo' },
      { status: 500 }
    )
  }
}

