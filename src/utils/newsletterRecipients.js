import { sanitizeArticleUrls } from './urlSanitizer';

export const NEWSLETTER_CATEGORY_KEYS = ['macro', 'platform', 'auto', 'ai', 'security'];

export const NEWSLETTER_CATEGORY_LABELS = {
  macro: '경제·비즈니스',
  platform: '산업·플랫폼',
  auto: '자동차·모빌리티',
  ai: 'AI·테크',
  security: '보안·리스크',
};

const INTEREST_ALIASES = {
  macro: ['macro', 'economy', '경제', '경제·비즈니스'],
  platform: ['platform', 'biz', 'business', '비즈', '플랫폼', '산업·플랫폼'],
  auto: ['auto', 'automotive', 'car', 'cars', 'mobility', 'industry', '자동차', '모빌리티', '자동차·모빌리티', '중고차', '산업'],
  ai: ['ai', 'artificial intelligence', 'tech', 'AI·테크', '인공지능'],
  security: ['security', 'secure', 'info-secure', 'cybersecurity', '보안', '보안·리스크', '리스크'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeInterestValue = (value = '') => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
);

const isShortKoreanAlias = (value) => /^[가-힣]{1,2}$/.test(value);

const matchesInterestAlias = (interest, alias) => {
  const normalizedAlias = normalizeInterestValue(alias);
  if (!normalizedAlias) return false;
  if (interest === normalizedAlias) return true;

  // Short Korean words like "산업" are ambiguous across categories, so only
  // match them exactly. Longer labels such as "자동차" can safely match titles.
  if (isShortKoreanAlias(normalizedAlias)) return false;

  return interest.includes(normalizedAlias);
};

export const getSubscriberCategoryKeys = (subscriber) => {
  const interestKeys = Array.isArray(subscriber?.interestKeys) ? subscriber.interestKeys : [];
  const interests = Array.isArray(subscriber?.interests) ? subscriber.interests : [];
  const values = interestKeys.length > 0 ? interestKeys : interests;
  if (values.length === 0) return NEWSLETTER_CATEGORY_KEYS;

  const normalized = values.map(normalizeInterestValue).filter(Boolean);
  const keys = NEWSLETTER_CATEGORY_KEYS.filter(key => (
    normalized.some(interest => (
      interest === key || INTEREST_ALIASES[key].some(alias => matchesInterestAlias(interest, alias))
    ))
  ));

  return keys.length > 0 ? keys : NEWSLETTER_CATEGORY_KEYS;
};

export const makeCategoryGroupKey = (keys) => (
  NEWSLETTER_CATEGORY_KEYS.filter(key => keys.includes(key)).join('|')
);

export const hasAllNewsletterCategories = (keys) => keys.length === NEWSLETTER_CATEGORY_KEYS.length;

export const formatCategoryGroup = (keys) => hasAllNewsletterCategories(keys)
  ? '전체 카테고리'
  : keys.map(key => NEWSLETTER_CATEGORY_LABELS[key] || key).join(', ');

export const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export const isActiveSubscriber = (subscriber) => {
  const status = String(subscriber?.status || 'active').trim().toLowerCase();
  return !['inactive', 'blocked', 'deleted', 'unsubscribed', 'paused'].includes(status);
};

export const filterNewsletterArticles = (articlesSource, keys) => {
  if (Array.isArray(articlesSource)) {
    return articlesSource
      .map(sanitizeArticleUrls)
      .filter(article => article.category === 'main' || keys.includes(article.category));
  }

  return {
    main: articlesSource?.main ? sanitizeArticleUrls(articlesSource.main) : null,
    macro: keys.includes('macro') ? (articlesSource?.macro || []).map(sanitizeArticleUrls) : [],
    platform: keys.includes('platform') ? (articlesSource?.platform || []).map(sanitizeArticleUrls) : [],
    auto: keys.includes('auto') ? (articlesSource?.auto || []).map(sanitizeArticleUrls) : [],
    ai: keys.includes('ai') ? (articlesSource?.ai || []).map(sanitizeArticleUrls) : [],
    security: keys.includes('security') ? (articlesSource?.security || []).map(sanitizeArticleUrls) : [],
  };
};

export const hasNewsletterArticles = (articlesSource) => {
  if (Array.isArray(articlesSource)) return articlesSource.length > 0;
  return !!articlesSource?.main || NEWSLETTER_CATEGORY_KEYS.some(key => (articlesSource?.[key] || []).length > 0);
};

export const countNewsletterArticles = (articlesSource) => {
  if (Array.isArray(articlesSource)) return articlesSource.length;
  return (articlesSource?.main ? 1 : 0)
    + NEWSLETTER_CATEGORY_KEYS.reduce((sum, key) => sum + (articlesSource?.[key] || []).length, 0);
};

export const buildNewsletterSendPlan = (subscribers = [], articlesSource) => {
  const groups = {};
  const seenEmails = new Set();
  const stats = {
    totalSubscribers: subscribers.length,
    inactiveCount: 0,
    invalidEmailCount: 0,
    duplicateCount: 0,
    skippedNoContentCount: 0,
    deliverableCount: 0,
  };

  subscribers.forEach(subscriber => {
    if (!isActiveSubscriber(subscriber)) {
      stats.inactiveCount += 1;
      return;
    }

    const email = normalizeEmail(subscriber.email || subscriber.id);
    if (!EMAIL_RE.test(email)) {
      stats.invalidEmailCount += 1;
      return;
    }
    if (seenEmails.has(email)) {
      stats.duplicateCount += 1;
      return;
    }
    seenEmails.add(email);

    const keys = getSubscriberCategoryKeys(subscriber);
    const filteredArticles = filterNewsletterArticles(articlesSource, keys);
    const articleCount = countNewsletterArticles(filteredArticles);

    if (!hasNewsletterArticles(filteredArticles)) {
      stats.skippedNoContentCount += 1;
      return;
    }

    const groupKey = makeCategoryGroupKey(keys);
    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        keys,
        label: formatCategoryGroup(keys),
        emails: [],
        articleCount,
        includesSecurity: keys.includes('security'),
      };
    }
    groups[groupKey].emails.push(email);
    stats.deliverableCount += 1;
  });

  return {
    ...stats,
    groups: Object.values(groups).sort((a, b) => b.emails.length - a.emails.length),
  };
};
