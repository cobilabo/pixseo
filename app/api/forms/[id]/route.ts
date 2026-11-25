import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/**
 * 公開ページのフォームブロック（components/blocks/FormBlock.tsx）用。
 * 表示に必要な項目だけを返し、通知先メールアドレスや自動返信の設定は返さない。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await adminDb.collection('forms').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const data = doc.data()!;
    if (!data.isActive) {
      return NextResponse.json({ id: doc.id, isActive: false, fields: [] }, { headers: NO_STORE_HEADERS });
    }

    const afterSubmit = data.afterSubmit
      ? Object.fromEntries(
          Object.entries(data.afterSubmit as Record<string, unknown>).filter(
            ([key]) => key === 'type' || key === 'redirectUrl' || key === 'message' || key.startsWith('message_')
          )
        )
      : undefined;

    return NextResponse.json(
      {
        id: doc.id,
        name: data.name,
        isActive: true,
        fields: Array.isArray(data.fields) ? data.fields : [],
        afterSubmit,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[API /forms/[id]] Error fetching form:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
