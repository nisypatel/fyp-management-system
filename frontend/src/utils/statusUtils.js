// Purpose: Keep project/admin/supervisor status badge mapping in one place.
export const getStatusBadgeClass = (status) => {
  const statusMap = {
    proposal: 'badge-warning',
    pending: 'badge-warning',
    approved: 'badge-success',
    accepted: 'badge-success',
    'in-progress': 'badge-primary',
    completed: 'badge-success',
    rejected: 'badge-danger'
  };

  return statusMap[status] || 'badge-secondary';
};
