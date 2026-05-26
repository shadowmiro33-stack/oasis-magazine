import React, { useState, useCallback } from 'react';
import {
  DESIGN_SYSTEM_EXTRACTION_GUIDE,
  GEMINI_FREE_TIER_MODEL,
  buildDesignSystemPrompt,
  createPresetDesignSystemExtraction,
  normalizeExtractedTokens,
  parseDesignSystemJson,
} from '../utils/designSystemExtractor';
import { readJsonResponse } from '../utils/apiEndpoints';
import { saveAnalyticsSettings } from '../services/dataService';
import { GA_MEASUREMENT_ID_KEY, normalizeGaMeasurementId } from '../utils/analytics';

const SAMPLE_PRESETS = [
  { name: '오토핸즈 코퍼레이트 (블루/각진형)', primary: '#2563eb', secondary: '#1a3b6e', surface: '#ffffff', radius: 8, font: "'Pretendard', sans-serif" },
  { name: '모던 다크 테마 (퍼플)', primary: '#8b5cf6', secondary: '#4c1d95', surface: '#1e1e2e', radius: 12, font: "'Inter', sans-serif" },
  { name: '소프트 파스텔 (그린)', primary: '#10b981', secondary: '#065f46', surface: '#f0fdf4', radius: 16, font: "'Noto Sans KR', sans-serif" },
  { name: '뉴스 미디어 (레드)', primary: '#ef4444', secondary: '#991b1b', surface: '#fefefe', radius: 4, font: "'Pretendard', serif" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('theme');
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem('oasis_design_tokens');
    return saved ? JSON.parse(saved) : { primary: '#2563eb', secondary: '#1a3b6e', surface: '#ffffff', radius: 8, font: "'Pretendard', sans-serif" };
  });

  // AI
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImg, setUploadedImg] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [extractedJson, setExtractedJson] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // API Keys
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState(localStorage.getItem('OASIS_APPS_SCRIPT_URL') || '');
  const [mailToken, setMailToken] = useState(localStorage.getItem('OASIS_MAIL_TOKEN') || '');
  const [webMagazineUrl, setWebMagazineUrl] = useState(localStorage.getItem('OASIS_WEB_MAGAZINE_URL') || 'https://ohmagazine.netlify.app/');
  const [gaMeasurementId, setGaMeasurementId] = useState(localStorage.getItem(GA_MEASUREMENT_ID_KEY) || '');

  const saveApiKeys = async () => {
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('OASIS_APPS_SCRIPT_URL', appsScriptUrl.trim());
    localStorage.setItem('OASIS_MAIL_TOKEN', mailToken.trim());
    localStorage.setItem('OASIS_WEB_MAGAZINE_URL', webMagazineUrl.trim() || 'https://ohmagazine.netlify.app/');
    const measurementId = normalizeGaMeasurementId(gaMeasurementId);
    if (measurementId) {
      localStorage.setItem(GA_MEASUREMENT_ID_KEY, measurementId);
      await saveAnalyticsSettings({ measurementId, updatedAt: new Date().toISOString() });
      setGaMeasurementId(measurementId);
    }
    localStorage.removeItem('GMAIL_USER');
    localStorage.removeItem('GMAIL_PASS');
    alert('✅ API 키, 인증 정보, 웹 매거진 링크가 로컬 스토리지에 안전하게 저장되었습니다.');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImg(ev.target.result);
    reader.readAsDataURL(file);
  }, []);

  const runVisionExtract = async () => {
    setAiLoading(true);
    try {
      const apiKey = localStorage.getItem('GEMINI_API_KEY');
      if (!apiKey) { alert('Gemini API 키가 설정되지 않았습니다. API 설정에서 키를 입력하세요.'); return; }
      const preset = SAMPLE_PRESETS[selectedPreset];
      const prompt = buildDesignSystemPrompt(uploadedImg ? null : preset);
      let body;
      if (uploadedImg) {
        const base64 = uploadedImg.split(',')[1];
        const mimeType = uploadedImg.split(';')[0].split(':')[1];
        body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }], generationConfig: { response_mime_type: "application/json" } };
      } else {
        body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FREE_TIER_MODEL}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error?.message || `Gemini API 오류 (${res.status})`);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('AI 응답 없음');
      const parsed = parseDesignSystemJson(text);
      setExtractedJson(parsed);
      localStorage.setItem('oasis_design_system_last_extract', JSON.stringify(parsed));
      alert('✅ 디자인 시스템 추출 완료!');
    } catch (e) {
      if (!uploadedImg) {
        const simulated = createPresetDesignSystemExtraction(SAMPLE_PRESETS[selectedPreset]);
        setExtractedJson(simulated);
        localStorage.setItem('oasis_design_system_last_extract', JSON.stringify(simulated));
        alert('✅ 프리셋 기반 디자인 시스템 예시를 적용했습니다.');
      } else { alert('추출 실패: ' + e.message); }
    } finally { setAiLoading(false); }
  };

  const applyExtracted = () => {
    if (!extractedJson) return;
    setTokens(normalizeExtractedTokens(extractedJson, tokens));
    localStorage.setItem('oasis_design_system_last_extract', JSON.stringify(extractedJson));
    setActiveTab('tokens');
  };

  const saveAndDeploy = () => {
    localStorage.setItem('oasis_design_tokens', JSON.stringify(tokens));
    if (extractedJson) localStorage.setItem('oasis_design_system_last_extract', JSON.stringify(extractedJson));
    document.documentElement.style.setProperty('--primary', tokens.primary);
    document.documentElement.style.setProperty('--radius', tokens.radius + 'px');
    document.documentElement.style.setProperty('--surface', tokens.surface);
    alert('✅ 설정이 저장되고 전역 배포되었습니다.');
  };

  const copyExtractionGuide = async () => {
    try {
      await navigator.clipboard.writeText(DESIGN_SYSTEM_EXTRACTION_GUIDE);
      alert('✅ 디자인 추출 가이드가 복사되었습니다.');
    } catch {
      alert('브라우저 권한 문제로 복사하지 못했습니다. 화면의 가이드 내용을 확인해주세요.');
    }
  };

  const tabs = [
    { id: 'theme', icon: 'fas fa-cog', label: '기본 설정' },
    { id: 'api', icon: 'fas fa-key', label: 'API 및 인증 관리' },
    { id: 'ai', icon: 'fas fa-palette', label: 'AI 디자인 추출기' },
    { id: 'tokens', icon: 'fas fa-swatchbook', label: '토큰 관리 (Tokens)' },
    { id: 'components', icon: 'fas fa-puzzle-piece', label: '퍼블리싱 가이드 (Components)' },
  ];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>⚙️ 시스템 환경 설정</h2><p>Design Tokens, UI Components, AI Extractor</p></div>
        <button className="btn" onClick={saveAndDeploy} style={{ background:'#4f46e5', color:'white', padding:'14px 28px', fontSize:15 }}>
          <i className="fas fa-save"></i> 설정 저장 및 전역 배포
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'2px solid #e2e8f0', marginBottom:30 }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'14px 22px', cursor:'pointer', fontWeight: activeTab===t.id ? 800 : 500,
              color: activeTab===t.id ? '#4f46e5' : '#94a3b8', borderBottom: activeTab===t.id ? '3px solid #4f46e5' : '3px solid transparent',
              fontSize:13, display:'flex', alignItems:'center', gap:8, transition:'0.2s' }}>
            <i className={t.icon}></i> {t.label}
          </div>
        ))}
      </div>

      {/* === 기본 설정 === */}
      {activeTab === 'theme' && (
        <div className="card" style={{ padding:30 }}>
          <h3 style={{ marginTop:0, marginBottom:25 }}>디자인 테마 간편 설정</h3>
          <div className="grid-2">
            <div>
              <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:8 }}>브랜드 컬러 (Primary)</label>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <input type="color" value={tokens.primary} onChange={e => setTokens({...tokens, primary:e.target.value})} style={{ width:50, height:40, border:'none', padding:0, cursor:'pointer' }} />
                <span style={{ fontFamily:'monospace', fontWeight:900, color:'#475569' }}>{tokens.primary}</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:8 }}>카드 모서리 둥글기 (Radius): {tokens.radius}px</label>
              <input type="range" min="0" max="24" step="4" value={tokens.radius} onChange={e => setTokens({...tokens, radius:Number(e.target.value)})} style={{ marginTop:5, accentColor:'#4f46e5' }} />
            </div>
          </div>
        </div>
      )}

      {/* === API 관리 === */}
      {activeTab === 'api' && (
        <div className="card" style={{ padding:30 }}>
          <h3 style={{ marginTop:0, marginBottom:25 }}><i className="fas fa-key"></i> 외부 서비스 API 키 및 인증 관리</h3>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:25 }}>
            입력하신 정보는 서버에 전송되지 않고 사용 중인 브라우저(Local Storage)에만 안전하게 보관됩니다.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:600 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                Gemini API Key (뉴스 분석용)
              </label>
              <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                Apps Script 웹앱 URL (뉴스레터 발송)
              </label>
              <input type="url" value={appsScriptUrl} onChange={e => setAppsScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
              <p style={{ fontSize:11, color:'#64748b', marginTop:5, fontWeight:'bold' }}>Netlify Function 대신 Google Apps Script가 Gmail 발송을 처리합니다.</p>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                메일 토큰 (선택)
              </label>
              <input type="password" value={mailToken} onChange={e => setMailToken(e.target.value)} placeholder="Apps Script 속성 OASIS_MAIL_TOKEN과 동일하게 입력" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                웹 매거진 전체 읽기 URL
              </label>
              <input type="url" value={webMagazineUrl} onChange={e => setWebMagazineUrl(e.target.value)} placeholder="https://ohmagazine.netlify.app/" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
              <p style={{ fontSize:11, color:'#64748b', marginTop:5, fontWeight:'bold' }}>이메일 하단의 “웹 매거진에서 전체 읽기” 버튼이 이 주소로 이동합니다.</p>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                Google Analytics 4 Measurement ID
              </label>
              <input value={gaMeasurementId} onChange={e => setGaMeasurementId(e.target.value)} placeholder="G-XXXXXXXXXX" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1', textTransform:'uppercase' }} />
              <p style={{ fontSize:11, color:'#64748b', marginTop:5, fontWeight:'bold' }}>기사 클릭 이벤트를 Netlify Function 없이 GA4로 직접 전송합니다.</p>
            </div>
            <button className="btn btn-primary" onClick={saveApiKeys} style={{ width:200, marginTop:10, padding:'14px 0' }}>
              <i className="fas fa-save"></i> API 정보 로컬 저장
            </button>
          </div>
        </div>
      )}

      {/* === AI 추출기 === */}
      {activeTab === 'ai' && (
        <div className="card" style={{ padding:35 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
            <div>
              <h3 style={{ marginBottom:8 }}>Vision API 레퍼런스 분석</h3>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:18 }}>기획 시안이나 벤치마킹 사이트의 스크린샷을 업로드하면 AI가 토큰, 컴포넌트, 레이아웃, 인터랙션까지 디자인 시스템 형태로 역설계합니다.</p>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:16, background:'#f8fafc', marginBottom:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:900, color:'#1e293b' }}>디자인 추출 가이드 적용됨</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:4, lineHeight:1.5 }}>첨부 가이드 기준으로 재사용 가능한 디자인 시스템 JSON을 생성합니다.</div>
                  </div>
                  <button className="btn btn-outline" type="button" onClick={copyExtractionGuide} style={{ padding:'8px 12px', fontSize:12, flexShrink:0 }}>
                    <i className="fas fa-copy"></i> 가이드 복사
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
                  {['Design Tokens', 'Components', 'Layout Rules', 'Interactions', 'Style Principles', 'Strict JSON'].map(item => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:7, color:'#475569', fontSize:12, fontWeight:800 }}>
                      <i className="fas fa-check-circle" style={{ color:'#10b981' }}></i> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('design-file-input').click()}
                style={{ border:`2px dashed ${dragOver?'#4f46e5':'#93c5fd'}`, borderRadius:16, padding: uploadedImg ? 10 : 50, textAlign:'center', cursor:'pointer', background: dragOver ? '#eef2ff' : '#f8fafc', transition:'0.3s', marginBottom:25 }}>
                {uploadedImg ? <img src={uploadedImg} alt="uploaded" style={{ maxWidth:'100%', maxHeight:200, borderRadius:12 }} /> : (
                  <><i className="fas fa-image" style={{ fontSize:40, color:'#93c5fd', marginBottom:10, display:'block' }}></i>
                  <div style={{ fontWeight:900, fontSize:15 }}>스크린샷 이미지 업로드 (Drag & Drop)</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:5 }}>또는 아래 시뮬레이션 샘플을 선택하세요</div></>
                )}
                <input id="design-file-input" type="file" accept="image/*" onChange={handleDrop} style={{ display:'none' }} />
              </div>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:10 }}>시뮬레이션 샘플 선택</div>
              <select value={selectedPreset} onChange={e => setSelectedPreset(Number(e.target.value))} style={{ marginBottom:20, fontWeight:'bold' }}>
                {SAMPLE_PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
              <button className="btn" onClick={runVisionExtract} disabled={aiLoading}
                style={{ width:'100%', padding:'16px 0', background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'white', fontSize:16, fontWeight:900, borderRadius:12 }}>
                {aiLoading ? <><i className="fas fa-spinner fa-spin"></i> 분석 중...</> : <><i className="fas fa-pencil-alt"></i> AI 디자인 시스템 추출</>}
              </button>
            </div>
            <div>
              <div style={{ background:'#1e293b', borderRadius:12, padding:25, minHeight:300, maxHeight:560, overflow:'auto' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <span style={{ color:'#6366f1', fontWeight:900 }}>&lt;/&gt;</span>
                  <span style={{ color:'#f59e0b', fontWeight:900, fontSize:15 }}>Design System JSON</span>
                </div>
                {extractedJson ? <pre style={{ color:'#94a3b8', fontSize:13, fontFamily:'monospace', whiteSpace:'pre-wrap', lineHeight:1.8 }}>{JSON.stringify(extractedJson, null, 2)}</pre>
                  : <p style={{ color:'#475569', fontSize:14 }}>AI 추출 대기 중...</p>}
              </div>
              {extractedJson && <button className="btn btn-primary" onClick={applyExtracted} style={{ width:'100%', marginTop:15, padding:'14px 0', fontSize:14, fontWeight:900 }}><i className="fas fa-check-circle"></i> 핵심 토큰에 적용하기</button>}
            </div>
          </div>
        </div>
      )}

      {/* === 토큰 관리 === */}
      {activeTab === 'tokens' && (
        <div className="card" style={{ padding:35 }}>
          <div className="grid-2" style={{ gap:50 }}>
            <div>
              <h3 style={{ marginBottom:25 }}>1. Colors (색상)</h3>
              <ColorRow label="Primary (주조색)" value={tokens.primary} onChange={v => setTokens({...tokens, primary:v})} />
              <ColorRow label="Secondary (보조색)" value={tokens.secondary} onChange={v => setTokens({...tokens, secondary:v})} />
              <ColorRow label="Surface (카드 배경)" value={tokens.surface} onChange={v => setTokens({...tokens, surface:v})} />
            </div>
            <div>
              <h3 style={{ marginBottom:25 }}>2. Shape & Typography</h3>
              <div style={{ marginBottom:30 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontWeight:700 }}>Border Radius (모서리 둥기)</span>
                  <span style={{ background:'#f1f5f9', padding:'4px 12px', borderRadius:6, fontWeight:900, fontSize:13 }}>{tokens.radius}px</span>
                </div>
                <input type="range" min="0" max="24" step="1" value={tokens.radius} onChange={e => setTokens({...tokens, radius:Number(e.target.value)})} style={{ width:'100%', accentColor:'#4f46e5' }} />
              </div>
              <div>
                <div style={{ fontWeight:700, marginBottom:10 }}>Font Family (글꼴)</div>
                <input value={tokens.font} onChange={e => setTokens({...tokens, font:e.target.value})} style={{ fontWeight:'bold' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === 컴포넌트 가이드 === */}
      {activeTab === 'components' && (
        <div className="card" style={{ padding:35 }}>
          <h3 style={{ marginBottom:30 }}>UI Component Showcase</h3>
          <div className="grid-2" style={{ gap:40 }}>
            <div>
              <div style={{ fontWeight:900, fontSize:12, color:'#94a3b8', letterSpacing:1, marginBottom:15 }}>BUTTONS</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:30 }}>
                <button style={{ ...cBtn, background:tokens.primary, color:'white', borderRadius:tokens.radius }}>Primary Action</button>
                <button style={{ ...cBtn, background:'transparent', color:tokens.primary, border:`2px solid ${tokens.primary}`, borderRadius:tokens.radius }}>Secondary Outline</button>
                <button style={{ ...cBtn, background:'#10b981', color:'white', borderRadius:tokens.radius, opacity:0.6 }}>Disabled</button>
                <button style={{ ...cBtn, background:'transparent', color:'#64748b', borderRadius:tokens.radius }}>Ghost Button</button>
              </div>
              <div style={{ fontWeight:900, fontSize:12, color:'#94a3b8', letterSpacing:1, marginBottom:15 }}>CARDS & BADGES</div>
              <div style={{ background:tokens.surface, border:'1px solid #e2e8f0', borderRadius:tokens.radius, padding:20 }}>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginBottom:5 }}>Data Card Layout</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:900, fontSize:16 }}>오토핸즈 모빌리티 데이터</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <span className="badge badge-green">Success</span>
                    <span className="badge badge-blue">Active</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:12, color:'#94a3b8', letterSpacing:1, marginBottom:15 }}>INPUT FIELDS</div>
              <div style={{ marginBottom:20 }}><div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Standard Input</div><input placeholder="데이터를 입력하세요" style={{ borderRadius:tokens.radius }} readOnly /></div>
              <div style={{ marginBottom:30 }}><div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Error State</div><input value="잘못된 입력값" style={{ borderRadius:tokens.radius, borderColor:'#ef4444', background:'#fef2f2' }} readOnly /><div style={{ color:'#ef4444', fontSize:11, fontWeight:'bold', marginTop:4 }}>에러 메시지가 표시됩니다.</div></div>
              <div style={{ fontWeight:900, fontSize:12, color:'#94a3b8', letterSpacing:1, marginBottom:15 }}>TYPOGRAPHY</div>
              <div style={{ fontFamily:tokens.font }}>
                <div style={{ fontSize:28, fontWeight:900, marginBottom:4 }}>Heading 1</div>
                <div style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>Heading 2</div>
                <div style={{ fontSize:14, color:'#475569' }}>Body text - 본문 텍스트 샘플입니다.</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>Caption - 부가 설명 텍스트</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:20 }}>
      <span style={{ fontWeight:600, fontSize:14, width:160 }}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width:36, height:36, border:'none', cursor:'pointer', padding:0, borderRadius:6 }} />
      <input value={value} onChange={e => onChange(e.target.value)} style={{ width:100, fontWeight:900, fontSize:13, textAlign:'center', fontFamily:'monospace' }} />
    </div>
  );
}

const cBtn = { padding:'12px 24px', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', fontFamily:'inherit', transition:'0.2s' };
