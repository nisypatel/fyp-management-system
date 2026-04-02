// Purpose: Reusable hook to set browser tab title per page.
import { useEffect } from 'react';

const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};

export default usePageTitle;
