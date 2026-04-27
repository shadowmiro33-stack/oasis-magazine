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

        // 5. R&D 전략 인사이트 (극강의 압축 및 초격차 퀄리티 버전)
        const prompt = `
        당신은 오토핸즈 R&D 센터의 최고 기술 전략 수석연구원입니다. 
        모빌리티, 중고차 플랫폼, AI, 데이터 기술 등과 관련된 핵심 기사를 분석하여, 현업 실무진과 경영진이 즉시 의사결정에 참고할 수 있는 **최상급 비즈니스 인사이트**를 JSON 형식으로 도출하세요.

        [JSON 출력 규칙]
        {
            "title": "기사 핵심 제목 (어그로 없이 팩트 위주)",
            "brand": "관련 기업/브랜드명 (모를 경우 '일반/산업' 등)",
            "source": "언론사 (모를 경우 '언론사')",
            "desc": "기사의 본질적인 내용을 2문장 이내로 명확하고 간결하게 요약",
            "insight": "이 기사가 우리 산업(모빌리티/중고차/데이터 플랫폼)에 미치는 영향과 선제적 대응 전략을 2~3문장으로 날카롭게 도출"
        }

        [인사이트(insight) 작성 원칙 - '초격차 전략 도출']
        1. 단순 기사 요약 절대 금지. 기사 이면의 '진짜 의도'나 '시장 변화 흐름'을 읽어낼 것.
        2. 두리뭉실하고 뻔한 표현(예: ~노력이 필요하다, ~기대된다) 절대 금지. 구체적인 '전략', '위험 요소(Risk)', '기회'를 짚어낼 것.
        3. 문장 끝은 '~함', '~임', '~전망', '~필요' 등 간결하고 전문적인 명사형 종결을 사용할 것.
        4. (작성 예시) "경쟁사의 오프라인 거점 확보를 통한 고객 신뢰도 선점 전략임. 향후 차량 진단 데이터와의 결합으로 O2O 서비스 초격차 확보를 위한 선제적 인프라 투자가 시급함."

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