import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// フォームの送信データ一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = params.id;
    // orderByを使用せずに取得（インデックス不要）
    const submissionsSnapshot = await adminDb
      .collection('formSubmissions')
      .where('formId', '==', formId)
      .get();
    const submissions = submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.() 
          ? data.submittedAt.toDate().toISOString() 
          : data.submittedAt || new Date().toISOString(),
      };
    });

    // クライアントサイドでソート（新しい順）
    submissions.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error('[API] Error fetching submissions:', error);
    console.error('[API] Error details:', error.message, error.code);
    return NextResponse.json(
      { error: 'Failed to fetch submissions', details: error.message },
      { status: 500 }
    );
  }
}

