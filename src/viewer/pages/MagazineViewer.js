import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { magazines } from '../../core/config/magazines';
import Layout from '../../shared/components/Layout';
import Character from '../../shared/components/Character';
import { getReports } from '../../utils/storage';

const MagazineViewer = () => {
  const { magazineId } = useParams();
  const config = magazines[magazineId] || magazines.rnd;
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const allReports = getReports();
    
    // 매거진 ID에 맞는 기사만 필터링
    const filteredReports = allReports.map(report => ({
      ...report,
      articles: report.articles.filter(article => {
        // magazineId가 없으면 'rnd'로 간주 (초기 데이터 대응)
        const itemMagazineId = article.magazineId || 'rnd';
        return itemMagazineId === magazineId;
      })
    })).filter(report => report.articles.length > 0); // 기사가 있는 리포트만 표시

    setReports(filteredReports);
  }, [magazineId]);

  return (
    <Layout config={config}>
      <Character character={config.character} pointColor={config.pointColor} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {reports.map((report, idx) => (
          <article key={idx} className="brutalist-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
              <span style={{ fontWeight: 700 }}>{report.issue}</span>
              <span style={{ color: '#666' }}>{report.date}</span>
            </div>
            {report.articles.map((article, aIdx) => (
              <div key={aIdx} style={{ marginBottom: aIdx === report.articles.length - 1 ? 0 : '20px' }}>
                <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>{article.title}</h2>
                <span className="brutalist-card" style={{ display: 'inline-block', padding: '4px 10px', fontSize: '12px', fontWeight: 700, backgroundColor: config.pointColor, marginBottom: '15px' }}>
                  #{article.category}
                </span>
                <p style={{ lineHeight: '1.6', fontSize: '16px' }}>{article.summary}</p>
              </div>
            ))}
          </article>
        ))}
      </div>
      
      {reports.length === 0 && (
        <div className="brutalist-card">
          <p>아직 발행된 소식이 없대요! 관리자 화면에서 첫 소식을 만들어보세요.</p>
        </div>
      )}
    </Layout>
  );
};

export default MagazineViewer;