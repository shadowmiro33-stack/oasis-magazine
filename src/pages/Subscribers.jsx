import React, { useState } from 'react';
import { getAllSubscribers, deleteSubscriber } from '../services/dataService';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const data = await getAllSubscribers();
    setSubscribers(data);
    setLoaded(true);
  };

  React.useEffect(() => { load(); }, []);

  const handleDelete = async (email) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteSubscriber(email);
    load();
  };

  const exportExcel = async () => {
    if (subscribers.length === 0) return alert('추출할 데이터가 없습니다.');
    const XLSX = await import('xlsx');
    const rows = subscribers.map(s => ({
      '가입 일시': s.subscribeDate ? s.subscribeDate.replace('T',' ').substring(0,16) : '---',
      '이메일 주소': s.email,
      '관심 카테고리': s.interests?.length > 0 ? s.interests.join(', ') : '미지정 (전체)',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subscribers');
    XLSX.writeFile(wb, `OASIS_구독자_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h2>💌 뉴스레터 구독자 명단</h2></div>
        <button className="btn" style={{ background:'#107c41', color:'white' }} onClick={exportExcel}>
          <i className="fas fa-file-excel"></i> 전체 엑셀 추출
        </button>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr><th>가입 일시</th><th>구독 이메일 주소</th><th>관심 카테고리</th><th>상태</th><th style={{ width:100 }}>관리</th></tr>
          </thead>
          <tbody>
            {!loaded ? (
              <tr><td colSpan="5" style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>로딩 중...</td></tr>
            ) : subscribers.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>구독자가 없습니다.</td></tr>
            ) : subscribers.map(s => (
              <tr key={s.id}>
                <td>{s.subscribeDate ? s.subscribeDate.replace('T',' ').substring(0,16) : '---'}</td>
                <td style={{ fontWeight:'bold' }}>{s.email}</td>
                <td>
                  {s.interests?.length > 0
                    ? s.interests.map(i => <span key={i} className="badge badge-blue" style={{ marginRight:4 }}>{i}</span>)
                    : <span style={{ color:'#94a3b8', fontSize:11, fontWeight:'bold' }}>미지정 (전체)</span>
                  }
                </td>
                <td><span style={{ color:'#10b981', fontWeight:'bold' }}>● 활성</span></td>
                <td>
                  <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:11 }} onClick={() => handleDelete(s.id)}>차단</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
