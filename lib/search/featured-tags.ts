export interface TagRef {
  id: string;
  name: string;
  slug: string;
}

export function resolveFeaturedTags(
  allTags: TagRef[],
  tagIds: string[] | undefined
): TagRef[] {
  if (!tagIds?.length) return [];
  const byId = new Map(allTags.map((t) => [t.id, t]));
  return tagIds
    .map((id) => byId.get(id))
    .filter((t): t is TagRef => !!t);
}