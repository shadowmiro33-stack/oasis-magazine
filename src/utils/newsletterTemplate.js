import { normalizeExternalUrl, normalizeImageUrl } from './urlSanitizer';

const DEFAULT_WEB_MAGAZINE_URL = 'https://ohmagazine.netlify.app/';
const WEB_MAGAZINE_URL_KEY = 'OASIS_WEB_MAGAZINE_URL';

const NEWSLETTER_NAME = '핸지가 보는 세상';
const NEWSLETTER_SUBTITLE = '오토핸즈의 아침을 시작하는 스마트한 리포트';
const HANGI_RESEARCH_IMAGE_PATH = '/hangi-research.jpg';

const CATEGORY_META = {
  macro: { label: '경제·비즈니스', accent: '#2563eb' },
  platform: { label: '산업·플랫폼', accent: '#7c3aed' },
  auto: { label: '자동차·모빌리티', accent: '#0891b2' },
  ai: { label: 'AI·테크', accent: '#db2777' },
  security: { label: '보안·리스크', accent: '#ea580c' },
};

const getStoredWebMagazineUrl = () => {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_WEB_MAGAZINE_URL;
  return window.localStorage.getItem(WEB_MAGAZINE_URL_KEY) || DEFAULT_WEB_MAGAZINE_URL;
};

const normalizeWebMagazineUrl = (url) => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return DEFAULT_WEB_MAGAZINE_URL;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return DEFAULT_WEB_MAGAZINE_URL;
    return parsed.toString().replace(/"/g, '%22');
  } catch (_) {
    return DEFAULT_WEB_MAGAZINE_URL;
  }
};

const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getExcerpt = (value = '', maxLength = 90) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
};

const normalizeAttrUrl = (url) => String(url || '').replace(/"/g, '%22');

const getSafeExternalUrl = (url) => normalizeAttrUrl(normalizeExternalUrl(url, { fallback: '' }));

const getPublicAssetUrl = (pathname) => {
  const assetPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeAttrUrl(`${window.location.origin}${assetPath}`);
  }
  return normalizeAttrUrl(new URL(assetPath, DEFAULT_WEB_MAGAZINE_URL).toString());
};

const getArticleCategoryLabel = (article, fallbackKey) => (
  CATEGORY_META[article?.category]?.label
  || CATEGORY_META[fallbackKey]?.label
  || article?.brand
  || '오토핸즈 브리핑'
);

const getArticleSourceLabel = (article = {}) => article.source || article.brand || 'OASIS';

const getArticleKey = (article) => [
  article?.link,
  article?.title,
  article?.source,
].filter(Boolean).join('|');

