import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyDomain as verifyVercelDomain } from '@/lib/vercel-api';
import { verifyResendDomain, getDomainFromResend } from '@/lib/resend-api';
import { DomainConfig } from '@/types/media-tenant';

/**
 * カスタムドメインのDNS検証
 * POST /api/admin/domain/verify
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
    
    if (!domain || !domainConfig) {
      return NextResponse.json(
        { error: 'Custom domain is not configured' },
        { status: 400 }
      );
    }    // Vercelでの検証
    const vercelResult = await verifyVercelDomain(domain);
    let vercelVerified = false;
    let vercelConfiguredBy: 'A' | 'CNAME' | null = null;
    
    if (vercelResult.success) {
      vercelVerified = vercelResult.verified || false;
      vercelConfiguredBy = vercelResult.configuredBy || null;    } else {
      console.warn(`[Domain Verify] Vercel verification error: ${vercelResult.error}`);
    }
    
    // DNSレコードの検証状態を更新
    const updatedDnsRecords = domainConfig.dnsRecords.map(record => {
      if (record.purpose === 'web') {
        // Webレコードの検証状態
        if (record.type === 'A' && vercelConfiguredBy === 'A') {
          return { ...record, verified: true, verifiedAt: new Date() };
        }
        if (record.type === 'CNAME' && vercelConfiguredBy === 'CNAME') {
          return { ...record, verified: true, verifiedAt: new Date() };
        }
        // wwwは別途チェック不要（メインが設定されていればOK）
        if (record.host === 'www' && vercelVerified) {
          return { ...record, verified: true, verifiedAt: new Date() };
        }
      }
      return record;
    });
    
    // メールドメインの検証（有効な場合）
    let emailVerified = false;
    
    if (domainConfig.emailEnabled && domainConfig.emailDomainId) {
      const resendResult = await verifyResendDomain(domainConfig.emailDomainId);
      
      if (resendResult.success && resendResult.records) {
        emailVerified = resendResult.status === 'verified';
        
        // メールレコードの検証状態を更新
        resendResult.records.forEach(resendRecord => {
          const index = updatedDnsRecords.findIndex(
            r => r.purpose === 'email' && r.host === resendRecord.host
          );
          if (index !== -1) {
            updatedDnsRecords[index] = {
              ...updatedDnsRecords[index],
              verified: resendRecord.verified,
              verifiedAt: resendRecord.verified ? new Date() : undefined,
            };
          }
        });      } else {
        console.warn(`[Domain Verify] Resend verification error: ${resendResult.error}`);
      }
    }
    
    // 全体のステータスを決定
    const webVerified = vercelVerified && vercelResult.configured;
    let status: DomainConfig['status'] = 'pending';
    
    if (webVerified && (!domainConfig.emailEnabled || emailVerified)) {
      status = 'active';
    } else if (webVerified || emailVerified) {
      status = 'verifying';
    }
    
    // Firestoreを更新
    const updatedDomainConfig: DomainConfig = {
      ...domainConfig,
      vercelVerified: vercelVerified,
      emailVerified: emailVerified,
      dnsRecords: updatedDnsRecords,
      status,
      lastCheckedAt: new Date(),
    };
    
    await adminDb.collection('mediaTenants').doc(serviceId).update({
      domainConfig: updatedDomainConfig,
      updatedAt: FieldValue.serverTimestamp(),
    });    return NextResponse.json({
      success: true,
      domain,
      status,
      webVerified,
      emailVerified: domainConfig.emailEnabled ? emailVerified : null,
      dnsRecords: updatedDnsRecords,
    });
    
  } catch (error) {
    console.error('[Domain Verify] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

