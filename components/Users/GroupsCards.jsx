import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/GenericMobileCard.css';
import '../../styles/UnitsCards.css';

export default function GroupsCards({ initial = [] }) {
  const [groups, setGroups] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial && initial.length) return; // já foi carregado pelo pai

    // Dedupe requests: if other component already fetched groups, reuse cache/promise
    if (GroupsCards._cache && GroupsCards._cache.length) {
      setGroups(GroupsCards._cache);
      return;
    }

    let mounted = true;
    setLoading(true);

    if (GroupsCards._promise) {
      // there's an ongoing request — subscribe to it
      GroupsCards._promise
        .then((data) => { if (!mounted) return; setGroups(data); })
        .catch(() => { if (!mounted) return; setGroups([]); })
        .finally(() => mounted && setLoading(false));
      return () => { mounted = false; };
    }

    GroupsCards._promise = api.get('/access/groups/')
      .then((res) => {
        const data = res.data.results || res.data || [];
        GroupsCards._cache = data;
        return data;
      })
      .catch(() => {
        GroupsCards._cache = [];
        return [];
      })
      .finally(() => { GroupsCards._promise = null; });

    GroupsCards._promise
      .then((data) => { if (!mounted) return; setGroups(data); })
      .catch(() => { if (!mounted) return; setGroups([]); })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [initial]);

  if (loading) return <div>Carregando grupos...</div>;

  return (
    <div className="units-cards-grid">
      {groups.map((g) => {
        const title = g.nome || g.name || g.label || 'Sem nome';
        const desc = g.descricao || g.description || g.desc || '';
        const usersCount = g.users_count || g.usersCount || g.count || 0;
        return (
          <div key={g.id ?? title} className={`unit-card ${g.is_ativo === false ? 'unit-card--inactive' : ''}`}>
            <div className="unit-card__header">
              <div className="unit-card__header-left">
                <span className="unit-card__title">{title}</span>
              </div>
              <div className="unit-card__header-right">
                <span className={`unit-card__status-badge ${g.is_ativo === false ? 'unit-card__status-badge--inactive' : 'unit-card__status-badge--active'}`}>
                  {g.is_ativo === false ? 'Inativo' : 'Ativo'}
                </span>
              </div>
            </div>

            <div className="unit-card__summary">
              <div className="unit-card__info">
                <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span className="unit-card__info-label">Membros</span>
                  <span className="unit-card__info-value" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{usersCount}</span>
                </div>
                <div style={{ flex: 1 }} />
              </div>
              <div style={{ paddingTop: 8 }}>
                {desc ? (
                  <div style={{ color: '#334155' }}>{desc}</div>
                ) : (
                  <div style={{ color: '#94a3b8' }}>Sem descrição</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