const getUniqueArticles = (items) => {
  const seen = new Set();
  return items.filter(item => {
    if (!item) return false;
    const key = getArticleKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getTopStories = ({ main, macro, platform, auto, ai, security }) => {
  const rest = [...macro, ...platform, ...auto, ...ai, ...security]
    .filter(Boolean)
    .sort((a, b) => Number(!!b.isImportant) - Number(!!a.isImportant));
  return getUniqueArticles([main, ...rest]).slice(0, 3);
};

const pickFeaturedArticle = (items = []) => (
  [...items]
    .filter(Boolean)
    .sort((a, b) => Number(!!b.isImportant) - Number(!!a.isImportant))[0]
);

export function getPremiumNewsletterHTML(issueName, today, campaignData, articlesSource, webMagazineUrl) {
  const managedWebMagazineUrl = normalizeWebMagazineUrl(webMagazineUrl || getStoredWebMagazineUrl());
  const main = articlesSource?.main || (Array.isArray(articlesSource) ? articlesSource.find(a => a.category === 'main') : null);

  let macro = [], platform = [], auto = [], ai = [], security = [];

  if (Array.isArray(articlesSource)) {
    macro = articlesSource.filter(a => a.category === 'macro');
    platform = articlesSource.filter(a => a.category === 'platform');
    auto = articlesSource.filter(a => a.category === 'auto');
    ai = articlesSource.filter(a => a.category === 'ai');
    security = articlesSource.filter(a => a.category === 'security');
  } else {
    macro = articlesSource?.macro || [];
    platform = articlesSource?.platform || [];
    auto = articlesSource?.auto || [];
    ai = articlesSource?.ai || [];
    security = articlesSource?.security || [];
  }

  const topStories = getTopStories({ main, macro, platform, auto, ai, security });

  const linkOpen = (url) => {
    const safeUrl = getSafeExternalUrl(url);
    return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:block; color:inherit; text-decoration:none;">` : '<div>';
  };
  const linkClose = (url) => getSafeExternalUrl(url) ? '</a>' : '</div>';
  const mainImg = main ? normalizeImageUrl(main.img, { fallback: '' }) : '';
  const hangiResearchImage = getPublicAssetUrl(HANGI_RESEARCH_IMAGE_PATH);

  const renderTopStories = () => {
    if (!topStories.length) return '';

    return `
      <div style="background-color:#ffffff; border:1px solid #dbeafe; border-radius:20px; padding:24px; margin-bottom:28px; box-sizing:border-box;">
        <div style="font-size:13px; color:#2563eb; font-weight:900; letter-spacing:1px; margin-bottom:8px;">TODAY'S PICK</div>
        <div style="font-size:24px; color:#0f172a; font-weight:900; margin-bottom:18px; line-height:1.35;">오늘 핸지가 고른 3가지</div>
        ${topStories.map((article, index) => {
          const safeUrl = getSafeExternalUrl(article.link);
          const row = `
            <div style="padding:14px 0; border-top:${index === 0 ? '0' : '1px solid #e2e8f0'}; box-sizing:border-box;">
              <div style="display:inline-block; vertical-align:top; width:36px; height:36px; line-height:36px; text-align:center; border-radius:12px; background-color:#eff6ff; color:#2563eb; font-size:15px; font-weight:900; margin-right:12px;">${index + 1}</div>
              <div style="display:inline-block; vertical-align:top; width:calc(100% - 56px);">
                <div style="font-size:12px; color:#64748b; font-weight:900; margin-bottom:4px;">${escapeHtml(getArticleCategoryLabel(article))} · 출처: ${escapeHtml(getArticleSourceLabel(article))}</div>
                <div style="font-size:17px; color:#0f172a; font-weight:900; line-height:1.45; word-break:keep-all;">${escapeHtml(article.title || '')}</div>
                ${article.desc || article.insight ? `<div style="font-size:13px; color:#64748b; line-height:1.55; word-break:keep-all; margin-top:5px;">${escapeHtml(getExcerpt(article.desc || article.insight, 58))}</div>` : ''}
              </div>
            </div>`;
          return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:block; color:inherit; text-decoration:none;">${row}</a>` : row;
        }).join('')}
      </div>`;
  };

  const renderMarketRound = () => {
    const sections = [
      { key: 'macro', article: pickFeaturedArticle(macro) },
      { key: 'platform', article: pickFeaturedArticle(platform) },
      { key: 'auto', article: pickFeaturedArticle(auto) },
      { key: 'ai', article: pickFeaturedArticle(ai) },
      { key: 'security', article: pickFeaturedArticle(security) },
    ].filter(section => section.article);

    if (!sections.length) return '';

    return `
        <div style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:20px; padding:24px; margin-bottom:32px; box-sizing:border-box;">
          <div style="font-size:13px; font-weight:900; color:#2563eb; margin-bottom:7px; letter-spacing:1px;">시장 한 바퀴</div>
          <div style="font-size:22px; font-weight:900; color:#0f172a; line-height:1.35; word-break:keep-all; margin-bottom:8px;">나머지는 짧게만 짚고 갈게요</div>
          <div style="font-size:14px; color:#64748b; line-height:1.6; word-break:keep-all; margin-bottom:14px;">관심 카테고리별로 오늘 가장 볼 만한 기사만 하나씩 추렸습니다.</div>
          ${sections.map((section, index) => {
            const article = section.article;
            const meta = CATEGORY_META[article.category] || CATEGORY_META[section.key] || { label: '브리핑', accent: '#2563eb' };
            const safeUrl = getSafeExternalUrl(article.link);
            const row = `
              <div style="padding:16px 0; border-top:${index === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9'}; box-sizing:border-box;">
                <div style="font-size:12px; color:${meta.accent}; font-weight:900; margin-bottom:6px;">${escapeHtml(meta.label)}${article.isImportant ? ' · 핸지 PICK' : ''}</div>
                <div style="font-size:12px; color:#94a3b8; font-weight:900; margin-bottom:6px;">출처: ${escapeHtml(getArticleSourceLabel(article))}</div>
                <div style="font-size:18px; color:#0f172a; font-weight:900; line-height:1.45; word-break:keep-all; margin-bottom:6px;">${escapeHtml(article.title || '')}</div>
                <div style="font-size:14px; color:#475569; line-height:1.65; word-break:keep-all;">${escapeHtml(getExcerpt(article.desc || article.insight, 82))}</div>
                <div style="font-size:13px; color:#2563eb; font-weight:900; margin-top:8px;">자세히 보기 &gt;</div>
              </div>`;
            return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:block; color:inherit; text-decoration:none;">${row}</a>` : row;
          }).join('')}
        </div>`;
  };

  let html = `
  <div style="background-color:#eef4fb; padding:24px 0; font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Segoe UI',sans-serif; width:100%; box-sizing:border-box;">
    <div style="width:100%; max-width:660px; margin:0 auto; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,0.10); box-sizing:border-box;">
      <div style="background-color:#ffffff; padding:42px 34px 34px; text-align:center; border-bottom:1px solid #e2e8f0;">
        <div style="color:#061826; font-size:40px; font-weight:900; letter-spacing:2px; margin-bottom:22px;">OASIS</div>
        <div style="color:#2563eb; font-size:30px; font-weight:900; line-height:1.3; word-break:keep-all; margin-bottom:10px;">${NEWSLETTER_NAME}</div>
        <div style="color:#334155; font-size:16px; font-weight:800; line-height:1.55; word-break:keep-all; margin-bottom:24px;">${NEWSLETTER_SUBTITLE}</div>
        <div style="max-width:560px; margin:0 auto 22px; border-radius:18px; overflow:hidden; border:1px solid #dbeafe; background-color:#eff6ff; box-sizing:border-box;">
          <img src="${hangiResearchImage}" width="560" style="width:100%; max-width:560px; height:auto; display:block; margin:0 auto;" alt="핸지가 돋보기로 비즈니스 이슈를 살펴보는 이미지" />
        </div>
        <div style="display:inline-block; background-color:#f8fafc; color:#475569; padding:9px 18px; border-radius:999px; font-size:14px; font-weight:900; border:1px solid #dbe4ee;">${escapeHtml(today)} · ISSUE ${escapeHtml(issueName || '')}</div>
      </div>

      <div style="padding:30px 24px; background-color:#eef4fb; box-sizing:border-box;">
        <div style="background-color:#0f172a; border-radius:18px; padding:22px 22px; margin-bottom:22px; box-sizing:border-box;">
          <div style="font-size:20px; color:#ffffff; font-weight:900; line-height:1.55; word-break:keep-all;">오늘 챙겨볼 경제·비즈니스·투자·자동차 이슈를 핸지가 골라 정리했어요.</div>
        </div>
        ${renderTopStories()}`;

  if (main) {
    html += `
        <div style="margin-bottom:36px;">
          <div style="font-size:13px; font-weight:900; color:#2563eb; margin-bottom:12px; letter-spacing:1px;">핸지 돋보기</div>
          ${linkOpen(main.link)}
          <div style="background-color:#ffffff; border-radius:20px; border:1px solid #dbeafe; overflow:hidden; box-shadow:0 6px 20px rgba(15,23,42,0.05); box-sizing:border-box; width:100%;">
            ${mainImg ? `<img src="${normalizeAttrUrl(mainImg)}" style="width:100%; max-width:100%; height:auto; border-bottom:1px solid #e2e8f0; display:block;" alt="" />` : ''}
            <div style="padding:25px;">
              <div style="font-size:26px; font-weight:900; color:#0f172a; margin-bottom:14px; line-height:1.4; word-break:keep-all;">${main.isImportant ? '<span style="color:#2563eb; font-size:16px; margin-right:6px;">핸지 PICK</span>' : ''}${escapeHtml(main.title || '')}</div>
              <div style="font-size:13px; color:#64748b; font-weight:900; margin-bottom:14px;">출처: ${escapeHtml(getArticleSourceLabel(main))}</div>
              <div style="font-size:16px; color:#475569; line-height:1.8; margin-bottom:22px; word-break:keep-all;">${escapeHtml(getExcerpt(main.desc || '', 150))}</div>
              <div style="background-color:#eff6ff; padding:18px; border-radius:14px; border:1px solid #bfdbfe; box-sizing:border-box;">
                <div style="font-size:13px; font-weight:900; color:#1d4ed8; margin-bottom:8px;">오토핸즈의 시선</div>
                <div style="font-size:15px; font-weight:bold; color:#1e3a8a; line-height:1.75; word-break:keep-all;">${escapeHtml(getExcerpt(main.insight || '이 이슈가 고객과 시장 흐름에 어떤 의미가 있는지 함께 살펴볼 만합니다.', 110))}</div>
              </div>
              <div style="margin-top:24px; text-align:center;">
                <span style="display:inline-block; background-color:#2563eb; color:#ffffff; font-size:15px; font-weight:900; text-decoration:none; padding:14px 28px; border-radius:12px;">자세히 보기 &gt;</span>
              </div>
            </div>
          </div>
          ${linkClose(main.link)}
        </div>`;
  }

  html += renderMarketRound();

  html += `      </div>`;

  html += `<div style="background-color:#ffffff; padding:38px 24px; text-align:center; border-top:1px solid #e2e8f0; box-sizing:border-box;">`;
  if (campaignData) {
    const isShorts = !!campaignData.shortsUrl;
    const imgUrl = normalizeImageUrl(isShorts ? campaignData.securityImg : (campaignData.emailUrl || campaignData.emailImg || campaignData.url || campaignData.securityImg || campaignData), { fallback: '' });

    const getDeepLinkUrl = (url) => {
      if (!url) return '';
      if (url.includes('youtube.com/shorts/')) return `https://www.youtube.com/watch?v=${url.split('/shorts/')[1].split('?')[0]}`;
      if (url.includes('youtu.be/')) return `https://www.youtube.com/watch?v=${url.split('youtu.be/')[1].split('?')[0]}`;
      return getSafeExternalUrl(url);
    };
    const safeUrl = getDeepLinkUrl(campaignData.shortsUrl);

    if (isShorts && imgUrl && safeUrl) {
      html += `
        <div style="margin-bottom:34px; text-align:left; background:#f8fafc; border-radius:20px; overflow:hidden; border:1px solid #dbeafe; box-sizing:border-box;">
          <div style="padding:18px 22px; border-bottom:1px solid #e2e8f0;">
            <div style="font-size:16px; font-weight:900; color:#2563eb;">핸지가 고른 핫한 숏츠</div>
          </div>
          <div style="padding:22px; box-sizing:border-box;">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:block; text-decoration:none;">
              <img src="${normalizeAttrUrl(imgUrl)}" style="width:100%; max-width:100%; height:auto; border-radius:12px; display:block;" alt="추천 영상 썸네일">
            </a>
            <div style="padding-top:16px;">
              <div style="font-size:18px; font-weight:900; color:#1e293b; margin-bottom:14px; line-height:1.4; word-break:keep-all;">${escapeHtml(campaignData.title || '')}</div>
              ${campaignData.platform ? `<div style="font-size:12px; color:#64748b; font-weight:900; margin-bottom:14px;">출처: ${escapeHtml(campaignData.platform)}</div>` : ''}
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#0f172a; color:white; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:bold; font-size:14px;">영상 바로보기</a>
            </div>
          </div>
        </div>`;
    } else if (imgUrl) {
      html += `<div style="margin-bottom:28px; padding:14px; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0; box-sizing:border-box; background-color:#ffffff; text-align:center;"><img src="${normalizeAttrUrl(imgUrl)}" width="560" style="width:100%; max-width:560px; height:auto; display:block; margin:0 auto;" alt="캠페인 배너"></div>`;
    }
  }

  html += `
        <div style="font-size:20px; font-weight:900; color:#0f172a; margin-bottom:12px;">오늘 핸지 브리핑, 어떠셨나요?</div>
        <div style="font-size:15px; color:#64748b; line-height:1.7; word-break:keep-all; margin-bottom:28px;">더 많은 기사와 지난 호는 OASIS 웹 매거진에서 이어서 볼 수 있습니다.</div>
        <a href="${managedWebMagazineUrl}" style="display:inline-block; background-color:#2563eb; color:#ffffff; text-decoration:none; padding:16px 34px; border-radius:999px; font-weight:900; font-size:16px; box-shadow:0 4px 10px rgba(37,99,235,0.25);" target="_blank" rel="noopener noreferrer">웹 매거진에서 전체 보기</a>
      </div>
    </div>
    <div style="max-width:620px; margin:30px auto 0; text-align:center; color:#64748b; font-size:13px; font-weight:bold; line-height:1.7; word-break:keep-all;">
      핸지가 보는 세상은 오토핸즈의 아침을 시작하는 스마트한 리포트입니다.
    </div>
  </div>`;

  return html;
}
