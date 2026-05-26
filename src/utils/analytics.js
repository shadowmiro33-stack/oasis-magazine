export const GA_MEASUREMENT_ID_KEY = 'OASIS_GA_MEASUREMENT_ID';

const GA_ID_RE = /^G-[A-Z0-9]{6,}$/i;

let initializedId = '';

export function normalizeGaMeasurementId(value = '') {
  const id = String(value || '').trim().toUpperCase();
  return GA_ID_RE.test(id) ? id : '';
}

export function getLocalGaMeasurementId() {
  const envId = normalizeGaMeasurementId(process.env.REACT_APP_GA_MEASUREMENT_ID);
  if (envId) return envId;
  if (typeof window === 'undefined') return '';
  return normalizeGaMeasurementId(window.localStorage?.getItem(GA_MEASUREMENT_ID_KEY));
}

export function initGoogleAnalytics(measurementId) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  const id = normalizeGaMeasurementId(measurementId) || getLocalGaMeasurementId();
  if (!id) return '';
  if (initializedId === id && typeof window.gtag === 'function') return id;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false });

  if (!document.querySelector(`script[data-oasis-ga="${id}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.dataset.oasisGa = id;
    document.head.appendChild(script);
  }

  initializedId = id;
  return id;
}

export function trackGaEvent(eventName, params = {}, measurementId) {
  const id = initGoogleAnalytics(measurementId);
  if (!id || typeof window.gtag !== 'function') return false;
  window.gtag('event', eventName, {
    send_to: id,
    ...params,
  });
  return true;
}

export function trackArticleClick(article = {}, context = {}, measurementId) {
  return trackGaEvent('article_click', {
    article_id: context.articleId || article.id || `${context.issueId || 'unknown'}:${article.category || 'uncategorized'}:${article.title || article.link || 'article'}`,
    article_title: article.title || '',
    article_category: article.category || '',
    article_brand: article.brand || '',
    article_source: article.source || '',
    issue_id: context.issueId || article.issueDate || '',
    issue_name: context.issueName || '',
    surface: context.surface || '',
  }, measurementId);
}

export function trackMagazinePageView(context = {}, measurementId) {
  return trackGaEvent('page_view', {
    page_title: context.title || document.title,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
    page_path: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '',
    issue_id: context.issueId || '',
    issue_name: context.issueName || '',
    category: context.category || '',
  }, measurementId);
}
