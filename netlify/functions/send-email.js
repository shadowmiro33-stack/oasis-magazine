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
        const body = JSON.parse(event.body);
        const { to, subject, html, gmailUser, gmailPass } = body;

        if (!gmailUser || !gmailPass) {
            throw new Error("Gmail 계정 정보가 없습니다. 관리자 페이지의 API 관리 탭에서 Gmail 계정과 앱 비밀번호를 설정해주세요.");
        }

        if (!to || !subject || !html) {
            throw new Error("이메일 발송에 필요한 데이터(수신자, 제목, 본문)가 누락되었습니다.");
        }

        // Nodemailer 트랜스포터 설정
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        // 이메일 옵션 설정 (to는 숨은참조 bcc로 처리하여 구독자 정보 보호)
        // 구글 SMTP는 한 번에 보낼 수 있는 수신자 수(약 100명) 제한이 있으므로 50명씩 끊어서 발송
        const emailArray = to.split(',').map(e => e.trim()).filter(e => e);
        const chunkSize = 50;
        let lastMessageId = '';

        for (let i = 0; i < emailArray.length; i += chunkSize) {
            const chunk = emailArray.slice(i, i + chunkSize);
            
            const mailOptions = {
                from: `"OASIS R&D" <${gmailUser}>`,
                bcc: chunk.join(','), 
                subject: subject,
                html: html
            };

            const info = await transporter.sendMail(mailOptions);
            lastMessageId = info.messageId;
            
            // 대량 발송 시 스팸 차단 방지를 위해 약간의 딜레이(1초) 추가
            if (i + chunkSize < emailArray.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, messageId: lastMessageId, totalSent: emailArray.length })
        };

    } catch (error) {
        console.error("이메일 발송 에러:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
