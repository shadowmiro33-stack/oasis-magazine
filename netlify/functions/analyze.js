exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { url, apiKey } = JSON.parse(event.body);

        // 1. 기사 수집 (User-Agent를 설정하여 차단 회피)
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        if (!res.ok) throw new Error("언론사 사이트 접근 실패");
        
        const html = await res.text(); 

        // 이미지 추출
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        const ogImage = ogImageMatch ? ogImageMatch[1] : ""; 
        
        // 본문 정제 (광고, 스크립트 등 최대한 제거)
        let bodyText = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
        bodyText = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]*>?/gm, ' ')
                          .replace(/\s+/g, ' ')
                          .trim()
                          .slice(0, 3500); // 넉넉하게 수집
        
        if (bodyText.length < 100) {
            throw new Error("기사 본문 내용이 너무 부족하여 분석이 불가능합니다.");
        }

        const sourceName = new URL(url).hostname.replace('www.', '');

        // 2. 오토핸즈 R&D 특화 프롬프트 설정
        const promptText = `
너는 자동차 산업 및 IT 모빌리티 전문 전략 컨설턴트이자 '오토핸즈(Autohands)' 기업부설연구소의 핵심 분석관이야.
입력된 기사 본문을 읽고, 오토핸즈의 비즈니스(중고차 거래 플랫폼, 모빌리티 테크, AI 기반 차량 진단 등)에 도움이 될 정보를 도출해.

[지시 사항]
1. title: 자극적인 낚시성 제목이 아닌, 핵심 기술이나 시장 동향이 드러나는 전문적인 제목으로 재구성해.
2. brand: 기사에서 가장 비중 있게 다뤄지는 기업이나 브랜드명 1개만 추출해.
3. desc: 반드시 3줄로 요약해. 첫 줄은 팩트, 둘째 줄은 전개 상황, 셋째 줄은 결과나 영향이야.
4. insight: 오토핸즈가 이 뉴스를 보고 취해야 할 R&D 방향이나 사업적 아이디어를 1~2문장으로 제안해. (예: "우리 중고차 진단 AI 모델에 해당 로직 적용 검토 필요")

반드시 아래 JSON 형식으로만 답변해. 다른 설명은 생략해.
{
  "title": "...",
  "brand": "...",
  "source": "${sourceName}",
  "desc": "...",
  "insight": "..."
}

[기사 본문]
${bodyText}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const aiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { 
                    response_mime_type: "application/json",
                    temperature: 0.3 // 일관된 답변을 위해 낮춤
                }
            })
        });

        if (!aiResponse.ok) {
            const errorDetails = await aiResponse.text();
            throw new Error(`구글 AI 서버 응답 에러: ${errorDetails}`);
        }
        
        const aiData = await aiResponse.json();
        const resultText = aiData.candidates[0].content.parts[0].text;
        const parsedResult = JSON.parse(resultText);
        parsedResult.img = ogImage;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedResult)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message })
        };
    }
};
