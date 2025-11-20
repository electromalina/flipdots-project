import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const repoId = formData.get('repoId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      return NextResponse.json(
        { error: 'File must be an SVG' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const fileName = repoId ? `${repoId}.svg` : `${Date.now()}-${file.name}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('legacy-repo-images')
      .upload(fileName, file, {
        contentType: 'image/svg+xml',
        upsert: true,
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('legacy-repo-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

