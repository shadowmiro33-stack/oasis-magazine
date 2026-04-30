import React from 'react';

export default function CollapsibleCard({
  title,
  icon,
  open,
  onToggle,
  actions,
  children,
  style,
  titleStyle,
  bodyStyle
}) {
  return (
    <div className="card" style={style}>
      <div
        className="card-title"
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, ...titleStyle }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          {icon && <i className={icon}></i>}
          <span>{title}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {actions}
          <button
            type="button"
            className="btn btn-outline"
            onClick={onToggle}
            style={{ padding:'5px 12px', fontSize:11, fontWeight:900, display:'inline-flex', alignItems:'center', gap:6 }}
          >
            <i className={`fas ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            {open ? '닫기' : '열기'}
          </button>
        </div>
      </div>
      {open && <div style={bodyStyle}>{children}</div>}
    </div>
  );
}
