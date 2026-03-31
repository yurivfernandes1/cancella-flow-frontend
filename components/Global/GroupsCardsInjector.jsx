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

    // Hide any table(s) in the page content when showing groups cards
    const hiddenTables = [];
    try {
      const tables = pageHeader.parentNode.querySelectorAll('.table-container, .generic-table');
      tables.forEach((t) => {
        // store previous inline display to restore later
        const prev = t.style.display || '';
        t.setAttribute('data-prev-display', prev);
        t.setAttribute('data-hidden-by-groups-injector', '1');
        t.style.display = 'none';
        hiddenTables.push(t);
      });
    } catch (e) {
      // ignore DOM errors
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
      // restore any hidden tables
      try {
        hiddenTables.forEach((t) => {
          const prev = t.getAttribute('data-prev-display');
          if (prev) {
            t.style.display = prev;
          } else {
            t.style.removeProperty('display');
          }
          t.removeAttribute('data-prev-display');
          t.removeAttribute('data-hidden-by-groups-injector');
        });
      } catch (e) {}
    };
  }, [location.pathname, location.search]);

  return null;
}
