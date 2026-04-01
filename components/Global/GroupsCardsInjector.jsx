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

    let container = document.getElementById('groups-cards-injected');
    if (!container) {
      container = document.createElement('div');
      container.id = 'groups-cards-injected';
      container.style.marginBottom = '1rem';
      if (pageHeader && pageHeader.parentNode) {
        pageHeader.parentNode.insertBefore(container, pageHeader.nextSibling);
      } else {
        // fallback to append to a reasonable location if pageHeader isn't available yet
        const main = document.querySelector('main') || document.getElementById('root') || document.body;
        try { main.appendChild(container); } catch (e) { document.body.appendChild(container); }
      }
    }

    // Add a global CSS rule (via body class) to hide tables when the groups tab is active.
    // This is more robust than trying to locate specific containers in the DOM tree.
    const STYLE_ID = 'groups-hide-table-style';
    const BODY_CLASS = 'groups-hide-tables-active';
    let styleCreated = false;
    try {
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.innerHTML = `
          body.${BODY_CLASS} .table-container,
          body.${BODY_CLASS} table.generic-table,
          body.${BODY_CLASS} .full-width-table,
          body.${BODY_CLASS} .allow-horizontal-scroll {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
        styleCreated = true;
      }
      document.body.classList.add(BODY_CLASS);
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
      // remove the body class and cleanup the injected style if we added it
      try {
        document.body.classList.remove(BODY_CLASS);
        if (styleCreated) {
          const s = document.getElementById(STYLE_ID);
          if (s && s.parentNode) s.parentNode.removeChild(s);
        }
      } catch (e) {}
    };
  }, [location.pathname, location.search]);

  return null;
}
