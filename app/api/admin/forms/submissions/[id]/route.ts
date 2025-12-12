import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// 送信データ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const submissionId = params.id;
    
    // まず送信データを取得してformIdを確認
    const submissionDoc = await adminDb.collection('formSubmissions').doc(submissionId).get();
    
    if (!submissionDoc.exists) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }
    
    const submissionData = submissionDoc.data();
    const formId = submissionData?.formId;
    
    // 送信データを削除
    await adminDb.collection('formSubmissions').doc(submissionId).delete();
    
    // フォームの送信カウントをデクリメント
    if (formId) {
      await adminDb.collection('forms').doc(formId).update({
        submissionCount: FieldValue.increment(-1),
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}

