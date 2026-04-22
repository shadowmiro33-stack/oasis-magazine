exports.handler = async function(event, context) {
    // 1. CORS 처리 (프론트와 백엔드 통신 허용)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTION'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 2. 프론트엔드(admin.html)에서 보낸 기사 URL과 API 키 수신
        const body = JSON.parse(event.body);
        const targetUrl = body.url;
        const apiKey = body.apiKey || process.env.GEMINI_API_KEY;

        if (!targetUrl) throw new Error("분석할 기사 URL이 전달되지 않았습니다.");
        if (!apiKey) throw new Error("Gemini API Key가 없습니다. 시스템 관리 탭에서 키를 저장해주세요.");

        // 3. 기사 원문 스크래핑 (언론사의 Bot 차단을 막기 위해 크롬 브라우저인 척 위장)
        const htmlResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!htmlResponse.ok) throw new Error(`기사 페이지 접근 실패 (상태코드: ${htmlResponse.status})`);
        
        const htmlText = await htmlResponse.text();
        
        // 4. HTML에서 불필요한 태그 날리고 순수 텍스트만 추출 (토큰 절약을 위해 5000자 컷)
        const bodyText = htmlText.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
                                 .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
                                 .replace(/<[^>]+>/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .substring(0, 5000);

        // 5. R&D 맞춤형 Gemini 프롬프트 작성
        const prompt = `
        다음은 모빌리티/경제 관련 뉴스 기사의 내용입니다. 이 내용을 분석하여 반드시 JSON 형식으로만 응답해주세요.
        
        {
            "title": "기사의 핵심 제목",
            "brand": "기사에 주로 언급된 기업명 또는 브랜드 (예: BMW, 아우디, 엔카, 토스 등)",
            "source": "언론사명 (알 수 없으면 '종합뉴스')",
            "desc": "기사 내용을 2~3줄로 명확하게 요약",
            "insight": "이 기사가 중고차 D2C 수출, 데이터 표준화, 혹은 모빌리티 플랫폼 비즈니스에 주는 전략적 인사이트 (1~2줄)"
        }
        
        기사 본문:
        ${bodyText}
        `;

        // 6. Gemini 1.5 Flash 모델 호출 (REST API 방식)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
        
        // 7. 결과 파싱 후 프론트엔드로 반환
        const resultJson = JSON.parse(resultText);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(resultJson)
        };

    } catch (error) {
        console.error("AI 분석 백엔드 에러:", error);
        // 에러 발생 시 프론트엔드로 에러 메시지를 예쁘게 포장해서 넘겨줌 (500 에러 처리)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
