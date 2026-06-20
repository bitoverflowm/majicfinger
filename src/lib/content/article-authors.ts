export type ArticleAuthorProfile = {
  displayName: string;
  avatarSrc: string;
};

const AUTHOR_PROFILES: Record<string, ArticleAuthorProfile> = {
  misterrpink: {
    displayName: "misterrpink",
    avatarSrc: "/mrpink_pfp.jpg",
  },
};

export function resolveArticleAuthor(authorSlug: string): ArticleAuthorProfile {
  const key = authorSlug.trim().toLowerCase();
  return (
    AUTHOR_PROFILES[key] ?? {
      displayName: authorSlug,
      avatarSrc: "/mrpink_pfp.jpg",
    }
  );
}
