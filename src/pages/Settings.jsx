import React, { useState, useCallback } from 'react';

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
  const [gmailUser, setGmailUser] = useState(localStorage.getItem('GMAIL_USER') || '');
  const [gmailPass, setGmailPass] = useState(localStorage.getItem('GMAIL_PASS') || '');

  const saveApiKeys = () => {
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('GMAIL_USER', gmailUser);
    localStorage.setItem('GMAIL_PASS', gmailPass);
    alert('✅ API 키 및 인증 정보가 로컬 스토리지에 안전하게 저장되었습니다.');
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
      const prompt = `이 UI 스크린샷을 분석하여 디자인 토큰을 JSON으로 추출해주세요. 반드시 아래 형식으로만 응답: {"primary":"#hex","secondary":"#hex","surface":"#hex","radius":숫자,"font":"폰트","analysis":"설명"}`;
      let body;
      if (uploadedImg) {
        const base64 = uploadedImg.split(',')[1];
        const mimeType = uploadedImg.split(';')[0].split(':')[1];
        body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }], generationConfig: { response_mime_type: "application/json" } };
      } else {
        const preset = SAMPLE_PRESETS[selectedPreset];
        body = { contents: [{ parts: [{ text: `프리셋 분석: ${JSON.stringify(preset)}\n${prompt}` }] }], generationConfig: { response_mime_type: "application/json" } };
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('AI 응답 없음');
      setExtractedJson(JSON.parse(text));
      alert('✅ 디자인 토큰 추출 완료!');
    } catch (e) {
      if (!uploadedImg) {
        setExtractedJson({ ...SAMPLE_PRESETS[selectedPreset], analysis: `${SAMPLE_PRESETS[selectedPreset].name} 프리셋 기반 토큰` });
        alert('✅ 프리셋 기반 토큰 적용!');
      } else { alert('추출 실패: ' + e.message); }
    } finally { setAiLoading(false); }
  };

  const applyExtracted = () => {
    if (!extractedJson) return;
    setTokens({ primary: extractedJson.primary || tokens.primary, secondary: extractedJson.secondary || tokens.secondary, surface: extractedJson.surface || tokens.surface, radius: extractedJson.radius ?? tokens.radius, font: extractedJson.font || tokens.font });
    setActiveTab('tokens');
  };

  const saveAndDeploy = () => {
    localStorage.setItem('oasis_design_tokens', JSON.stringify(tokens));
    document.documentElement.style.setProperty('--primary', tokens.primary);
    document.documentElement.style.setProperty('--radius', tokens.radius + 'px');
    document.documentElement.style.setProperty('--surface', tokens.surface);
    alert('✅ 설정이 저장되고 전역 배포되었습니다.');
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
                Gmail 계정 (뉴스레터 대량 발송용)
              </label>
              <input type="email" value={gmailUser} onChange={e => setGmailUser(e.target.value)} placeholder="example@gmail.com" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:'bold', color:'#334155', display:'block', marginBottom:8 }}>
                Gmail 앱 비밀번호 (16자리)
              </label>
              <input type="password" value={gmailPass} onChange={e => setGmailPass(e.target.value)} placeholder="abcd efgh ijkl mnop" style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #cbd5e1' }} />
              <p style={{ fontSize:11, color:'#ef4444', marginTop:5, fontWeight:'bold' }}>* 구글 계정 설정에서 생성한 '앱 비밀번호'를 입력해야 합니다. (일반 비밀번호 아님)</p>
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
              <p style={{ fontSize:13, color:'#64748b', marginBottom:25 }}>기획 시안이나 벤치마킹 사이트의 스크린샷을 업로드하면 AI가 디자인 토큰을 역설계하여 추출합니다.</p>
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
                {aiLoading ? <><i className="fas fa-spinner fa-spin"></i> 분석 중...</> : <><i className="fas fa-pencil-alt"></i> AI 토큰 추출 및 미리보기 적용</>}
              </button>
            </div>
            <div>
              <div style={{ background:'#1e293b', borderRadius:12, padding:25, minHeight:300 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <span style={{ color:'#6366f1', fontWeight:900 }}>&lt;/&gt;</span>
                  <span style={{ color:'#f59e0b', fontWeight:900, fontSize:15 }}>Extracted Tokens (JSON)</span>
                </div>
                {extractedJson ? <pre style={{ color:'#94a3b8', fontSize:13, fontFamily:'monospace', whiteSpace:'pre-wrap', lineHeight:1.8 }}>{JSON.stringify(extractedJson, null, 2)}</pre>
                  : <p style={{ color:'#475569', fontSize:14 }}>AI 추출 대기 중...</p>}
              </div>
              {extractedJson && <button className="btn btn-primary" onClick={applyExtracted} style={{ width:'100%', marginTop:15, padding:'14px 0', fontSize:14, fontWeight:900 }}><i className="fas fa-check-circle"></i> 토큰에 적용하기</button>}
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
