exports.handler = async (event) => {
    const targetUrl = event.queryStringParameters.url;
    if (!targetUrl) {
        return { statusCode: 400, body: JSON.stringify({ blocked: false }) };
    }

    try {
        // User-Agent를 브라우저처럼 설정해야 차단당하지 않음
        const res = await fetch(targetUrl, { 
            method: 'GET', 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });
        
        const xFrame = (res.headers.get('x-frame-options') || '').toUpperCase();
        const csp = (res.headers.get('content-security-policy') || '').toUpperCase();
        
        let blocked = false;
        
        // X-Frame-Options 체크
        if (xFrame === 'DENY' || xFrame === 'SAMEORIGIN') {
            blocked = true;
        }
        
        // Content-Security-Policy 체크
        if (csp.includes('FRAME-ANCESTORS')) {
            blocked = true;
        }

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({ blocked, xFrame, csp })
        };
    } catch(e) {
        // 서버 요청 자체에 실패할 경우, 기본적으로 iframe 허용 상태로 판단하여 프론트에서 처리하도록 둠
        console.error("Frame check error:", e.message);
        return { 
            statusCode: 200, 
            body: JSON.stringify({ blocked: false }) 
        };
    }
};
