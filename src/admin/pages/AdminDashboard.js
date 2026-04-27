import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { magazines } from '../../core/config/magazines';
import Layout from '../../shared/components/Layout';
import Character from '../../shared/components/Character';
import { fetchAISummary } from '../../api/ai';
import { addArticle } from '../../utils/storage';

const AdminDashboard = () => {
  const { magazineId } = useParams();
  const navigate = useNavigate();
  const config = magazines[magazineId] || magazines.rnd;
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runAISummary = async () => {
    if (!url) return alert("URL을 입력해주세요!");
    setLoading(true);

    try {
      const parsedData = await fetchAISummary(url, config.character);
      setResult(parsedData);
    } catch (error) {
      console.error("AI 에러 상세:", error);
      
      if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Authenticate')) {
        setResult({
          title: "시스템 알림: 서비스 확인 필요",
          category: "에러 확인",
          summary: "AI 서비스가 아직 준비되지 않았거나 API 키 설정이 필요한 상태인 것 같아요. 잠시 후 다시 시도해보세요!"
        });
      } else {
        alert("AI 요약 에러: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (!result) return;
    addArticle(magazineId, result);
    alert('매거진에 성공적으로 발행되었습니다!');
    navigate(`/${magazineId}`);
  };

  return (
    <Layout config={config}>
      <div className="brutalist-card" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px' }}>AI 요약 생성기</h2>
        <p>뉴스 URL을 넣으면 {config.character.name}이 친절하게 요약해줍니다.</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <input 
            type="text" 
            className="brutalist-input"
            placeholder="뉴스 URL을 붙여넣으세요" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button 
            className="brutalist-button"
            onClick={runAISummary}
            disabled={loading}
            style={{ whiteSpace: 'nowrap', backgroundColor: config.mainColor, color: 'white' }}
          >
            {loading ? '분석 중...' : '요약 실행'}
          </button>
        </div>
      </div>

      {result && (
        <div className="brutalist-card" style={{ animation: 'fadeIn 0.5s ease' }}>
          <h3 style={{ color: config.mainColor }}>{result.title}</h3>
          <span className="brutalist-card" style={{ display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 700, backgroundColor: config.pointColor, marginBottom: '15px' }}>
            #{result.category}
          </span>
          <div style={{ padding: '15px', background: '#f9f9f9', borderLeft: `5px solid ${config.mainColor}` }}>
             <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{result.summary}</p>
          </div>
          <button 
            className="brutalist-button" 
            style={{ marginTop: '20px', width: '100%' }}
            onClick={handlePublish}
          >
            매거진에 발행하기
          </button>
        </div>
      )}

      <Character character={{...config.character, message: "여기서 기사를 요약하고 바로 매거진에 실을 수 있대요!"}} pointColor={config.pointColor} />
    </Layout>
  );
};

export default AdminDashboard;
