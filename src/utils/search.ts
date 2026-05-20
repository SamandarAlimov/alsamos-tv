export function normalizeSearchText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['`'ʼʻ]/g, '')
    .replace(/[^a-z0-9а-яё\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchTokens(query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const synonyms: Record<string, string[]> = {
    ozbek: ['uzbek', 'uzbekiston', 'o zbek', 'uz'],
    uzbek: ['ozbek', 'uzbekiston', 'uz'],
    ozbekiston: ['uzbekiston', 'uzbekistan', 'ozbek', 'uz'],
    uzbekiston: ['ozbekiston', 'uzbekistan', 'uzbek', 'uz'],
    uzbekistan: ['ozbekiston', 'uzbekiston', 'uzbek', 'uz'],
    kino: ['movie', 'film', 'movies'],
    movie: ['kino', 'film'],
    live: ['jonli', 'efir', 'tv'],
    sport: ['sports', 'futbol', 'football'],
    bolalar: ['kids', 'детские', 'cartoon'],
    news: ['yangilik', 'новости'],
  };

  return normalized
    .split(' ')
    .filter(Boolean)
    .flatMap((token) => [token, ...(synonyms[token] || [])]);
}

function tokenScore(haystack: string, token: string) {
  if (!token) return 0;
  if (haystack === token) return 120;
  if (haystack.startsWith(token)) return 80;
  if (haystack.includes(` ${token}`)) return 62;
  if (haystack.includes(token)) return 40;

  let tokenIndex = 0;
  for (const char of haystack) {
    if (char === token[tokenIndex]) tokenIndex += 1;
    if (tokenIndex === token.length) return Math.max(12, 28 - token.length);
  }

  return 0;
}

type PreparedSearchQuery = {
  requiredCount: number;
  variants: string[][];
};

function prepareSearchQuery(query: string): PreparedSearchQuery {
  const rawTokens = normalizeSearchText(query).split(' ').filter(Boolean);

  return {
    requiredCount: rawTokens.length,
    variants: rawTokens.map((rawToken) => {
      const variants = [rawToken, ...getSearchTokens(rawToken).filter((t) => t !== rawToken)];
      return Array.from(new Set(variants));
    }),
  };
}

function scorePreparedSearchMatch(fields: Array<string | null | undefined>, prepared: PreparedSearchQuery) {
  if (prepared.requiredCount === 0) return 0;

  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  if (!haystack) return 0;

  let matchedRequired = 0;
  let score = 0;

  for (const variants of prepared.variants) {
    const best = Math.max(...variants.map((token) => tokenScore(haystack, token)));
    if (best > 0) matchedRequired += 1;
    score += best;
  }

  return matchedRequired === prepared.requiredCount ? score : 0;
}

export function scoreSearchMatch(fields: Array<string | null | undefined>, query: string) {
  return scorePreparedSearchMatch(fields, prepareSearchQuery(query));
}

export function rankedSearch<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | null | undefined>,
) {
  const prepared = prepareSearchQuery(query);
  if (prepared.requiredCount === 0) return items;

  return items
    .map((item) => ({ item, score: scorePreparedSearchMatch(getFields(item), prepared) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
