import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { removeDomainFromVercel } from '@/lib/vercel-api';
import { removeDomainFromResend } from '@/lib/resend-api';
import { DomainConfig } from '@/types/media-tenant';

/**
 * カスタムドメインの削除
 * POST /api/admin/domain/remove
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId } = body;
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }
    
    // サービス情報を取得
    const serviceDoc = await adminDb.collection('mediaTenants').doc(serviceId).get();
    if (!serviceDoc.exists) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    const serviceData = serviceDoc.data()!;
    const domain = serviceData.customDomain;
    const domainConfig = serviceData.domainConfig as DomainConfig | undefined;
    
    if (!domain) {
      return NextResponse.json(
        { error: 'No custom domain configured' },
        { status: 400 }
      );
    }
    
    console.log(`[Domain Remove] Removing ${domain} from service ${serviceId}`);
    
    // Vercelからドメインを削除
    if (domainConfig?.vercelConfigured) {
      const vercelResult = await removeDomainFromVercel(domain);
      if (!vercelResult.success) {
        console.warn(`[Domain Remove] Vercel removal warning: ${vercelResult.error}`);
        // エラーでも続行（Firestore側は削除する）
      } else {
        console.log(`[Domain Remove] Removed from Vercel`);
      }
    }
    
    // Resendからドメインを削除
    if (domainConfig?.emailEnabled && domainConfig?.emailDomainId) {
      const resendResult = await removeDomainFromResend(domainConfig.emailDomainId);
      if (!resendResult.success) {
        console.warn(`[Domain Remove] Resend removal warning: ${resendResult.error}`);
        // エラーでも続行
      } else {
        console.log(`[Domain Remove] Removed from Resend`);
      }
    }
    
    // Firestoreから削除
    await adminDb.collection('mediaTenants').doc(serviceId).update({
      customDomain: FieldValue.delete(),
      domainConfig: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`[Domain Remove] Removal completed for ${domain}`);
    
    return NextResponse.json({
      success: true,
      message: 'Domain removed successfully',
    });
    
  } catch (error) {
    console.error('[Domain Remove] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

