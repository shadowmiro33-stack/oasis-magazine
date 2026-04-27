import React, { useState, useEffect } from 'react';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('oasis_companies') || 'null');
    if (saved) setCompanies(saved);
    else setCompanies([
      { name: '엔카닷컴', keywords: '엔카, 중고차, 직영' },
      { name: '케이카', keywords: '케이카, Kcar, 내차사기' },
      { name: '헤이딜러', keywords: '헤이딜러, 피알앤디, 내차팔기' },
      { name: '쏘카', keywords: '쏘카, 카셰어링, 모빌리티' },
    ]);
  }, []);

  const save = (list) => { setCompanies(list); localStorage.setItem('oasis_companies', JSON.stringify(list)); };

  const addCompany = () => {
    if (!newName.trim()) return alert('기업명을 입력하세요.');
    save([...companies, { name: newName.trim(), keywords: newKeywords.trim() }]);
    setNewName(''); setNewKeywords('');
  };

  const deleteCompany = (idx) => { const copy = [...companies]; copy.splice(idx, 1); save(copy); };

  return (
    <div className="animate-fade">
      <div className="card" style={{ border:'2px solid #3b82f6', background:'#eff6ff', marginBottom:30 }}>
        <div className="card-title" style={{ color:'#1d4ed8' }}><i className="fas fa-building"></i> 🏢 모니터링 대상 업체 및 키워드 관리</div>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="기업명 (예: 엔카닷컴)" style={{ flex:1, fontWeight:'bold', borderColor:'#bfdbfe' }} />
        <input value={newKeywords} onChange={e => setNewKeywords(e.target.value)} placeholder="추적 키워드 쉼표 구분 (예: 엔카, 중고차, 매입)" style={{ flex:2, borderColor:'#bfdbfe' }} />
        <button className="btn btn-primary" onClick={addCompany}>➕ 추가</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:15 }}>
        {companies.map((c, i) => (
          <div key={i} style={{ background:'white', border:'1px solid #bfdbfe', borderRadius:12, padding:15, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:900, fontSize:16, color:'#1e3a8a' }}>{c.name}</span>
              <button onClick={() => deleteCompany(i)} style={{ color:'#ef4444', border:'none', background:'none', cursor:'pointer', fontSize:14 }}><i className="fas fa-times-circle"></i></button>
            </div>
            <div style={{ fontSize:12, color:'#475569', background:'#f8fafc', padding:'8px 10px', borderRadius:8 }}># {c.keywords}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
