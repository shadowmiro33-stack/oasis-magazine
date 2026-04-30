const ARTICLE_URL_FIELDS = ['link', 'url', 'originallink', 'originalLink'];
const TRACKING_PARAM_NAMES = new Set([
  'utm',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'igshid',
  'mc_cid',
  'mc_eid',
]);

const isTrackingParam = (name = '') => {
  const key = name.toLowerCase();
  return key.startsWith('utm_') || key.startsWith('hsa_') || TRACKING_PARAM_NAMES.has(key);
};

const getArticleUrl = (article = {}) => {
  for (const field of ARTICLE_URL_FIELDS) {
    if (article[field]) return article[field];
  }
  return '';
};

export const normalizeArticleUrl = (url = '') => {
  const raw = String(url || '').trim().replace(/&amp;/g, '&');
  if (!raw) return '';

  const withProtocol = raw.startsWith('//')
    ? `https:${raw}`
    : /^https?:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = decodeURIComponent(parsed.pathname || '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    [...parsed.searchParams.keys()].forEach(key => {
      if (isTrackingParam(key)) parsed.searchParams.delete(key);
    });
    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${hostname}${pathname}${query ? `?${query}` : ''}`.toLowerCase();
  } catch (_) {
    return withProtocol
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/#.*$/, '')
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
