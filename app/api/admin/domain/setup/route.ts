import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addDomainToVercel, getDomainType, generateRequiredDnsRecords } from '@/lib/vercel-api';
import { addDomainToResend } from '@/lib/resend-api';
import { DomainConfig, DnsRecord } from '@/types/media-tenant';

/**
 * カスタムドメインのセットアップ
 * POST /api/admin/domain/setup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, domain, enableEmail } = body;
    
    if (!serviceId || !domain) {
      return NextResponse.json(
        { error: 'serviceId and domain are required' },
        { status: 400 }
      );
    }
    
    // ドメイン形式の検証
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }
    
    console.log(`[Domain Setup] Starting setup for ${domain} (service: ${serviceId})`);
    
    // サービスの存在確認
    const serviceDoc = await adminDb.collection('mediaTenants').doc(serviceId).get();
    if (!serviceDoc.exists) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    // ドメインの重複チェック
    const existingDomain = await adminDb.collection('mediaTenants')
      .where('customDomain', '==', domain)
      .get();
    
    const hasDuplicate = existingDomain.docs.some(doc => doc.id !== serviceId);
    if (hasDuplicate) {
      return NextResponse.json(
        { error: 'This domain is already in use by another service' },
        { status: 400 }
      );
    }
    
    // ドメインタイプを判定
    const domainType = getDomainType(domain);
    
    // 必要なDNSレコードを生成
    const webDnsRecords = generateRequiredDnsRecords(domain);
    const dnsRecords: DnsRecord[] = webDnsRecords.map(r => ({
      type: r.type,
      host: r.host,
      value: r.value,
      purpose: r.purpose,
      verified: false,
    }));
    
    // Vercelにドメインを追加
    console.log(`[Domain Setup] Adding domain to Vercel...`);
    const vercelResult = await addDomainToVercel(domain);
    
    if (!vercelResult.success) {
      console.error(`[Domain Setup] Vercel error: ${vercelResult.error}`);
      return NextResponse.json(
        { error: `Failed to add domain to Vercel: ${vercelResult.error}` },
        { status: 500 }
      );
    }
    
    console.log(`[Domain Setup] Vercel domain added: ${vercelResult.domainId}`);
    
    // メール機能が有効な場合、Resendにもドメインを追加
    let emailDomainId: string | undefined;
    let emailRecords: DnsRecord[] = [];
    
    if (enableEmail) {
      console.log(`[Domain Setup] Adding domain to Resend for email...`);
      const resendResult = await addDomainToResend(domain);
      
      if (resendResult.success && resendResult.records) {
        emailDomainId = resendResult.domainId;
        emailRecords = resendResult.records.map(r => ({
          type: r.type,
          host: r.host,
          value: r.value,
          priority: r.priority,
          purpose: 'email' as const,
          verified: false,
        }));
        console.log(`[Domain Setup] Resend domain added: ${emailDomainId}`);
      } else {
        console.warn(`[Domain Setup] Resend warning: ${resendResult.error}`);
        // メール設定失敗はエラーにしない（Web設定は成功しているため）
      }
    }
    
    // ドメイン設定を構築
    const domainConfig: DomainConfig = {
      type: domainType,
      vercelDomainId: vercelResult.domainId,
      vercelVerified: vercelResult.verified || false,
      vercelConfigured: true,
      emailEnabled: enableEmail && !!emailDomainId,
      emailDomainId,
      emailVerified: false,
      dnsRecords: [...dnsRecords, ...emailRecords],
      status: 'pending',
      configuredAt: new Date(),
    };
    
    // Firestoreを更新
    await adminDb.collection('mediaTenants').doc(serviceId).update({
      customDomain: domain,
      domainConfig,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`[Domain Setup] Setup completed for ${domain}`);
    
    return NextResponse.json({
      success: true,
      domain,
      domainType,
      domainConfig,
    });
    
  } catch (error) {
    console.error('[Domain Setup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

