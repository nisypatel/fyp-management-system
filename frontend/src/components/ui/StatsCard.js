// Purpose: Reusable stat card used on dashboard pages.
import React from 'react';

const StatsCard = ({ icon: Icon, variant = 'primary', value, label, onClick }) => {
  return (
    <div 
      className={`stat-card ${onClick ? 'clickable-card' : ''}`} 
      onClick={onClick}
    >
      <div className={`stat-icon ${variant}`}>
        {Icon ? <Icon /> : null}
      </div>
      <div className="stat-info">
        <h3>{value || 0}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
};

export default StatsCard;
