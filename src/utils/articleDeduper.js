const ARTICLE_URL_FIELDS = ['link', 'url', 'originallink', 'originalLink'];

const getArticleUrl = (article = {}) => {
  for (const field of ARTICLE_URL_FIELDS) {
    if (article[field]) return article[field];
  }
  return '';
};

export const normalizeArticleUrl = (url = '') => {
  const raw = String(url || '').trim().replace(/&amp;/g, '&');
  if (!raw) return '';

  const withProtocol = raw.startsWith('//') ? `https:${raw}` : raw;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = decodeURIComponent(parsed.pathname || '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    return `${hostname}${pathname}`.toLowerCase();
  } catch (_) {
    return withProtocol
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '');
  }
};

export const normalizeArticleTitle = (title = '') => String(title || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

export const isDuplicateArticle = (article, list = []) => {
  const urlKey = normalizeArticleUrl(getArticleUrl(article));
  const titleKey = normalizeArticleTitle(article?.title);

  return list.some(item => {
    const itemUrlKey = normalizeArticleUrl(getArticleUrl(item));
    if (urlKey && itemUrlKey) return urlKey === itemUrlKey;

    const itemTitleKey = normalizeArticleTitle(item?.title);
    return !urlKey && !itemUrlKey && titleKey && itemTitleKey && titleKey === itemTitleKey;
  });
};

export const dedupeArticles = (items = [], existing = []) => {
  const seenUrls = new Set(existing.map(item => normalizeArticleUrl(getArticleUrl(item))).filter(Boolean));
  const seenTitleOnly = new Set(
    existing
      .filter(item => !normalizeArticleUrl(getArticleUrl(item)))
      .map(item => normalizeArticleTitle(item.title))
      .filter(Boolean)
  );

  const unique = [];
  let duplicateCount = 0;

  items.forEach(item => {
    const urlKey = normalizeArticleUrl(getArticleUrl(item));
    const titleKey = normalizeArticleTitle(item.title);

    if (urlKey) {
      if (seenUrls.has(urlKey)) {
        duplicateCount += 1;
        return;
      }
      seenUrls.add(urlKey);
      unique.push(item);
      return;
    }

    if (titleKey && seenTitleOnly.has(titleKey)) {
      duplicateCount += 1;
      return;
    }
    if (titleKey) seenTitleOnly.add(titleKey);
    unique.push(item);
  });

  return { unique, duplicateCount };
};
