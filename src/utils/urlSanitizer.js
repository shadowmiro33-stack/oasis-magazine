const LABEL_PREFIX_RE = /^(url|image|img|src|href)\s*:\s*/i;

export function stripUrlLabel(value = '') {
  let clean = String(value || '').trim().replace(/&amp;/g, '&');
  clean = clean.replace(/^['"]|['"]$/g, '').trim();

  while (LABEL_PREFIX_RE.test(clean)) {
    clean = clean.replace(LABEL_PREFIX_RE, '').trim();
  }

  return clean;
}

export function normalizeExternalUrl(value = '', options = {}) {
  const {
    fallback = '',
    forceHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:',
    allowedProtocols = ['http:', 'https:'],
  } = options;
  let clean = stripUrlLabel(value);
  if (!clean) return fallback;
  if (clean.startsWith('//')) clean = `https:${clean}`;
  if (!/^https?:\/\//i.test(clean)) return fallback;

  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://example.com/';
    const parsed = new URL(clean, base);
    if (!allowedProtocols.includes(parsed.protocol)) return fallback;
    if (forceHttps && parsed.protocol === 'http:') parsed.protocol = 'https:';
    return parsed.href;
  } catch (_) {
    return fallback;
  }
}

export function normalizeImageUrl(value = '', options = {}) {
  const {
    fallback = '',
    blockedHosts = [],
  } = options;
  const clean = normalizeExternalUrl(value, { ...options, fallback });
  if (!clean) return fallback;

  try {
    const hostname = new URL(clean).hostname;
    if (blockedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) return fallback;
  } catch (_) {
    return fallback;
  }

  return clean;
}

export function sanitizeArticleUrls(article = {}) {
  const next = { ...article };
  next.link = normalizeExternalUrl(next.link || next.url || '', { fallback: '' });
  next.img = normalizeImageUrl(next.img || '', { fallback: '' });
  return next;
}

export function sanitizeMagazineUrls(magazine = {}) {
  const next = { ...magazine };
  if (Array.isArray(next.articles)) next.articles = next.articles.map(sanitizeArticleUrls);
  if (next.webCampaign) next.webCampaign = normalizeImageUrl(next.webCampaign, { fallback: '' });
  if (next.video?.url) {
    next.video = {
      ...next.video,
      url: normalizeExternalUrl(next.video.url, { fallback: '' }),
    };
  }
  if (next.campaign && typeof next.campaign === 'string') {
    next.campaign = normalizeImageUrl(next.campaign, { fallback: '' });
  } else if (next.campaign) {
    next.campaign = {
      ...next.campaign,
      url: normalizeImageUrl(next.campaign.url, { fallback: '' }),
      emailUrl: normalizeImageUrl(next.campaign.emailUrl, { fallback: '' }),
      securityImg: normalizeImageUrl(next.campaign.securityImg, { fallback: '' }),
      shortsUrl: normalizeExternalUrl(next.campaign.shortsUrl, { fallback: '' }),
    };
  }
  return next;
}
