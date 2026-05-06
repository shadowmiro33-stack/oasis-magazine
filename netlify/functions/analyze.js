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
  .split(/(?<=[.!??귨펯竊?|??.|??.|??.|??.|?꾨쭩\.|?꾩슂\.)\s+/)
  .map(s => cleanText(s))
  .filter(s => s.length >= 18 && !/援щ룆|愿묎퀬|??묎텒|copyright|cookie|login|濡쒓렇??i.test(s));

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

  const korean = text.match(/([媛-?쥱-Za-z0-9&.-]{2,20})(?:?|????媛|???먯꽌|?|怨?\s/);
  if (korean?.[1] && !/(?뺣?|誘멸뎅|以묎뎅|?쒓뎅|?쒖옣|湲곗뾽|?낃퀎|?곗뾽|蹂댁븞|?대쾲|?대떦)/.test(korean[1])) {
    return korean[1];
  }
  return source || '?곗뾽?쇰컲';
};

const guessInsight = (text) => {
  const lower = text.toLowerCase();
  if (/蹂댁븞|?댄궧|?쒖꽟|?낆꽦|移⑦빐|痍⑥빟|security|hack|ransom|malware|breach/.test(lower)) {
    return '蹂댁븞 ?꾪삊 ?뺤궛?쇰줈 湲곗뾽??痍⑥빟??愿由ъ? ?ш퀬 ???泥닿퀎 媛뺥솕 ?꾩슂';
  }
  if (/ai|?멸났吏??llm|openai|?앹꽦??紐⑤뜽|諛섎룄泥?nvidia/.test(lower)) {
    return 'AI 寃쎌웳 ?ы솕濡?湲곗닠 ?ъ옄? ?곗씠???명봽???뺣낫???꾨왂??以묒슂???뺣?';
  }
  if (/?꾧린李?諛고꽣由?異⑹쟾|ev|vehicle|?먮룞李?紐⑤퉴由ы떚/.test(lower)) {
    return '紐⑤퉴由ы떚 ?쒖옣 ?ы렪 ??怨듦툒留앷낵 ?섏씡??愿由ш? ?듭떖 怨쇱젣濡?遺??;
  }
  if (/湲덈━|臾쇨?|?섏쑉|寃쎌젣|?ъ옄|?쒖옣|留ㅼ텧|?ㅼ쟻|?몄닔|?⑸퀝/.test(lower)) {
    return '?쒖옣 蹂?숈꽦 ?뺣????곕씪 湲곗뾽??鍮꾩슜 ?듭젣? ?깆옣 ?꾨왂 ?먭? ?꾩슂';
  }
  return '?곗뾽 ?섍꼍 蹂?붿뿉 ?곕씪 湲곗뾽??由ъ뒪??愿由ъ? ?ㅽ뻾 ?꾨왂 ?ъ젏寃 ?꾩슂';
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
      const error = new Error(`湲곗궗 ?섏씠吏 ?묎렐 ?ㅽ뙣 (${response.status}). 蹂몃Ц??蹂듭궗???섎룞 遺꾩꽍???ъ슜?댁＜?몄슂.`);
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
    source: source || (targetUrl ? getHostname(targetUrl) : '?섎룞?낅젰')
  };
};

const fallbackAnalyze = ({ text, title, source }) => {
  const sentences = splitSentences(text);
  const firstSentence = sentences[0] || text;
  const computedTitle = title || firstSentence;
  const desc = /[媛-??/.test(firstSentence)
    ? truncate(firstSentence, 80)
    : '?먮Ц?먯꽌 ?곗뾽쨌湲곗닠 愿??二쇱슂 蹂?붿? ????꾩슂?깆씠 ?ㅻ쨪議뚯뒿?덈떎.';

  return {
    title: truncate(computedTitle.replace(/\s*[-|]\s*[^-|]+$/, ''), 45),
    brand: truncate(guessBrand(text, ''), 20),
    source: truncate(source || '?섎룞?낅젰', 24),
    desc,
    insight: truncate(guessInsight(text), 100),
    analyzer: '?쒓뎅???먮룞?뺣━ fallback'
  };
};

const runGemini = async ({ apiKey, text, title, source }) => {
  if (!apiKey) return null;

  const prompt = `
You are a Korean mobility, technology, economy, and security newsletter editor.
Read the article text and return only valid JSON.

Rules:
- title: Korean, factual, within 45 characters.
- brand: related company/brand. If none, use "?곗뾽?쇰컲".
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
  if (!resultText) throw new Error('Gemini ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.');

  const parsed = JSON.parse(resultText);
  return {
    title: truncate(parsed.title || title || '', 45),
    brand: truncate(parsed.brand || guessBrand(text, ''), 20),
    source: truncate(parsed.source || source || '?섎룞?낅젰', 24),
    desc: truncate(parsed.desc || '', 80),
    insight: truncate(parsed.insight || '', 100),
    analyzer: 'gemini-2.5-flash'
  };
};

exports.handler = async function(event) {
  const requestId = event.headers?.['x-nf-request-id'] || event.headers?.['x-request-id'] || `local-${Date.now()}`;
  const meta = { via: 'netlify-function', requestId };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'analyze ?⑥닔???뺤긽?낅땲?? 湲곗궗 遺꾩꽍? 愿由ъ옄 ?붾㈃??遺꾩꽍 踰꾪듉?먯꽌 ?ㅽ뻾?댁＜?몄슂.',
        method: 'POST',
        ...meta
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST ?붿껌留?吏?먰빀?덈떎.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const targetUrl = cleanText(body.url || '');
    const rawText = cleanText(body.text || '');
    const apiKey = cleanText(body.apiKey || process.env.GEMINI_API_KEY || '');
    const extractOnly = body.extractOnly === true;

    if (!targetUrl && !rawText) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '遺꾩꽍??湲곗궗 URL ?먮뒗 ?띿뒪?멸? ?꾩슂?⑸땲??' }) };
    }

    const article = await extractArticle(targetUrl, rawText);

    if (extractOnly) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...article, analyzer: 'extract-only', ...meta })
      };
    }

    try {
      const geminiResult = await runGemini({ apiKey, ...article });
      if (geminiResult) {
        return { statusCode: 200, headers, body: JSON.stringify({ ...geminiResult, ...meta }) };
      }
    } catch (error) {
      console.warn('Gemini analyzer failed. Falling back to local analyzer:', error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...fallbackAnalyze(article), ...meta })
    };
  } catch (error) {
    console.error('Analyzer error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message || '분석 중 오류가 발생했습니다.', ...meta })
    };
  }
};

