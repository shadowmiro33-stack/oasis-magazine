import React, { useState, useEffect } from 'react';
import { getAllMagazines, getAllSubscribers, getPolicies } from '../services/dataService';

export default function Dashboard({ draftArticles }) {
  const [stats, setStats] = useState({ reports: 0, subscribers: 0, totalArticles: 0, policies: 0 });
  const [brandRank, setBrandRank] = useState([]);
  const [catData, setCatData] = useState([]);
  const [titleRank, setTitleRank] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [, setLoading] = useState(true);

  const draftsCount = draftArticles
    ? (draftArticles.main ? 1 : 0) + (draftArticles.macro||[]).length + (draftArticles.platform||[]).length
      + (draftArticles.auto||[]).length + (draftArticles.ai||[]).length + (draftArticles.security||[]).length
    : 0;

  const loadStats = async () => {
    setLoading(true);
    try {
      const [mags, subs, policies] = await Promise.all([
        getAllMagazines(), getAllSubscribers(), getPolicies()
      ]);

      // Flatten all articles
      const allArticles = [];
      mags.forEach(m => { if (m.articles) m.articles.forEach(a => allArticles.push({ ...a, issue: m.issueName, pubDate: m.publishDate })); });

      setStats({ reports: mags.length, subscribers: subs.length, totalArticles: allArticles.length, policies: policies.length });

      // Brand ranking (top 8)
      const brandMap = {};
      allArticles.forEach(a => { const b = a.brand || '미분류'; brandMap[b] = (brandMap[b]||0) + 1; });
      const sorted = Object.entries(brandMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
      setBrandRank(sorted);

      // Category distribution
      const catLabels = { main:'🔥 FIRST DIVE', macro:'🌐 MACRO VIEW', platform:'🛒 BIZ & PLATFORM', auto:'🚗 AUTO TRACK', ai:'🤖 AI STRATEGY', security:'🛡️ INFO-SECURE' };
      const catColors = { main:'#ef4444', macro:'#3b82f6', platform:'#f59e0b', auto:'#10b981', ai:'#8b5cf6', security:'#06b6d4' };
      const catMap = {};
      allArticles.forEach(a => { const c = a.category || 'auto'; catMap[c] = (catMap[c]||0) + 1; });
      const total = allArticles.length || 1;
      setCatData(['main','macro','platform','auto','ai','security'].map(k => ({
        key: k, label: catLabels[k], color: catColors[k], count: catMap[k]||0, pct: Math.round(((catMap[k]||0)/total)*100)
      })));

      // Title ranking (top 10)
      const titleMap = {};
      allArticles.forEach(a => {
        const key = (a.title||'').trim();
        if (!key) return;
        if (!titleMap[key]) titleMap[key] = { brand: a.brand||'', count: 0 };
        titleMap[key].count++;
      });
      setTitleRank(Object.entries(titleMap).sort((a,b) => b[1].count - a[1].count).slice(0, 10));

      // Timeline (recent 8)
      setTimeline(mags.slice(0, 8));
    } catch (e) {
      console.error("대시보드 로드 실패", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const brandColors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#64748b'];
  const brandMax = brandRank.length > 0 ? brandRank[0][1] : 1;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>📊 종합 애널리틱스 대시보드</h2>
          <p>배포 현황 · 구독자 · 기사 분석 · 실시간 통계</p>
        </div>
        <button className="btn btn-dark" onClick={loadStats} style={{ fontSize: 12, padding: '10px 18px' }}>
          <i className="fas fa-sync-alt"></i> 새로고침
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 25 }}>
        <KpiCard icon="📰" label="누적 발행 리포트" value={stats.reports} unit="호" gradient="135deg, #eff6ff, #dbeafe" color="#3b82f6" valueColor="#1e3a8a" />
        <KpiCard icon="👥" label="뉴스레터 구독자" value={stats.subscribers} unit="명" gradient="135deg, #f0fdf4, #dcfce7" color="#059669" valueColor="#065f46" />
        <KpiCard icon="📄" label="총 배포된 기사" value={stats.totalArticles} unit="건" gradient="135deg, #fefce8, #fef9c3" color="#a16207" valueColor="#713f12" />
        <div className="card" style={{ textAlign:'center', background:'linear-gradient(135deg, #fdf2f8, #fce7f3)', border:'none', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-15, right:-15, width:70, height:70, background:'rgba(236,72,153,0.1)', borderRadius:'50%' }}></div>
          <div style={{ fontSize:12, color:'#be185d', fontWeight:900, marginBottom:8, letterSpacing:1 }}>🎯 추적 정책 / 대기</div>
          <div style={{ fontSize:42, fontWeight:900, color:'#831843' }}>
            {stats.policies}<span style={{ fontSize:16, color:'#ec4899' }}> / </span><span style={{ fontSize:28, color:'#a21caf' }}>{draftsCount}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Brand Rank + Category Chart */}
      <div className="grid-2" style={{ marginBottom: 25 }}>
        <div className="card" style={{ border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="card-title" style={{ marginBottom: 15 }}>
            <div><i className="fas fa-trophy" style={{ color:'#f59e0b' }}></i> 가장 많이 배포된 기업</div>
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:'bold' }}>전체 리포트 기준</span>
          </div>
          {brandRank.length === 0 ? <EmptyState text="배포된 기사가 없습니다." /> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {brandRank.map(([name, cnt], i) => (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:18, fontSize:12, fontWeight:900, color: i<3 ? brandColors[i] : '#94a3b8', textAlign:'center' }}>{i+1}</div>
                  <div style={{ width:80, fontSize:13, fontWeight:'bold', color:'#334155', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={name}>{name}</div>
                  <div style={{ flex:1, background:'#f1f5f9', borderRadius:6, height:24, overflow:'hidden' }}>
                    <div style={{ width:`${Math.round((cnt/brandMax)*100)}%`, height:'100%', background:brandColors[i%brandColors.length], borderRadius:6, transition:'width 0.6s', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8 }}>
                      <span style={{ color:'white', fontSize:10, fontWeight:900 }}>{cnt}건</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="card-title" style={{ marginBottom: 15 }}>
            <div><i className="fas fa-chart-bar" style={{ color:'#8b5cf6' }}></i> 카테고리별 기사 분포</div>
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:'bold' }}>전체 누적</span>
          </div>
          {catData.length === 0 || stats.totalArticles === 0 ? <EmptyState text="배포된 기사가 없습니다." /> : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {catData.map(c => (
                <div key={c.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:'bold', color:'#475569' }}>{c.label}</span>
                    <span style={{ fontSize:12, fontWeight:900, color:c.color }}>{c.count}건 ({c.pct}%)</span>
                  </div>
                  <div style={{ width:'100%', background:'#f1f5f9', borderRadius:6, height:20, overflow:'hidden' }}>
                    <div style={{ width:`${c.pct}%`, height:'100%', background:c.color, borderRadius:6, transition:'width 0.6s' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Top Articles + Timeline */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div className="card" style={{ border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', padding:0, overflow:'hidden' }}>
          <div className="card-title" style={{ padding:'20px 25px 15px', marginBottom:0 }}>
            <div><i className="fas fa-fire" style={{ color:'#ef4444' }}></i> 다빈출 기사 랭킹 TOP 10</div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th style={{ width:40 }}>#</th><th>기업</th><th>기사 제목</th><th style={{ width:60 }}>출현수</th></tr></thead>
              <tbody>
                {titleRank.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign:'center', color:'#cbd5e1', padding:30 }}>배포된 기사가 없습니다.</td></tr>
                ) : titleRank.map(([title, info], i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:900, textAlign:'center', fontSize: i<3?16:13 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                    <td><span className="badge badge-blue">{info.brand}</span></td>
                    <td style={{ fontSize:13, fontWeight:600, color:'#334155', maxWidth:300, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={title}>{title}</td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ background: i<3?'#ef4444':'#64748b', color:'white', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:900 }}>{info.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="card-title" style={{ marginBottom: 15 }}>
            <div><i className="fas fa-history" style={{ color:'#06b6d4' }}></i> 최근 발행 타임라인</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0, maxHeight:380, overflowY:'auto' }}>
            {timeline.length === 0 ? <EmptyState text="발행된 리포트가 없습니다." /> :
              timeline.map((m, i) => {
                const dateObj = m.publishDate ? new Date(m.publishDate) : null;
                const dateStr = dateObj ? `${dateObj.getMonth()+1}/${dateObj.getDate()}` : m.id;
                const timeStr = dateObj ? `${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}` : '';
                const isFirst = i === 0;
                return (
                  <div key={m.id} style={{ display:'flex', gap:15, padding:'14px 0', borderBottom:'1px solid #f1f5f9', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:40 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background: isFirst?'#3b82f6':'#cbd5e1', border:`2px solid ${isFirst?'#93c5fd':'#e2e8f0'}`, flexShrink:0 }}></div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:14, fontWeight:900, color: isFirst?'#1e293b':'#475569' }}>{m.issueName}</span>
                        {isFirst && <span style={{ background:'#dbeafe', color:'#2563eb', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:900 }}>LATEST</span>}
                      </div>
                      <div style={{ fontSize:11, color:'#94a3b8', fontWeight:'bold' }}>{dateStr} {timeStr} · {m.articles?.length || 0}건 수록</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, unit, gradient, color, valueColor }) {
  return (
    <div className="card" style={{ textAlign:'center', background:`linear-gradient(${gradient})`, border:'none', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-15, right:-15, width:70, height:70, background:`${color}15`, borderRadius:'50%' }}></div>
      <div style={{ fontSize:12, color, fontWeight:900, marginBottom:8, letterSpacing:1 }}>{icon} {label}</div>
      <div style={{ fontSize:42, fontWeight:900, color:valueColor }}>{value}<span style={{ fontSize:16, marginLeft:3, color }}>{unit}</span></div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ textAlign:'center', padding:30, color:'#cbd5e1', fontSize:13 }}>{text}</div>;
}
