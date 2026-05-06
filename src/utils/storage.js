import initialData from '../core/config/data.json';

const STORAGE_KEY = 'oasis_magazine_data';

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 로컬 스토리지에서 전체 리포트 데이터를 가져옵니다.
 * 데이터가 없으면 data.json의 초기 데이터를 사용합니다.
 */
export const getReports = () => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) {
    // 초기 데이터에 magazineId가 없을 수 있으므로 기본값(rnd) 처리 시 고려
    return initialData.reports || [];
  }
  try {
    return JSON.parse(savedData);
  } catch (error) {
    console.error("데이터 파싱 에러:", error);
    return initialData.reports || [];
  }
};

/**
 * 새로운 기사를 특정 매거진에 발행합니다.
 * @param {string} magazineId - 매거진 ID (rnd, hr 등)
 * @param {object} article - {title, category, summary}
 */
export const addArticle = (magazineId, article) => {
  const reports = getReports();
  const today = formatLocalDate();
  
  // 오늘 날짜의 리포트가 있는지 확인
  let todayReport = reports.find(r => r.date === today);
  
  if (!todayReport) {
    // 오늘 날짜 리포트가 없으면 새로 생성
    todayReport = {
      date: today,
      issue: `VOL.${reports.length + 1}`,
      articles: []
    };
    reports.unshift(todayReport); // 최신 리포트를 위로
  }
  
  // 기사에 magazineId 추가
  const newArticle = { ...article, magazineId };
  todayReport.articles.push(newArticle);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  return true;
};
