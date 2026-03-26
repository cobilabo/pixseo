'use client';

import { Lang } from '@/types/lang';
import { SnsSettings } from '@/types/theme';
import XLink from '@/components/common/XLink';
import InstagramLink from '@/components/common/InstagramLink';

interface SidebarSnsLinksProps {
  snsSettings?: SnsSettings;
  lang?: Lang;
}

/** サイドバー用：テーマの SNS 設定に応じて X / Instagram のカードを並べる */
export default function SidebarSnsLinks({ snsSettings, lang = 'ja' }: SidebarSnsLinksProps) {
  if (!snsSettings) return null;
  const x = snsSettings.xUserId?.trim();
  const ig = snsSettings.instagramUsername?.trim();
  if (!x && !ig) return null;

  return (
    <>
      {x ? <XLink username={x} lang={lang} /> : null}
      {ig ? <InstagramLink username={ig} lang={lang} /> : null}
    </>
  );
}
