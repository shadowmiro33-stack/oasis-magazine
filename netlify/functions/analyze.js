const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const decodeEntities = (text = '') => text
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

const cleanText = (text = '') => decodeEntities(text).replace(/\s+/g, ' ').trim();

const truncate = (text = '', max = 80) => {
  const clean = cleanText(text);
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
};

const pickMeta = (html, names) => {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return cleanText(match[1]);
    }
  }
  return '';
};

const splitSentences = (text) => cleanText(text)
  .split(/(?<=[.!?。！？]|다\.|임\.|함\.|됨\.|전망\.|필요\.)\s+/)
  .map(s => cleanText(s))
  .filter(s => s.length >= 18 && !/구독|광고|저작권|copyright|cookie|login|로그인/i.test(s));

const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
};

const guessBrand = (text, source) => {
  const candidates = [
    'OpenAI', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Tesla', 'NVIDIA',
    'Hyundai', 'Kia', 'Samsung', 'LG', 'Anthropic', 'Cisco', 'Oracle', 'Toyota',
    'BYD', 'Volkswagen', 'GM', 'Ford'
  ];
  const found = candidates.find(name => new RegExp(`\\b${name}\\b`, 'i').test(text));
  if (found) return found;

  const korean = text.match(/([가-힣A-Za-z0-9&.-]{2,20})(?:은|는|이|가|의|에서|와|과)\s/);
  if (korean?.[1] && !/(정부|미국|중국|한국|시장|기업|업계|산업|보안|이번|해당)/.test(korean[1])) {
    return korean[1];
  }
  return source || '산업일반';
};

const guessInsight = (text) => {
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

const extractArticle = async (targetUrl, rawText) => {
  let articleText = rawText;
  let title = '';
  let source = '';

  if (!articleText) {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      const error = new Error(`기사 페이지 접근 실패 (${response.status}). 본문을 복사해 수동 분석을 사용해주세요.`);
      error.statusCode = 502;
      throw error;
    }

    const html = await response.text();
    title = pickMeta(html, ['og:title', 'twitter:title']) || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    source = pickMeta(html, ['og:site_name', 'article:publisher']) || getHostname(targetUrl);
    articleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }

  return {
    text: cleanText(articleText).slice(0, 7000),
    title,
    source: source || (targetUrl ? getHostname(targetUrl) : '수동입력')
  };
};

const fallbackAnalyze = ({ text, title, source }) => {
  const sentences = splitSentences(text);
  const firstSentence = sentences[0] || text;
  const computedTitle = title || firstSentence;

  return {
    title: truncate(computedTitle.replace(/\s*[-|]\s*[^-|]+$/, ''), 45),
    brand: truncate(guessBrand(text, ''), 20),
    source: truncate(source || '수동입력', 24),
    desc: truncate(firstSentence, 80),
    insight: truncate(guessInsight(text), 100),
    analyzer: 'fallback'
  };
};

const runGemini = async ({ apiKey, text, title, source }) => {
  if (!apiKey) return null;

  const prompt = `
You are a Korean mobility, technology, economy, and security newsletter editor.
Read the article text and return only valid JSON.

Rules:
- title: Korean, factual, within 45 characters.
- brand: related company/brand. If none, use "산업일반".
- source: media/source name. Prefer the supplied source if appropriate.
- desc: Korean, one sentence, within 80 characters, fact summary only.
- insight: Korean, one sentence, within 100 characters, business/industry implication.
- Do not wrap JSON in markdown.

Supplied title: ${title || ''}
Supplied source: ${source || ''}

Article text:
${text}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error?.message || `Gemini HTTP ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error('Gemini 응답이 비어 있습니다.');

  const parsed = JSON.parse(resultText);
  return {
    title: truncate(parsed.title || title || '', 45),
    brand: truncate(parsed.brand || guessBrand(text, ''), 20),
    source: truncate(parsed.source || source || '수동입력', 24),
    desc: truncate(parsed.desc || '', 80),
    insight: truncate(parsed.insight || '', 100),
    analyzer: 'gemini-2.5-flash'
  };
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'analyze 함수는 정상입니다. 기사 분석은 관리자 화면의 분석 버튼에서 실행해주세요.',
        method: 'POST'
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST 요청만 지원합니다.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const targetUrl = cleanText(body.url || '');
    const rawText = cleanText(body.text || '');
    const apiKey = cleanText(body.apiKey || process.env.GEMINI_API_KEY || '');
    const extractOnly = body.extractOnly === true;

    if (!targetUrl && !rawText) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '분석할 기사 URL 또는 텍스트가 필요합니다.' }) };
    }

    const article = await extractArticle(targetUrl, rawText);

    if (extractOnly) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(article)
      };
    }

    try {
      const geminiResult = await runGemini({ apiKey, ...article });
      if (geminiResult) {
        return { statusCode: 200, headers, body: JSON.stringify(geminiResult) };
      }
    } catch (error) {
      console.warn('Gemini analyzer failed. Falling back to local analyzer:', error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackAnalyze(article))
    };
  } catch (error) {
    console.error('Analyzer error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message || '분석 중 오류가 발생했습니다.' })
    };
  }
};
