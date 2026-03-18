import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import GroupsCards from '../Users/GroupsCards';

export default function GroupsCardsInjector() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    // removals when not on target
    if (location.pathname !== '/gestao-usuarios' || tab !== 'grupos') {
      const existing = document.getElementById('groups-cards-injected');
      if (existing) {
        try { existing._reactRoot && existing._reactRoot.unmount(); } catch (e) {}
        existing.remove();
      }
      return;
    }

    const pageHeader = document.querySelector('.page-header');
    if (!pageHeader) return;

    let container = document.getElementById('groups-cards-injected');
    if (!container) {
      container = document.createElement('div');
      container.id = 'groups-cards-injected';
      container.style.marginBottom = '1rem';
      pageHeader.parentNode.insertBefore(container, pageHeader.nextSibling);
    }

    // mount with createRoot (React 18)
    try {
      const root = ReactDOM.createRoot(container);
      container._reactRoot = root;
      root.render(<GroupsCards />);
    } catch (e) {
      console.error('Failed to mount GroupsCards injector:', e);
    }

    return () => {
      try { container._reactRoot && container._reactRoot.unmount(); } catch (e) {}
    };
  }, [location.pathname, location.search]);

  return null;
}
