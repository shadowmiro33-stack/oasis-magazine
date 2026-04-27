import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebase';
import { getSecurityBanners, saveSecurityBanners } from '../services/dataService';

export default function SecurityBanner() {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileRef, setFileRef] = useState(null);

  const load = async () => { setBanners(await getSecurityBanners()); };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!fileRef) return alert('이미지 파일을 먼저 선택해주세요.');
    setUploading(true);
    try {
      const storageRef = ref(storage, `security/${Date.now()}_${fileRef.name}`);
      await uploadBytes(storageRef, fileRef);
      const url = await getDownloadURL(storageRef);
      const updated = [...banners, { id: Date.now().toString(), url, name: fileRef.name }];
      await saveSecurityBanners(updated);
      setFileRef(null);
      load();
      alert('업로드 완료!');
    } catch (e) { alert('업로드 실패: ' + e.message); }
    finally { setUploading(false); }
  };

  const deleteBanner = async (id) => {
    const updated = banners.filter(b => b.id !== id && b.id !== Number(id));
    await saveSecurityBanners(updated);
    load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>🛡️ 보안 캠페인 배너 관리</h2><p>웹 매거진에 노출될 로컬 PC 이미지를 업로드하여 배너 풀을 관리합니다.</p></div>
      </div>
      <div className="card" style={{ border:'2px solid #3b82f6' }}>
        <div className="card-title" style={{ color:'#1d4ed8' }}><i className="fas fa-cloud-upload-alt"></i> 신규 배너 업로드</div>
        <div style={{ display:'flex', gap:10, alignItems:'center', background:'#eff6ff', padding:20, borderRadius:12, marginBottom:30 }}>
          <input type="file" accept="image/*" onChange={e => setFileRef(e.target.files[0] || null)} style={{ flex:1, background:'white', borderColor:'#bfdbfe', fontWeight:'bold' }} />
          <button className="btn btn-primary" disabled={uploading} onClick={upload} style={{ width:150, height:45 }}>
            {uploading ? '전송 중...' : '이미지 업로드'}
          </button>
        </div>
        <div className="card-title" style={{ borderTop:'1px solid #e2e8f0', paddingTop:25 }}><i className="fas fa-images"></i> 등록된 배너 목록</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:20 }}>
          {banners.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8', fontSize:13, gridColumn:'1 / -1' }}>등록된 배너가 없습니다.</div>
          ) : banners.map(img => (
            <div key={img.id} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:15, display:'flex', flexDirection:'column' }}>
              <img src={img.url} alt={img.name} style={{ width:'100%', height:140, objectFit:'cover', borderRadius:8, border:'1px solid #cbd5e1', marginBottom:12 }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                <span style={{ fontSize:11, color:'#64748b', fontWeight:'bold', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:10 }} title={img.name}>{img.name || '배너 이미지'}</span>
                <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11, borderRadius:6 }} onClick={() => deleteBanner(img.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
