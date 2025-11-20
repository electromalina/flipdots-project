import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LegacyRepoUpdate } from '@/types/legacy-repo'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legacy_repos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Repo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch repo' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: LegacyRepoUpdate = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legacy_repos')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update repo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // First, get the repo to find the SVG file
    const { data: repo } = await supabase
      .from('legacy_repos')
      .select('svg_image_url')
      .eq('id', id)
      .single()

    // Delete the SVG file from storage if it exists
    if (repo?.svg_image_url) {
      const fileName = repo.svg_image_url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('legacy-repo-images')
          .remove([fileName])
      }
    }

    // Delete the repo record
    const { error } = await supabase
      .from('legacy_repos')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete repo' },
      { status: 500 }
    )
  }
}

