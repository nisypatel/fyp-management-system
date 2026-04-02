// Purpose: Shared dashboard top section with title, subtitle, and optional action area.
import React from 'react';

const DashboardHeader = ({ title, subtitle, children }) => {
  return (
    <div className="dashboard-header">
      <div>
        <h1 className="dashboard-title">{title}</h1>
        {subtitle ? <p className="dashboard-subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
};

export default DashboardHeader;
