const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
    // CORS 처리
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTION'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { to, subject, html } = body;
        const gmailUser = (body.gmailUser || process.env.GMAIL_USER || '').trim();
        const gmailPass = (body.gmailPass || process.env.GMAIL_PASS || '').replace(/\s+/g, '');

        if (!gmailUser || !gmailPass) {
            return jsonResponse(400, headers, {
                error: "Gmail 계정 정보가 없습니다. 관리자 페이지의 API 관리 탭에서 Gmail 계정과 앱 비밀번호를 설정해주세요.",
                code: "MISSING_GMAIL_CREDENTIALS"
            });
        }

        if (!to || !subject || !html) {
            return jsonResponse(400, headers, {
                error: "이메일 발송에 필요한 데이터(수신자, 제목, 본문)가 누락되었습니다.",
                code: "MISSING_EMAIL_PAYLOAD"
            });
        }

        // Nodemailer 트랜스포터 설정
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        try {
            await transporter.verify();
        } catch (authError) {
            console.error("Gmail SMTP 인증 실패:", {
                code: authError.code,
                command: authError.command,
                responseCode: authError.responseCode
            });
            return jsonResponse(502, headers, {
                error: "Gmail SMTP 인증에 실패했습니다. Gmail 이메일 주소와 16자리 앱 비밀번호를 확인해주세요. 앱 비밀번호의 공백은 자동으로 제거됩니다.",
                code: authError.code || "GMAIL_AUTH_FAILED",
                responseCode: authError.responseCode || null
            });
        }

        // 이메일 옵션 설정 (개별 발송 처리하여 받는 사람에 본인 이메일이 뜨도록 함)
        const emailArray = to.split(',').map(e => e.trim()).filter(e => e);
        if (emailArray.length === 0) {
            return jsonResponse(400, headers, {
                error: "발송할 이메일 주소가 없습니다.",
                code: "NO_RECIPIENTS"
            });
        }

        const chunkSize = 10; // Netlify 함수 제한 시간(10초)을 고려하여 10개씩 병렬 처리
        let lastMessageId = '';

        for (let i = 0; i < emailArray.length; i += chunkSize) {
            const chunk = emailArray.slice(i, i + chunkSize);
            
            const promises = chunk.map(targetEmail => {
                const mailOptions = {
                    from: `"OASIS R&D" <${gmailUser}>`,
                    to: targetEmail, // 숨은 참조(BCC) 대신 개별 수신자로 지정
                    subject: subject,
                    html: html
                };
                return transporter.sendMail(mailOptions).then(info => {
                    lastMessageId = info.messageId;
                });
            });

            await Promise.all(promises);
            
            // 구글 SMTP 속도 제한 및 스팸 차단 방지를 위한 딜레이
            if (i + chunkSize < emailArray.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        return jsonResponse(200, headers, { success: true, messageId: lastMessageId, totalSent: emailArray.length });

    } catch (error) {
        console.error("이메일 발송 에러:", error);
        return jsonResponse(500, headers, {
            error: error.message || "이메일 발송 중 알 수 없는 오류가 발생했습니다.",
            code: error.code || "SEND_EMAIL_FAILED"
        });
    }
};

function jsonResponse(statusCode, headers, payload) {
    return {
        statusCode,
        headers: {
            ...headers,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    };
}
