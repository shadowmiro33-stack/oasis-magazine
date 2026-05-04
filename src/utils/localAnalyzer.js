const decodeEntities = (text = '') => text
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

export const cleanText = (text = '') => decodeEntities(text)
  .replace(/\s+/g, ' ')
  .trim();

const truncate = (text = '', max = 80) => {
  const clean = cleanText(text);
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
};

const splitSentences = (text = '') => cleanText(text)
  .split(/(?<=[.!?。！？]|다\.|임\.|함\.|됨\.|전망\.|필요\.)\s+/)
  .map(s => cleanText(s))
  .filter(s => s.length >= 18 && !/구독|광고|저작권|copyright|cookie|login|로그인/i.test(s));

const pickMeta = (html, names) => {
  for (const name of names) {
    const selector = `meta[property="${name}"], meta[name="${name}"]`;
    const value = new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.getAttribute('content');
    if (value) return cleanText(value);
  }
  return '';
};

export const htmlToArticle = (html = '', url = '') => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, nav, footer, header').forEach(node => node.remove());
  const title = pickMeta(html, ['og:title', 'twitter:title']) || cleanText(doc.querySelector('title')?.textContent || '');
  const source = pickMeta(html, ['og:site_name', 'article:publisher']) || getHostname(url);
  const articleText = cleanText((doc.querySelector('article') || doc.body)?.textContent || '');
  return { text: articleText.slice(0, 12000), title, source };
};

export const getHostname = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
};

const guessBrand = (text = '', source = '') => {
  const candidates = [
    'OpenAI', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Tesla', 'NVIDIA',
    'Hyundai', 'Kia', 'Samsung', 'LG', 'Anthropic', 'Cisco', 'Oracle', 'Toyota',
    'BYD', 'Volkswagen', 'GM', 'Ford', '네이버', '카카오', '현대차', '기아', '삼성전자'
  ];
  const found = candidates.find(name => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text));
  if (found) return found;

  const korean = text.match(/([가-힣A-Za-z0-9&.-]{2,20})(?:은|는|이|가|의|에서|와|과)\s/);
  if (korean?.[1] && !/(정부|미국|중국|한국|시장|기업|업계|산업|보안|이번|해당)/.test(korean[1])) {
    return korean[1];
  }
  return source || '산업일반';
};

const guessInsight = (text = '') => {
  const lower = text.toLowerCase();
  if (/보안|해킹|랜섬|악성|침해|취약|security|hack|ransom|malware|breach/.test(lower)) {
    return '보안 위협 확산으로 기업의 취약점 관리와 사고 대응 체계 강화 필요';
  }
  if (/ai|인공지능|llm|openai|생성형|모델|반도체|nvidia/.test(lower)) {
    return 'AI 경쟁 심화로 기술 투자와 데이터 인프라 확보의 전략적 중요성 확대';
  }
  if (/전기차|배터리|충전|ev|vehicle|자동차|모빌리티/.test(lower)) {
    return '모빌리티 시장 재편 속 공급망과 수익성 관리가 핵심 과제로 부상';
  }
  if (/금리|물가|환율|경제|투자|시장|매출|실적|인수|합병/.test(lower)) {
    return '시장 변동성 확대에 따라 기업의 비용 통제와 성장 전략 점검 필요';
  }
  return '산업 환경 변화에 따라 기업의 리스크 관리와 실행 전략 재점검 필요';
};

const scoreSentence = (sentence = '') => {
  const keywords = ['발표', '예정', '계획', '정부', '기업', '투자', '출시', '인수', '협력', '보안', 'AI', '전기차', '시장', '실적'];
  return keywords.reduce((score, keyword) => score + (sentence.includes(keyword) ? 5 : 0), Math.min(sentence.length / 20, 5));
};

const fallbackSummary = (text = '', max = 80) => {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return truncate(text, max);
  const picked = sentences
    .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence)
    .join(' ');
  return truncate(picked || sentences[0], max);
};

const getSummarizer = () => window.Summarizer || window.ai?.summarizer;

const getSummarizerOptions = () => ({
  type: 'tldr',
  format: 'plain-text',
  length: 'short',
  expectedInputLanguages: ['en', 'ja', 'es'],
  outputLanguage: 'en',
  expectedContextLanguages: ['en'],
  expected_input_languages: ['en', 'ja', 'es'],
  output_language: 'en',
  expected_context_languages: ['en'],
  sharedContext: 'Summarize business, mobility, technology, economy, and security news for an internal R&D newsletter.'
});

export const getChromeSummarizerStatus = async () => {
  const Summarizer = getSummarizer();
  if (!Summarizer?.availability || !Summarizer?.create) return 'unavailable';
  try {
    return await Summarizer.availability(getSummarizerOptions());
  } catch (_) {
    return 'unavailable';
  }
};

export const summarizeWithChrome = async (text) => {
  const Summarizer = getSummarizer();
  if (!Summarizer?.create) throw new Error('Chrome Summarizer API unavailable');
  const summarizer = await Summarizer.create(getSummarizerOptions());
  const result = await summarizer.summarize(text);
  summarizer.destroy?.();
  return cleanText(result);
};

export const analyzeTextLocally = async ({ text, title = '', source = '', mode = 'auto' }) => {
  const normalized = cleanText(text).slice(0, 12000);
  let desc = '';
  let analyzer = '자동정리 fallback';

  if (mode !== 'fallback') {
    try {
      const availability = await getChromeSummarizerStatus();
      if (availability === 'unavailable' && mode === 'chrome') {
        throw new Error('Chrome Summarizer API unavailable');
      }
      if (availability !== 'unavailable') {
        desc = truncate(await summarizeWithChrome(normalized), 80);
        analyzer = 'Chrome 내장 AI';
      }
    } catch (error) {
      if (mode === 'chrome') throw error;
      desc = '';
    }
  }

  if (!desc) {
    desc = fallbackSummary(normalized, 80);
    analyzer = '자동정리 fallback';
  }

  const firstSentence = splitSentences(normalized)[0] || normalized;
  return {
    title: truncate(title || firstSentence, 45),
    brand: truncate(guessBrand(normalized, ''), 20),
    source: truncate(source || '수동입력', 24),
    desc,
    insight: truncate(guessInsight(normalized), 100),
    analyzer
  };
};
