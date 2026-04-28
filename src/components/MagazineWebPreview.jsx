import React from 'react';

const categorySections = [
  { key: 'macro', label: '🌐 MACRO VIEW' },
  { key: 'platform', label: '🛒 BIZ & PLATFORM' },
  { key: 'auto', label: '🚗 AUTO TRACK' },
  { key: 'ai', label: '🤖 AI STRATEGY' },
  { key: 'security', label: '🛡️ INFO-SECURE' },
];

const fallbackImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400';
const fallbackMainImage = 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800';

export default function MagazineWebPreview({
  open,
  onClose,
  modeLabel = '미리보기 모드',
  title,
  articlesSource,
  mainArticle,
  video,
  securityBanner,
}) {
  if (!open) return null;

  const sourceData = articlesSource || [];
  const sourceMain = mainArticle || (Array.isArray(sourceData) ? sourceData.find(a => a.category === 'main') : sourceData.main);
  const getCat = (cat) => Array.isArray(sourceData) ? sourceData.filter(a => a.category === cat) : (sourceData?.[cat] || []);

  return (
    <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15,23,42,0.9)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
      <div style={{ background:'#f1f5f9', width:'90%', height:'90%', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <div style={{ padding:'15px 30px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ background:'#ef4444', color:'white', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:900 }}>{modeLabel}</span>
            <h3 style={{ margin:0, color:'#1e293b' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background:'#0f172a', color:'white', border:'none', padding:'8px 20px', borderRadius:8, fontWeight:'bold', cursor:'pointer' }}>닫기</button>
        </div>

        <div style={{ padding:40, overflowY:'auto', flex:1 }}>
          <div style={{ maxWidth:1200, margin:'0 auto' }}>
            {video?.url && (
              <div style={{ display:'flex', background:'#0f172a', borderRadius:24, overflow:'hidden', marginBottom:60, boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ width:'65%', aspectRatio:'16/9', background:'black' }}>
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14, padding:20, wordBreak:'break-all' }}>
                    [YouTube Player: {video.url}]
                  </div>
                </div>
                <div style={{ width:'35%', padding:30, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <div style={{ color:'#ef4444', fontSize:12, fontWeight:900, marginBottom:10 }}><i className="fab fa-youtube"></i> {video.source || 'YouTube'}</div>
                  <h2 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:15, lineHeight:1.4 }}>{video.title}</h2>
                  <p style={{ color:'#94a3b8', fontSize:13, lineHeight:1.6 }}>{video.desc}</p>
                </div>
              </div>
            )}

            {sourceMain && (
              <div style={{ marginBottom:60 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <span style={{ width:6, height:24, background:'#2563eb', borderRadius:10 }}></span>
                  <h2 style={{ fontSize:22, fontWeight:900, color:'#1e293b' }}>오늘의 1면 딥다이브</h2>
                </div>
                <div style={{ display:'flex', background:'white', borderRadius:24, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ width:'50%', height:400, position:'relative' }}>
                    <img src={sourceMain.img || fallbackMainImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <div style={{ position:'absolute', bottom:0, left:0, padding:30, background:'linear-gradient(transparent, rgba(0,0,0,0.8))', width:'100%' }}>
                      <span style={{ background:'#2563eb', color:'white', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:900, marginBottom:10, display:'inline-block' }}>FOCUS</span>
                      <h3 style={{ color:'white', fontSize:26, fontWeight:900 }}>{sourceMain.title}</h3>
                    </div>
                  </div>
                  <div style={{ width:'50%', padding:40, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #f1f5f9', paddingBottom:15, marginBottom:15 }}>
                      <span style={{ color:'#2563eb', fontSize:14, fontWeight:900 }}>{sourceMain.brand}</span>
                      <span style={{ color:'#94a3b8', fontSize:12, fontWeight:700 }}>{sourceMain.source}</span>
                    </div>
                    <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, marginBottom:20 }}>{sourceMain.desc}</p>
                    {sourceMain.insight && (
                      <div style={{ background:'#eff6ff', padding:20, borderRadius:16, border:'1px solid #dbeafe' }}>
                        <div style={{ fontSize:11, fontWeight:900, color:'#2563eb', marginBottom:5 }}><i className="fas fa-lightbulb"></i> R&D INSIGHT</div>
                        <p style={{ fontSize:13, color:'#1e40af', fontWeight:700, lineHeight:1.5 }}>{sourceMain.insight}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {categorySections.map(section => {
              const articles = getCat(section.key);
              if (articles.length === 0 && (section.key !== 'security' || !securityBanner)) return null;

              return (
                <div key={section.key} style={{ marginBottom:60 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', borderBottom:'2px solid #1e293b', paddingBottom:10, marginBottom:25 }}>
                    <h2 style={{ fontSize:18, fontWeight:900, color:'#1e293b' }}>{section.label}</h2>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:25 }}>
                    {section.key === 'security' && securityBanner && (
                      <div style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', position:'relative', minHeight:300 }}>
                        <img src={securityBanner} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        <div style={{ position:'absolute', bottom:20, left:20, background:'rgba(0,0,0,0.8)', color:'white', padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:900 }}>🚨 보안 캠페인</div>
                      </div>
                    )}
                    {articles.map((article, index) => (
                      <div key={index} style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                        <div style={{ width:'100%', aspectRatio:'16/10' }}>
                          <img src={article.img || fallbackImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                        <div style={{ padding:20, flex:1, display:'flex', flexDirection:'column' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                            <span style={{ color:'#2563eb', fontSize:11, fontWeight:800 }}>[{article.brand}]</span>
                            <span style={{ color:'#94a3b8', fontSize:10, fontWeight:700 }}>{article.source}</span>
                          </div>
                          <h4 style={{ fontSize:16, fontWeight:900, color:'#1e293b', marginBottom:10, lineHeight:1.4 }}>{article.title}</h4>
                          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.5, marginBottom:15 }}>{article.desc}</p>
                          {article.insight && (
                            <div style={{ marginTop:'auto', paddingTop:15, borderTop:'1px solid #f1f5f9' }}>
                              <div style={{ fontSize:10, fontWeight:900, color:'#1e293b', marginBottom:5 }}>R&D INSIGHT</div>
                              <p style={{ fontSize:12, color:'#475569', fontWeight:700 }}>{article.insight}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
