const PROJECT_SYNC_KEY = 'project-sync';

export const triggerProjectSync = (projectId = null) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    projectId: projectId || null,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(PROJECT_SYNC_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore storage issues; the caller already updates its own local state.
  }
};

export const subscribeToProjectSync = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key !== PROJECT_SYNC_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue);
      handler(payload.projectId || null);
    } catch (error) {
      handler(null);
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
  };
};