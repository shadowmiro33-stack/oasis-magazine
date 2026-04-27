import React, { useState, useEffect } from 'react';
import { getCampaigns, saveCampaigns } from '../services/dataService';

export default function CampaignManager() {
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState({ title:'', platform:'', url:'', img:'' });
  const [saving, setSaving] = useState(false);

  const load = async () => { setVideos(await getCampaigns()); };
  useEffect(() => { load(); }, []);

  const addVideo = async () => {
    const { title, url } = form;
    let { img, platform } = form;
    if (!title || !url) return alert('제목과 URL은 필수입니다.');
    platform = platform || 'Shorts';
    if (!img && url.includes('youtube.com/shorts/')) {
      const id = url.split('/shorts/')[1].split('?')[0];
      img = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    } else if (!img) {
      img = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400';
    }
    setSaving(true);
    try {
      const updated = [...videos, { id: Date.now().toString(), title, platform, shortsUrl: url, securityImg: img }];
      await saveCampaigns(updated);
      setForm({ title:'', platform:'', url:'', img:'' });
      load();
      alert('등록 완료!');
    } catch (e) { alert('등록 실패: ' + e.message); }
    finally { setSaving(false); }
  };

  const deleteVideo = async (id) => {
    const updated = videos.filter(v => v.id !== id && v.id !== Number(id));
    await saveCampaigns(updated);
    load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>📱 숏츠 / 릴스 큐레이션 관리</h2><p>유튜브 숏츠나 인스타그램 릴스 링크를 등록하여 뉴스레터에 포함합니다.</p></div>
      </div>
      <div className="card" style={{ border:'2px solid #ec4899' }}>
        <div className="card-title" style={{ color:'#be185d' }}><i className="fas fa-video"></i> 신규 숏츠/릴스 등록</div>
        <div style={{ background:'#fdf2f8', padding:20, borderRadius:12, marginBottom:30 }}>
          <div style={{ display:'flex', gap:10, marginBottom:10 }}>
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="영상 제목" style={{ flex:1, fontWeight:'bold', borderColor:'#fbcfe8' }} />
            <input value={form.platform} onChange={e => setForm({...form, platform:e.target.value})} placeholder="플랫폼 (예: YouTube Shorts)" style={{ width:200, borderColor:'#fbcfe8' }} />
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:15 }}>
            <input value={form.url} onChange={e => setForm({...form, url:e.target.value})} placeholder="숏츠/릴스 링크 URL" style={{ flex:1, borderColor:'#fbcfe8' }} />
            <input value={form.img} onChange={e => setForm({...form, img:e.target.value})} placeholder="썸네일 이미지 URL (선택사항)" style={{ flex:1, borderColor:'#fbcfe8' }} />
          </div>
          <button className="btn" disabled={saving} onClick={addVideo} style={{ width:'100%', height:45, background:'#db2777', color:'white' }}>
            {saving ? '처리 중...' : '등록하기'}
          </button>
        </div>

        <div className="card-title" style={{ borderTop:'1px solid #e2e8f0', paddingTop:25 }}><i className="fas fa-list"></i> 등록된 영상 목록</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:20 }}>
          {videos.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8', fontSize:13, gridColumn:'1 / -1' }}>등록된 영상이 없습니다.</div>
          ) : videos.map(v => {
            const imgUrl = v.shortsUrl ? v.securityImg : v.url;
            const title = v.title || v.name || '영상';
            return (
              <div key={v.id} style={{ background:'#fdf2f8', border:'1px solid #fbcfe8', borderRadius:12, padding:15, display:'flex', flexDirection:'column' }}>
                <div style={{ position:'relative', width:'100%', height:180, borderRadius:8, overflow:'hidden', marginBottom:12 }}>
                  <img src={imgUrl} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {v.shortsUrl && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.2)' }}><i className="fas fa-play-circle" style={{ color:'white', fontSize:36, textShadow:'0 2px 4px rgba(0,0,0,0.3)' }}></i></div>}
                </div>
                <div style={{ fontSize:14, fontWeight:900, color:'#1e293b', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={title}>{title}</div>
                <div style={{ fontSize:11, color:'#db2777', fontWeight:'bold', marginBottom:10 }}>{v.platform || '배너'}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                  {v.shortsUrl ? <a href={v.shortsUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#64748b', fontWeight:'bold', textDecoration:'underline' }}>링크 확인</a> : <span></span>}
                  <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11, borderRadius:6 }} onClick={() => deleteVideo(v.id)}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
