import React, { useState } from 'react';

export default function Settings() {
  const [color, setColor] = useState('#3b82f6');
  const [radius, setRadius] = useState(8);

  const applyTokens = () => {
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--radius', radius + 'px');
  };

  return (
    <div className="animate-fade">
      <div className="page-header"><div><h2>⚙️ 시스템 환경 및 테마 설정</h2></div></div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', background:'#f1f5f9', borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ padding:'15px 25px', color:'#1e293b', borderBottom:'3px solid #3b82f6', fontWeight:'bold', cursor:'pointer' }}>🎨 테마 토큰 관리</div>
        </div>
        <div style={{ padding:30, minHeight:300 }}>
          <h3 style={{ marginTop:0, marginBottom:20 }}>디자인 테마 커스텀</h3>
          <div className="grid-2">
            <div>
              <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:8 }}>브랜드 컬러 (Primary)</label>
              <input type="color" value={color} onChange={e => { setColor(e.target.value); applyTokens(); }} style={{ height:40, border:'none', padding:0 }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:'bold', color:'#64748b', display:'block', marginBottom:8 }}>카드 모서리 둥글기 (Radius): {radius}px</label>
              <input type="range" min="0" max="24" step="4" value={radius} onChange={e => { setRadius(Number(e.target.value)); applyTokens(); }} style={{ marginTop:5 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
