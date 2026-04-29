export function getPremiumNewsletterHTML(issueName, today, campaignData, articlesSource) {
  const main = articlesSource?.main || (Array.isArray(articlesSource) ? articlesSource.find(a => a.category === 'main') : null);
  
  let macro = [], platform = [], auto = [], ai = [], security = [];
  
  if (Array.isArray(articlesSource)) {
      macro = articlesSource.filter(a => a.category === 'macro');
      platform = articlesSource.filter(a => a.category === 'platform');
      auto = articlesSource.filter(a => a.category === 'auto');
      ai = articlesSource.filter(a => a.category === 'ai');
      security = articlesSource.filter(a => a.category === 'security');
  } else {
      macro = articlesSource?.macro || [];
      platform = articlesSource?.platform || [];
      auto = articlesSource?.auto || [];
      ai = articlesSource?.ai || [];
      security = articlesSource?.security || [];
  }

  const linkOpen = (url) => url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block; color: inherit; text-decoration: none;">` : '<div>';
  const linkClose = (url) => url ? '</a>' : '</div>';

  const buildPremiumCard = (items) => items.map(a => `
      ${linkOpen(a.link)}
      <div style="background-color: #ffffff; padding: 24px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; box-sizing: border-box; width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #2563eb; font-size: 13px; font-weight: 900; letter-spacing: -0.5px;">${a.brand || 'OASIS 뉴스'}</span>
              ${a.isImportant ? '<span style="background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;">HOT</span>' : ''}
          </div>
          <div style="font-size: 20px; font-weight: 900; color: #1e293b; margin-bottom: 12px; line-height: 1.4; word-break: keep-all;">${a.title}</div>
          <div style="font-size: 15px; color: #475569; line-height: 1.7; word-break: keep-all; margin-bottom: 15px;">${a.desc || ''}</div>
          ${a.insight ? `
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; border-left: 3px solid #3b82f6; box-sizing: border-box;">
              <div style="font-size: 12px; font-weight: 900; color: #3b82f6; margin-bottom: 6px; letter-spacing: 1px;">R&D INSIGHT</div>
              <div style="font-size: 14px; font-weight: bold; color: #334155; line-height: 1.6;">${a.insight}</div>
          </div>` : ''}
          <div style="margin-top: 15px; text-align: right;">
              <span style="display: inline-block; color: #94a3b8; font-size: 13px; font-weight: bold; text-decoration: underline;">원문 읽기</span>
          </div>
      </div>
      ${linkClose(a.link)}
  `).join('');

  let html = `
  <div style="background-color: #f4f6f8; padding: 24px 0; font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; width: 100%; box-sizing: border-box;">
      <div style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); box-sizing: border-box;">
          <div style="background-color: #ffffff; padding: 50px 40px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <div style="color: #2563eb; font-size: 18px; font-weight: 900; margin-bottom: 8px; letter-spacing: 2px;">OASIS</div>
              <div style="color: #64748b; font-size: 13px; font-weight: 800; margin-bottom: 15px;">오토핸즈의 아침을 시작하는 스마트한 리포트</div>
              <div style="color: #0f172a; font-size: 32px; font-weight: 900; line-height: 1.3; word-break: keep-all; margin-bottom: 25px;">바쁜 아침,<br>오늘의 모빌리티 핵심만 빠르게 🚙</div>
              <div style="display: inline-block; background-color: #f8fafc; color: #475569; padding: 8px 20px; border-radius: 30px; font-size: 14px; font-weight: bold; border: 1px solid #e2e8f0;">${today} • ISSUE ${issueName}</div>
          </div>
          <div style="padding: 32px 24px; background-color: #f4f6f8; box-sizing: border-box;">`;

  if(main) {
      html += `
              <div style="margin-bottom: 50px;">
                  <div style="font-size: 14px; font-weight: 900; color: #2563eb; margin-bottom: 15px; letter-spacing: 2px;">FOCUS DIVE</div>
                  ${linkOpen(main.link)}
                  <div style="background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); box-sizing: border-box; width: 100%;">
                      ${main.img ? `<img src="${main.img}" style="width: 100%; max-width: 100%; height: auto; border-bottom: 1px solid #f1f5f9; display: block;" />` : ''}
                      <div style="padding: 25px;">
                          <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 15px; line-height: 1.4; word-break: keep-all;">${main.isImportant ? '<span style="color: #ef4444; font-size:18px; margin-right: 5px;">[단독]</span>' : ''}${main.title}</div>
                          <div style="font-size: 16px; color: #475569; line-height: 1.8; margin-bottom: 25px; word-break: keep-all;">${main.desc}</div>
                          <div style="background-color: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #bfdbfe; box-sizing: border-box;">
                              <div style="font-size: 13px; font-weight: 900; color: #1d4ed8; margin-bottom: 8px; letter-spacing: 1px;">💡 오아시스의 시선</div>
                              <div style="font-size: 15px; font-weight: bold; color: #1e3a8a; line-height: 1.7;">"${main.insight || '핵심 인사이트를 확인하세요.'}"</div>
                          </div>
                          <div style="margin-top: 25px; text-align: center;">
                              <span style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 12px;">기사 전문 읽기 &rarr;</span>
                          </div>
                      </div>
                  </div>
                  ${linkClose(main.link)}
              </div>`;
  }

  const renderSection = (items, title, emoji) => {
      if(!items || items.length === 0) return '';
      return `
      <div style="margin-bottom: 40px;">
          <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #0f172a;">${emoji} ${title}</div>
          ${buildPremiumCard(items)}
      </div>`;
  };

  html += renderSection(macro, 'MACRO VIEW', '🌐');
  html += renderSection(platform, 'BIZ & PLATFORM', '🛒');
  html += renderSection(auto, 'AUTO TRACK', '🚗');
  html += renderSection(ai, 'AI STRATEGY', '🤖');
  html += renderSection(security, 'INFO-SECURE', '🛡️');

  html += `</div>`; 

  html += `<div style="background-color: #ffffff; padding: 40px 24px; text-align: center; border-top: 1px solid #e2e8f0; box-sizing: border-box;">`;
  if(campaignData) {
      const isShorts = !!campaignData.shortsUrl;
      const imgUrl = isShorts ? campaignData.securityImg : (campaignData.emailUrl || campaignData.emailImg || campaignData.url || campaignData.securityImg || campaignData);
      
      const getDeepLinkUrl = (url) => {
          if(!url) return '';
          if(url.includes('youtube.com/shorts/')) return `https://www.youtube.com/watch?v=${url.split('/shorts/')[1].split('?')[0]}`;
          if(url.includes('youtu.be/')) return `https://www.youtube.com/watch?v=${url.split('youtu.be/')[1].split('?')[0]}`;
          return url;
      };
      const safeUrl = getDeepLinkUrl(campaignData.shortsUrl);

      if(isShorts) {
          html += `
          <div style="margin-bottom: 40px; text-align: left; background: #fdf2f8; border-radius: 20px; overflow: hidden; border: 1px solid #fbcfe8; box-shadow: 0 10px 25px rgba(219,39,119,0.1); box-sizing: border-box;">
              <div style="padding: 20px 25px; border-bottom: 1px solid #fce7f3;">
                  <div style="font-size: 16px; font-weight: 900; color: #be185d;">📱 큐레이션 ${campaignData.platform}</div>
              </div>
              <div style="padding: 24px; box-sizing: border-box;">
                  <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                      <img src="${imgUrl}" style="width: 100%; max-width: 100%; height: auto; border-radius: 12px; display: block; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" alt="숏츠 썸네일">
                  </a>
                  <div style="padding-top: 18px;">
                      <div style="font-size: 18px; font-weight: 900; color: #1e293b; margin-bottom: 15px; line-height: 1.4; word-break: keep-all;">${campaignData.title}</div>
                      <a href="${safeUrl}" target="_blank" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;">앱에서 영상 바로보기</a>
                  </div>
              </div>
          </div>`;
      } else {
          html += `<div style="margin-bottom: 28px; padding: 14px; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-sizing: border-box; background-color: #ffffff; text-align: center;"><img src="${imgUrl}" width="560" style="width: 100%; max-width: 560px; height: auto; display: block; margin: 0 auto;" alt="캠페인 배너"></div>`;
      }
  }
  html += `
              <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 12px;">오늘의 뉴스레터, 어떠셨나요? 🐻</div>
              <div style="font-size: 15px; color: #64748b; margin-bottom: 30px;">동료들에게 오아시스를 추천해 주시면 큰 힘이 됩니다!</div>
              <a href="https://ohmagazine.netlify.app/" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 900; font-size: 16px; box-shadow: 0 4px 10px rgba(37,99,235,0.3);" target="_blank">웹 매거진에서 전체 읽기</a>
          </div>
      </div>
      <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; font-weight: bold; line-height: 1.6;">
          OASIS는 오토핸즈 구성원이 아침마다 산업, 모빌리티, AI, 보안 이슈를 빠르게 파악할 수 있도록 정리한 데일리 R&D 리포트입니다.
      </div>
  </div>`;
  return html;
}
