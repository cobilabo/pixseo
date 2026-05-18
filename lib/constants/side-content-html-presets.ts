import type { SideContentItem } from '@/types/theme';

export const USER_REQUEST_SIDE_CONTENT_ID = 'side-user-request';

export const USER_REQUEST_SIDE_CONTENT_HTML = `<div style="background:#fff; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1); padding:24px; text-align:center;">
  <h4 style="font-size:15px; font-weight:700; color:#374151; margin:0 0 16px 0;">当サイトへのご要望</h4>
  <div style="display:flex; flex-direction:column; gap:10px;">
    <a href="/ja/user-request/" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 20px; background:#fff; border:1px solid #e5e7eb; border-radius:9999px; text-decoration:none; color:#1e293b; font-size:14px; font-weight:600;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E08A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      当サイトへのご要望
    </a>
  </div>
</div>`;

export const USER_REQUEST_SIDE_CONTENT_PRESET: SideContentItem = {
  id: USER_REQUEST_SIDE_CONTENT_ID,
  type: 'html',
  title: '当サイトへのご要望',
  htmlCode: USER_REQUEST_SIDE_CONTENT_HTML,
  isEnabled: false,
  order: 0,
};

const USER_REQUEST_TITLE = '当サイトへのご要望';

function isLegacyLinkButtonItem(item: SideContentItem): boolean {
  const type = (item as { type?: string }).type;
  return (
    type === 'linkButton' &&
    (item.id === USER_REQUEST_SIDE_CONTENT_ID || item.title === USER_REQUEST_TITLE)
  );
}

function isUserRequestHtmlItem(item: SideContentItem): boolean {
  return (
    item.id === USER_REQUEST_SIDE_CONTENT_ID ||
    (item.type === 'html' && item.title === USER_REQUEST_TITLE)
  );
}

export function ensureUserRequestSideContentItem(
  items: SideContentItem[] | undefined
): SideContentItem[] {
  const list = items?.length ? [...items] : [];
  const legacy = list.find(isLegacyLinkButtonItem);
  const withoutLegacy = list.filter((item) => !isLegacyLinkButtonItem(item));

  if (withoutLegacy.some(isUserRequestHtmlItem)) {
    return withoutLegacy;
  }

  const maxOrder = withoutLegacy.reduce((max, item) => Math.max(max, item.order), -1);
  return [
    ...withoutLegacy,
    {
      ...USER_REQUEST_SIDE_CONTENT_PRESET,
      order: legacy?.order ?? maxOrder + 1,
      isEnabled: legacy?.isEnabled ?? USER_REQUEST_SIDE_CONTENT_PRESET.isEnabled,
    },
  ];
}