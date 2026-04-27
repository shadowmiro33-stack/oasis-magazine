import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc 
} from "firebase/firestore";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "firebase/auth";
import { 
  LayoutDashboard, Robot, Plane, Building, Settings, 
  LogOut, Save, Trash2, PlusCircle, Magic, FileSpreadsheet, FileText 
} from 'lucide-react'; // 아이콘 라이브러리
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

// 🎯 Firebase 설정 (기존 정보 그대로 사용)
const firebaseConfig = {
  apiKey: "AIzaSyBjx92fZFNCi8c9nSgG6nU_eJfwq3356Uk",
  authDomain: "magazine-13f81.firebaseapp.com",
  projectId: "magazine-13f81",
  storageBucket: "magazine-13f81.firebasestorage.app",
  messagingSenderId: "897855603773",
  appId: "1:897855603773:web:82e68dd3075df768e95654"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  // --- States ---
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loginInfo, setLoginInfo] = useState({ email: '', pw: '' });
  const [stats, setStats] = useState({ reports: 0, policies: 0, drafts: 0 });
  const [apiKey, setApiKey] = useState(localStorage.getItem('oasis_gemini_key') || '');
  
  // 데이터 스테이트
  const [drafts, setDrafts] = useState({ main: null, ai: [], auto: [] });
  const [policies, setPolicies] = useState([]);
  const [history, setHistory] = useState([]);
  
  // 입력 폼 스테이트
  const [aiInput, setAiInput] = useState({ url: '', title: '', brand: '', source: '', desc: '', insight: '', img: '', category: 'auto' });
  const [loading, setLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadPolicies();
        loadHistory();
      }
    });
  }, []);

  useEffect(() => {
    // 통계 업데이트
    const totalDrafts = (drafts.main ? 1 : 0) + drafts.ai.length + drafts.auto.length;
    setStats(prev => ({ ...prev, policies: policies.length, drafts: totalDrafts }));
  }, [policies, drafts]);

  // --- Functions ---
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginInfo.email, loginInfo.pw);
    } catch (e) { alert("로그인 실패"); }
  };

  const loadPolicies = async () => {
    const docSnap = await getDoc(doc(db, "settings", "policies"));
    if (docSnap.exists()) setPolicies(docSnap.data().list || []);
  };

  const loadHistory = async () => {
    const q = await getDocs(collection(db, "magazines"));
    const data = q.docs.map(d => ({ id: d.id, ...d.data() }));
    setHistory(data);
    setStats(prev => ({ ...prev, reports: data.length }));
  };

  // 🔥 Gemini AI 분석 로직 (React 버전)
  const runAIAnalysis = async () => {
    if (!aiInput.url) return alert("URL을 입력하세요");
    setLoading(true);

    try {
      // 1. 크롤링 시도 (Allorigins 프록시)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(aiInput.url)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      
      // 임시로 URL에서 소스 이름 추출
      const sourceName = new URL(aiInput.url).hostname.replace('www.', '');

      // 2. Gemini 호출
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const aiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${aiInput.url} 기사를 분석해서 JSON으로 요약해줘...` }] }], // 프롬프트 생략(기존과 동일)
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const aiData = await aiResponse.json();
      const result = JSON.parse(aiData.candidates[0].content.parts[0].text);

      setAiInput(prev => ({
        ...prev,
        ...result,
        source: result.source || sourceName,
        img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400"
      }));
    } catch (e) {
      alert("AI 분석 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addToDraft = () => {
    if (!aiInput.title) return;
    const { category } = aiInput;
    if (category === 'main') {
      setDrafts(prev => ({ ...prev, main: aiInput }));
    } else {
      setDrafts(prev => ({ ...prev, [category]: [...prev[category], aiInput] }));
    }
    setAiInput({ url: '', title: '', brand: '', source: '', desc: '', insight: '', img: '', category: 'auto' });
  };

  // --- UI Components ---
  if (!user) {
    return (
      <div className="login-overlay" style={styles.overlay}>
        <div style={styles.loginCard}>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#3b82f6', letterSpacing: '2px' }}>AUTOHANDS R&D</div>
          <h2 style={{ margin: '10px 0 30px' }}>OASIS MASTER</h2>
          <input type="text" placeholder="ID" onChange={e => setLoginInfo({...loginInfo, email: e.target.value})} style={styles.input} />
          <input type="password" placeholder="PW" onChange={e => setLoginInfo({...loginInfo, pw: e.target.value})} style={styles.input} />
          <button onClick={login} style={styles.btnDark}>시스템 접속</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      {/* 사이드바 */}
      <div style={styles.sidebar}>
        <div style={{ padding: '30px 25px', fontSize: '22px', fontWeight: 900 }}>OASIS <span style={{ color: '#3b82f6' }}>R&D</span></div>
        <div onClick={() => setActiveMenu('dashboard')} style={activeMenu === 'dashboard' ? styles.menuActive : styles.menu}>대시보드</div>
        <div onClick={() => setActiveMenu('news')} style={activeMenu === 'news' ? styles.menuActive : styles.menu}>뉴스 수집 & AI</div>
        <div onClick={() => setActiveMenu('deploy')} style={activeMenu === 'deploy' ? styles.menuActive : styles.menu}>리포트 배포</div>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={() => signOut(auth)} style={styles.btnLogout}>로그아웃</button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {activeMenu === 'dashboard' && (
          <div>
            <h2>📊 시스템 통합 대시보드</h2>
            <div style={styles.grid3}>
              <div style={styles.statCard}><h3>누적 리포트</h3><p>{stats.reports}호</p></div>
              <div style={styles.statCard}><h3>추적 정책</h3><p>{stats.policies}개</p></div>
              <div style={styles.statCard}><h3>대기 기사</h3><p>{stats.drafts}건</p></div>
            </div>
          </div>
        )}

        {activeMenu === 'news' && (
          <div>
            <h2>🤖 뉴스 수집 및 AI 분석기</h2>
            <div style={styles.card}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={aiInput.url} 
                  onChange={e => setAiInput({...aiInput, url: e.target.value})} 
                  placeholder="뉴스 URL 입력" 
                  style={styles.input} 
                />
                <button onClick={runAIAnalysis} disabled={loading} style={styles.btnPrimary}>
                  {loading ? '분석 중...' : 'AI 분석 실행'}
                </button>
              </div>
              
              {aiInput.title && (
                <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <input value={aiInput.title} onChange={e => setAiInput({...aiInput, title: e.target.value})} style={styles.input} />
                    <textarea value={aiInput.desc} onChange={e => setAiInput({...aiInput, desc: e.target.value})} style={styles.input} rows="4" />
                    <select value={aiInput.category} onChange={e => setAiInput({...aiInput, category: e.target.value})} style={styles.input}>
                      <option value="auto">Auto</option>
                      <option value="ai">AI</option>
                      <option value="main">Main</option>
                    </select>
                    <button onClick={addToDraft} style={styles.btnDark}>대기열 전송</button>
                  </div>
                  {/* 미리보기 영역 (기존 HTML 구조와 동일하게 스타일 적용) */}
                  <div style={styles.preview}>
                    <h4>미리보기</h4>
                    <p><b>{aiInput.brand}</b> | {aiInput.source}</p>
                    <h5>{aiInput.title}</h5>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  loginCard: { background: 'white', padding: '50px', borderRadius: '24px', width: '350px', textAlign: 'center' },
  sidebar: { width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' },
  menu: { padding: '15px 25px', cursor: 'pointer', color: '#94a3b8' },
  menuActive: { padding: '15px 25px', cursor: 'pointer', background: '#3b82f6', color: 'white', fontWeight: 'bold' },
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  statCard: { background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' },
  btnPrimary: { background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnDark: { background: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%' },
  btnLogout: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', width: '100%', padding: '10px' },
  preview: { border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#f8fafc' }
};

export default App;