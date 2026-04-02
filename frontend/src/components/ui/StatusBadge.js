// Purpose: Reusable status badge with centralized style mapping.
import React from 'react';
import { getStatusBadgeClass } from '../../utils/statusUtils';

const StatusBadge = ({ status, prefix }) => {
  if (!status) return null;

  return (
    <span className={`badge ${getStatusBadgeClass(status)}`}>
      {prefix ? `${prefix}: ` : ''}
      {status}
    </span>
  );
};

export default StatusBadge;
