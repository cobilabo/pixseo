import { NextRequest, NextResponse } from 'next/server';
import { generateEnglishSlug } from '@/lib/generate-slug';

export const dynamic = 'force-dynamic';

/**
 * 日本語から英語のスラッグを生成するAPIエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = 'tag' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const slug = await generateEnglishSlug(name, type);

    return NextResponse.json({ slug });
  } catch (error) {
    console.error('[API /admin/generate-slug] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate slug', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

