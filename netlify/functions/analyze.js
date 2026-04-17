// netlify/functions/analyze.js
exports.handler = async function(event, context) {
    // POST 요청만 받음
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { url, apiKey } = JSON.parse(event.body);
// ... [원본 코드 절대 유지 구역: 상단 설정 및 fetch 로직] ...

        // 정규식으로 이미지와 텍스트만 가볍게 추출
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        
        // 🔥 [고도화 기능 1] 가짜 이미지 띄우지 말고, 없으면 그냥 빈칸으로 둬서 프론트엔드 기본 이미지가 뜨게 함
        const ogImage = ogImageMatch ? ogImageMatch[1] : ""; 
        
        let bodyText = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
        bodyText = bodyText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
        
        // 🔥 [고도화 기능 2] 언론사 방화벽에 막혀 본문이 너무 짧게(빈 깡통) 긁히면 AI가 소설 쓰기 전에 강제 에러 처리!
        if (bodyText.length < 50) {
            throw new Error("언론사 보안으로 인해 기사 본문 수집이 차단되었습니다. (수동 추가를 이용해주세요)");
        }

        const sourceName = new URL(url).hostname.replace('www.', '');

        // ... [원본 코드 절대 유지 구역: Gemini API 호출 로직] ...
        // 2. 서버에서 구글 Gemini API로 직접 통신
        const promptText = `너는 '오토핸즈(Autohands)'의 수석 데이터 분석가야.
다음 기사 본문을 읽고 우리 회사의 관점에서 분석해줘.
반드시 아래 JSON 형식으로만 답변해. 마크다운 기호 금지.
{
  "title": "기사 제목",
  "brand": "관련 기업명",
  "source": "${sourceName}",
  "desc": "기사 3줄 요약",
  "insight": "오토핸즈 R&D 인사이트 1~2문장"
}
[기사 본문]
${bodyText}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const aiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!aiResponse.ok) throw new Error("Gemini API 통신 에러");
        
        const aiData = await aiResponse.json();
        const resultText = aiData.candidates[0].content.parts[0].text;
        
        // 3. 분석 결과를 브라우저(프론트엔드)로 깔끔하게 리턴
        const parsedResult = JSON.parse(resultText);
        parsedResult.img = ogImage;

        return {
            statusCode: 200,
            body: JSON.stringify(parsedResult)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
