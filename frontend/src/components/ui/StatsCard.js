// Purpose: Reusable stat card used on dashboard pages.
import React from 'react';

const StatsCard = ({ icon: Icon, variant = 'primary', value, label }) => {
  return (
    <div className="stat-card">
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
