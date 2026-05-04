import React, { useState, useEffect } from 'react';

export default function ApiSettings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [mailToken, setMailToken] = useState('');
  const [webMagazineUrl, setWebMagazineUrl] = useState('');

  useEffect(() => {
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setAppsScriptUrl(localStorage.getItem('OASIS_APPS_SCRIPT_URL') || '');
    setMailToken(localStorage.getItem('OASIS_MAIL_TOKEN') || '');
    setWebMagazineUrl(localStorage.getItem('OASIS_WEB_MAGAZINE_URL') || 'https://ohmagazine.netlify.app/');
  }, []);

  const saveGemini = () => {
    if (!geminiKey.trim()) return alert('API 키를 입력해주세요.');
    localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    alert('Gemini API 키가 저장되었습니다.');
  };

  const saveMailer = () => {
    if (!appsScriptUrl.trim()) return alert('Apps Script 웹앱 URL을 입력해주세요.');
    localStorage.setItem('OASIS_APPS_SCRIPT_URL', appsScriptUrl.trim());
    localStorage.setItem('OASIS_MAIL_TOKEN', mailToken.trim());
    localStorage.setItem('OASIS_WEB_MAGAZINE_URL', webMagazineUrl.trim() || 'https://ohmagazine.netlify.app/');
    localStorage.removeItem('GMAIL_USER');
    localStorage.removeItem('GMAIL_PASS');
    alert('Apps Script 메일 발송 설정과 웹 매거진 링크가 저장되었습니다.');
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h2><i className="fas fa-shield-alt"></i> 시스템 API 관리</h2>
          <p>외부 연동에 필요한 키와 발송 URL을 관리합니다.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth:700, border:'2px solid #1e293b', marginBottom:20 }}>
        <div className="card-title" style={{ color:'#1e293b' }}>Gemini AI API Key</div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>AI 인사이트 추출에 사용할 Gemini API 키를 저장합니다.</p>
        <div style={{ display:'flex', gap:10 }}>
          <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." style={{ flex:1, fontWeight:'bold' }} />
          <button className="btn btn-dark" onClick={saveGemini}>저장</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth:700, border:'2px solid #ea4335' }}>
        <div className="card-title" style={{ color:'#ea4335' }}>
          <i className="fab fa-google"></i> Apps Script 메일 발송 설정
        </div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>
          Netlify Function을 쓰지 않고 Google Apps Script 웹앱으로 뉴스레터 발송 요청을 보냅니다.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
          <input
            type="url"
            value={appsScriptUrl}
            onChange={e => setAppsScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            style={{ fontWeight:'bold' }}
          />
          <input
            type="password"
            value={mailToken}
            onChange={e => setMailToken(e.target.value)}
            placeholder="메일 토큰 (선택, Apps Script 속성 OASIS_MAIL_TOKEN과 동일하게 입력)"
            style={{ fontWeight:'bold' }}
          />
          <input
            type="url"
            value={webMagazineUrl}
            onChange={e => setWebMagazineUrl(e.target.value)}
            placeholder="웹 매거진 전체 읽기 URL"
            style={{ fontWeight:'bold' }}
          />
          <p style={{ fontSize:12, color:'#64748b', margin:'0 0 4px', fontWeight:800 }}>
            이메일 하단의 “웹 매거진에서 전체 읽기” 버튼이 이 주소로 이동합니다.
          </p>
          <button className="btn btn-dark" style={{ background:'#ea4335', alignSelf:'flex-start' }} onClick={saveMailer}>저장</button>
        </div>
      </div>
    </div>
  );
}
