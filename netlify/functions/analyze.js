exports.handler = async function(event, context) {
    // 1. CORS 처리
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTION'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 2. 파라미터 및 키 수신
        const body = JSON.parse(event.body);
        const targetUrl = body.url;
        const apiKey = body.apiKey || process.env.GEMINI_API_KEY;

        if (!targetUrl) throw new Error("분석할 기사 URL이 전달되지 않았습니다.");
        if (!apiKey) throw new Error("Gemini API Key가 없습니다. 시스템 관리 탭에서 키를 저장하거나 넷리파이 환경변수에 등록해주세요.");

        // 3. 기사 스크래핑 (우회)
        const htmlResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!htmlResponse.ok) throw new Error(`기사 페이지 접근 실패 (상태코드: ${htmlResponse.status})`);
        
        const htmlText = await htmlResponse.text();
        
        // 4. 본문 추출 및 정제
        const bodyText = htmlText.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                                 .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
                                 .replace(/<[^>]+>/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .substring(0, 5000);

        // 5. R&D 전략 인사이트 (극강의 압축 버전)
        const prompt = `
        당신은 오토핸즈 R&D 수석연구원입니다. 
        기사를 분석하여 **모바일 가독성을 최우선으로 고려한** 인사이트를 JSON으로 응답하세요.

        [JSON 출력 규칙]
        {
            "title": "기사 핵심 제목",
            "brand": "기업/브랜드명",
            "source": "언론사",
            "desc": "기사 내용을 2줄 이내로 극단적 요약",
            "insight": "대한민국 사회·경제 관점의 시사점을 딱 2문장(키워드 중심)으로 요약"
        }

        [인사이트 작성 원칙: '안 보이면 안 읽는다']
        - 수식어 다 빼고 '사실'과 '전략'만 넣을 것.
        - 예: "고금리 기조에 따른 자산 유동화 수요 급증 추세. 플랫폼 내 데이터 표준화로 신뢰도 선점 필요." 
        - 문장 끝은 '~함', '~임', '~필요' 등 간결하게 끝낼 것.

        기사 본문:
        ${bodyText}
        `;

        // 6. 🔥 오류 수정: Gemini 2.5 Flash 모델로 엔드포인트 정상화
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!geminiRes.ok) {
            const errData = await geminiRes.json();
            throw new Error(`Gemini 응답 에러: ${errData.error?.message || '알 수 없음'}`);
        }

        const geminiData = await geminiRes.json();
        const resultText = geminiData.candidates[0].content.parts[0].text;
        
        // 7. 반환
        const resultJson = JSON.parse(resultText);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(resultJson)
        };

    } catch (error) {
        console.error("AI 분석 백엔드 에러:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
