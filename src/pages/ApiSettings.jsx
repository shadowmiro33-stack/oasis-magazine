import React, { useState, useEffect } from 'react';

export default function ApiSettings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');

  useEffect(() => {
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setGmailUser(localStorage.getItem('GMAIL_USER') || '');
    setGmailPass(localStorage.getItem('GMAIL_PASS') || '');
  }, []);

  const saveGemini = () => {
    if (!geminiKey.trim()) return alert('API 키를 입력해주세요!');
    localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    alert('✅ API 키가 브라우저에 안전하게 저장되었습니다.');
  };

  const saveGmail = () => {
    if (!gmailUser.trim() || !gmailPass.trim()) return alert('이메일과 앱 비밀번호를 모두 입력해주세요.');
    localStorage.setItem('GMAIL_USER', gmailUser.trim());
    localStorage.setItem('GMAIL_PASS', gmailPass.trim());
    alert('✅ Gmail 발송 계정 정보가 안전하게 저장되었습니다.');
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h2><i className="fas fa-shield-alt"></i> 시스템 API 관리</h2>
          <p>시스템 연동을 위한 중요 보안 키 관리</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth:700, border:'2px solid #1e293b', marginBottom:20 }}>
        <div className="card-title" style={{ color:'#1e293b' }}>Gemini AI API Key</div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>AI 인사이트 추출을 위해 구글 제미니 키를 저장해야 합니다.</p>
        <div style={{ display:'flex', gap:10 }}>
          <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." style={{ flex:1, fontWeight:'bold' }} />
          <button className="btn btn-dark" onClick={saveGemini}>저장</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth:700, border:'2px solid #ea4335' }}>
        <div className="card-title" style={{ color:'#ea4335' }}>
          <i className="fab fa-google"></i> Gmail 발송 계정 설정
        </div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>뉴스레터 대량 발송을 위한 Gmail 계정과 앱 비밀번호를 입력해주세요.</p>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <input type="email" value={gmailUser} onChange={e => setGmailUser(e.target.value)} placeholder="Gmail 이메일 주소" style={{ flex:1, fontWeight:'bold' }} />
          <input type="password" value={gmailPass} onChange={e => setGmailPass(e.target.value)} placeholder="16자리 앱 비밀번호" style={{ flex:1, fontWeight:'bold' }} />
          <button className="btn btn-dark" style={{ background:'#ea4335' }} onClick={saveGmail}>저장</button>
        </div>
      </div>
    </div>
  );
}
