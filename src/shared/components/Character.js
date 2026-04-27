import React from 'react';

const Character = ({ character, pointColor }) => {
  // 캐릭터 이미지 경로에 따라 이모지 결정 (임시)
  const getEmoji = (imagePath) => {
    if (imagePath.includes('gorani')) return '🦌';
    if (imagePath.includes('owl')) return '🦉';
    return '👤';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', margin: '30px 0' }}>
      <div className="brutalist-card" style={{ padding: '10px', borderRadius: '50%', backgroundColor: pointColor, width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '30px' }}>{getEmoji(character.image)}</span>
      </div>
      <div className="brutalist-card" style={{ position: 'relative', flex: 1 }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>{character.name}</h4>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>{character.message}</p>
      </div>
    </div>
  );
};

export default Character;