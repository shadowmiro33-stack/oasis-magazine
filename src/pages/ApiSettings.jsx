import React, { useState, useEffect } from 'react';
import { getAnalyticsSettings, saveAnalyticsSettings } from '../services/dataService';
import { GA_MEASUREMENT_ID_KEY, normalizeGaMeasurementId } from '../utils/analytics';

export default function ApiSettings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [mailToken, setMailToken] = useState('');
  const [webMagazineUrl, setWebMagazineUrl] = useState('');
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [savingGa, setSavingGa] = useState(false);

  useEffect(() => {
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
    setAppsScriptUrl(localStorage.getItem('OASIS_APPS_SCRIPT_URL') || '');
    setMailToken(localStorage.getItem('OASIS_MAIL_TOKEN') || '');
    setWebMagazineUrl(localStorage.getItem('OASIS_WEB_MAGAZINE_URL') || 'https://ohmagazine.netlify.app/');
    setGaMeasurementId(localStorage.getItem(GA_MEASUREMENT_ID_KEY) || '');
    getAnalyticsSettings()
      .then(settings => {
        if (settings.measurementId) setGaMeasurementId(settings.measurementId);
      })
      .catch(() => {});
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

  const saveAnalytics = async () => {
    const measurementId = normalizeGaMeasurementId(gaMeasurementId);
    if (!measurementId) return alert('GA4 측정 ID를 G-XXXXXXXX 형식으로 입력해주세요.');
    setSavingGa(true);
    try {
      await saveAnalyticsSettings({ measurementId, updatedAt: new Date().toISOString() });
      localStorage.setItem(GA_MEASUREMENT_ID_KEY, measurementId);
      setGaMeasurementId(measurementId);
      alert('GA4 이벤트 설정이 저장되었습니다.');
    } catch (error) {
      alert('GA4 설정 저장 실패: ' + error.message);
    } finally {
      setSavingGa(false);
    }
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
        <div className="card-title" style={{ color:'#1e293b' }}>Gemini AI Studio API Key</div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>무료 티어로 사용할 Google AI Studio의 Gemini Developer API 키를 저장합니다. Vertex AI 키가 아닙니다.</p>
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

      <div className="card" style={{ maxWidth:700, border:'2px solid #2563eb', marginTop:20 }}>
        <div className="card-title" style={{ color:'#2563eb' }}>
          <i className="fas fa-chart-line"></i> Google Analytics 4 이벤트 설정
        </div>
        <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>
          공개 매거진의 기사 클릭을 Netlify Function 없이 브라우저에서 GA4 이벤트로 직접 전송합니다.
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <input
            value={gaMeasurementId}
            onChange={e => setGaMeasurementId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            style={{ flex:1, fontWeight:'bold', textTransform:'uppercase' }}
          />
          <button className="btn btn-primary" onClick={saveAnalytics} disabled={savingGa}>
            {savingGa ? '저장 중...' : '저장'}
          </button>
        </div>
        <p style={{ fontSize:12, color:'#64748b', marginTop:10, fontWeight:800 }}>
          이벤트 이름은 article_click이며 article_title, article_category, issue_id 등을 함께 보냅니다.
        </p>
      </div>
    </div>
  );
}
