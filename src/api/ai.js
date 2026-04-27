/**
 * OASIS Magazine v2.0 - AI Service
 * Gemini AI 연동 및 요약 로직
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const MY_KEY = "AIzaSyDSydvApNx9sO7Y4EsnnKXJsTycS0zfFzc"; // 임시 키 (보안을 위해 Netlify Functions로 이동 권장)
const genAI = new GoogleGenerativeAI(MY_KEY);

/**
 * 기사 내용을 요약합니다.
 * @param {string} url - 기사 URL
 * @param {object} character - 캐릭터 설정 (name 등)
 */
export const fetchAISummary = async (url, character) => {
  // 시도해볼 모델 목록
  const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-pro"];
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const promptText = `
        다음 뉴스 기사 내용을 읽고, '${character.name}'이 사내 동료들에게 소식을 전해주는 것처럼 친근하고 위트 있게 요약해줘.
        말투는 반드시 '~했대요', '~했어요', '~인가 봐요'와 같은 구어체(해요체)를 사용해줘.
        형식은 반드시 다음 JSON 구조로만 답해줘 (마크다운 없이 순수 JSON만):
        {"title": "기사 제목", "category": "분야", "summary": "3줄 이내 요약"}
        
        기사 URL: ${url}
      `;

      const aiResponse = await model.generateContent(promptText);
      const text = aiResponse.response.text();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error(`${modelName} failed:`, error);
      lastError = error;
      // 404 에러인 경우 다음 모델로 시도
      if (error.message.includes('404')) continue;
      // 그 외 치명적 에러는 즉시 중단
      throw error;
    }
  }

  throw lastError;
};
