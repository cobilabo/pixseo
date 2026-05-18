import type { SideContentItem, SideContentLinkButtonIcon } from '@/types/theme';

export const USER_REQUEST_SIDE_CONTENT_ID = 'side-user-request';

export const USER_REQUEST_SIDE_CONTENT_PRESET: SideContentItem = {
  id: USER_REQUEST_SIDE_CONTENT_ID,
  type: 'linkButton',
  title: '\u5f53\u30b5\u30a4\u30c8\u3078\u306e\u3054\u8981\u671b',
  linkLabel: '\u5f53\u30b5\u30a4\u30c8\u3078\u306e\u3054\u8981\u671b',
  linkUrl: '/ja/user-request/',
  buttonIcon: 'mail',
  isEnabled: false,
  order: 0,
};

/** Sidebar link button icon SVG (stroke #E08A3C) */
export function getSideLinkButtonIconSvg(icon: SideContentLinkButtonIcon): string {
  if (icon === 'mail') {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E08A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  }
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E08A3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>';
}

/** Append user-request preset if missing */
export function ensureUserRequestSideContentItem(
  items: SideContentItem[] | undefined
): SideContentItem[] {
  const list = items?.length ? [...items] : [];
  const exists = list.some(
    (item) =>
      item.id === USER_REQUEST_SIDE_CONTENT_ID ||
      (item.type === 'linkButton' && item.title === USER_REQUEST_SIDE_CONTENT_PRESET.title)
  );
  if (exists) return list;

  const maxOrder = list.reduce((max, item) => Math.max(max, item.order), -1);
  return [
    ...list,
    {
      ...USER_REQUEST_SIDE_CONTENT_PRESET,
      order: maxOrder + 1,
    },
  ];
}