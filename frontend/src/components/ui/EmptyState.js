// Purpose: Reusable empty state block for lists/tables with no data.
import React from 'react';

const EmptyState = ({ icon: Icon, message }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {Icon ? <Icon size={48} /> : null}
      </div>
      <p>{message}</p>
    </div>
  );
};

export default EmptyState;
