const previewText = (text = '') => String(text).replace(/\s+/g, ' ').trim().slice(0, 160);

const looksLikeJson = (text = '') => /^\s*(?:\{|\[)/.test(text);

export async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_) {
    const preview = previewText(text);
    throw new Error(preview ? `서버가 JSON 대신 "${preview}" 응답을 보냈습니다.` : '서버 응답이 JSON 형식이 아닙니다.');
  }
}

export async function fetchWithFallback(endpoints, options) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, options);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.clone().text();
          if (!looksLikeJson(text)) {
            lastError = new Error(`${endpoint} returned non-JSON response: ${previewText(text) || 'empty body'}`);
            continue;
          }
        }
        return response;
      }
      lastError = new Error(`${endpoint} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('All API endpoints failed.');
}

export const apiEndpoints = {
  analyze: ['/api/analyze', '/.netlify/functions/analyze'],
  checkFrame: (url) => [
    `/api/check-frame?url=${encodeURIComponent(url)}`,
    `/.netlify/functions/check-frame?url=${encodeURIComponent(url)}`
  ]
};
