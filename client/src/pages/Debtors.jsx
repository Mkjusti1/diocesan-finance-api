import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_DEBTORS, REGENERATE_DEBTORS } from '@/graphql/queries';
import { useAuth } from '@/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────

// A, B, C ... Z, AA, AB ... (in case a year ever has 27+ sections)
function letterFor(index) {
  let n = index;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// Group flat, unpaid debtor rows into: per year -> Rectory (by month) + National Collection (by collection)
// month 0 = National Collection / annual rows, months 1-12 = Rectory monthly rows.
function buildDebtorGroups(debtors) {
  const byYear = new Map();

  for (const d of debtors) {
    if (d.isPaid || !d.parish) continue;
    if (!byYear.has(d.year)) byYear.set(d.year, { rectory: new Map(), national: new Map() });
    const bucket = byYear.get(d.year);

    if (d.month === 0) {
      const key = d.collection?.id ?? d.collection?.name ?? 'uncategorized';
      if (!bucket.national.has(key)) {
        bucket.national.set(key, {
          id: d.collection?.id ?? key,
          name: d.collection?.name || 'Uncategorized',
          parishes: new Map(),
        });
      }
      bucket.national.get(key).parishes.set(d.parish.id, d.parish.name);
    } else {
      if (!bucket.rectory.has(d.month)) {
        bucket.rectory.set(d.month, { month: d.month, monthName: d.monthName, parishes: new Map() });
      }
      bucket.rectory.get(d.month).parishes.set(d.parish.id, d.parish.name);
    }
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);

  return years.map(year => {
    const bucket = byYear.get(year);

    const rectory = [...bucket.rectory.values()]
      .sort((a, b) => a.month - b.month)
      .map(g => ({ ...g, parishes: [...g.parishes.values()].sort((a, b) => a.localeCompare(b)) }));

    const national = [...bucket.national.values()]
      .sort((a, b) => Number(a.id) - Number(b.id) || a.name.localeCompare(b.name))
      .map(g => ({ ...g, parishes: [...g.parishes.values()].sort((a, b) => a.localeCompare(b)) }));

    return { year, rectory, national };
  });
}

function sectionText(letter, title, parishes) {
  const lines = [`${letter}. ${title}`, ''];
  parishes.forEach((name, i) => lines.push(`${i + 1}. ${name}`));
  return lines.join('\n');
}

function formatSectionTitle(title, year) {
  const normalized = title?.trim() || '';
  return normalized.includes(String(year)) ? normalized : `${normalized} ${year}`;
}

// ─── Small pieces ─────────────────────────────────────────────────────────

function CopyButton({ text, sectionKey, copiedKey, setCopiedKey }) {
  const copied = copiedKey === sectionKey;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without clipboard API access
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(sectionKey);
    setTimeout(() => setCopiedKey(prev => (prev === sectionKey ? null : prev)), 1800);
  };

  return (
    <button onClick={handleCopy} style={{
      padding: '6px 12px', borderRadius: '7px',
      border: `1px solid ${copied ? '#86efac' : '#F5E3D7'}`,
      backgroundColor: copied ? '#f0fdf4' : 'white',
      color: copied ? '#166534' : '#8B4C39',
      fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 0.15s'
    }}>
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function SectionCard({ sectionKey, letter, title, parishes, copiedKey, setCopiedKey }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '10px', border: '1px solid #F5E3D7',
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        padding: '12px 16px', backgroundColor: '#FFF9F2', borderBottom: '1px solid #F5E3D7'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a0a06' }}>
          {letter}. {title}
          <span style={{ fontWeight: 600, color: '#A7A68B', marginLeft: '8px' }}>
            ({parishes.length})
          </span>
        </span>
      </div>
      <ol style={{ margin: 0, padding: '10px 16px 14px 34px' }}>
        {parishes.map(name => (
          <li key={name} style={{ fontSize: '13px', color: '#3d1e12', padding: '3px 0' }}>
            {name}
          </li>
        ))}
      </ol>
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '10px 16px', borderTop: '1px solid #F5E3D7'
      }}>
        <CopyButton
          text={sectionText(letter, title, parishes)}
          sectionKey={sectionKey}
          copiedKey={copiedKey}
          setCopiedKey={setCopiedKey}
        />
      </div>
    </div>
  );
}

function GroupHeading({ children }) {
  return (
    <h3 style={{
      fontSize: '12px', fontWeight: 700, color: '#8B4C39',
      textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 2px'
    }}>
      {children}
    </h3>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export function Debtors() {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // No `year` variable => every year with outstanding debtors comes back,
  // and the page groups/updates itself automatically as new years appear.
  const { data, loading, error, refetch } = useQuery(GET_DEBTORS, {
    variables: { year: null, overdueOnly: true },
    errorPolicy: 'all',
  });
  const [regenerateDebtors, { loading: regenerating, data: regenData, error: regenError }] = useMutation(REGENERATE_DEBTORS);

  const debtors = useMemo(() => data?.debtors || [], [data]);
  const yearGroups = useMemo(() => buildDebtorGroups(debtors), [debtors]);
  const totalOutstanding = debtors.filter(d => !d.isPaid).length;

  const handleRegenerate = async () => {
    try {
      await regenerateDebtors({ variables: { year: null } });
      await refetch();
      setConfirming(false);
    } catch {
      // error surfaced via regenError below
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading debtors...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Debtors</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {totalOutstanding} outstanding record{totalOutstanding !== 1 ? 's' : ''} across {yearGroups.length} year{yearGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C' }}>Couldn't load debtors</p>
            <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>{error.message}</p>
          </div>
          <button onClick={() => refetch()} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #FCA5A5',
            backgroundColor: 'white', color: '#B91C1C', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
          }}>Retry</button>
        </div>
      )}

      {/* Admin: regenerate debtors for all years */}
      {user?.role === 'ADMIN' && (
        <div style={{
          backgroundColor: '#FFF9F2', border: '1px solid #F5E3D7', borderRadius: '10px',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'
        }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39' }}>Regenerate debtors for all years</p>
            <p style={{ fontSize: '12px', color: '#A7A68B', marginTop: '2px' }}>
              Recalculates debtor records for every year with uploaded data, including National Collections. Safe to run anytime — it overwrites existing debtor rows rather than duplicating them.
            </p>
            {regenData?.regenerateDebtors?.success && (
              <p style={{ fontSize: '12px', color: '#166534', marginTop: '6px', fontWeight: 600 }}>
                Done — regenerated for {regenData.regenerateDebtors.years.join(', ')}.
              </p>
            )}
            {regenError && (
              <p style={{ fontSize: '12px', color: '#B91C1C', marginTop: '6px', fontWeight: 600 }}>
                Failed: {regenError.message}
              </p>
            )}
          </div>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} disabled={regenerating} style={{
              padding: '10px 16px', borderRadius: '8px', border: '1px solid #F5E3D7',
              backgroundColor: 'white', color: '#8B4C39', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              Regenerate Debtors
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setConfirming(false)} disabled={regenerating} style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid #F5E3D7',
                backgroundColor: 'white', color: '#A7A68B', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                Cancel
              </button>
              <button onClick={handleRegenerate} disabled={regenerating} style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid #D3542A',
                backgroundColor: '#D3542A', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: regenerating ? 'default' : 'pointer', whiteSpace: 'nowrap',
                opacity: regenerating ? 0.7 : 1
              }}>
                {regenerating ? 'Regenerating…' : 'Confirm — run now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped debtor sections */}
      {yearGroups.length === 0 ? (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7',
          padding: '80px 40px', textAlign: 'center'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <span style={{ fontSize: '22px' }}>✓</span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a0a06', marginBottom: '4px' }}>
            No outstanding debtor records
          </p>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>All parishes are up to date</p>
        </div>
      ) : (
        yearGroups.map(({ year, rectory, national }) => (
          <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a0a06', paddingTop: '4px' }}>
              Debtors {year}
            </h2>

            {rectory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <GroupHeading>Debtors: Rectory</GroupHeading>
                {rectory.map((g, idx) => (
                  <SectionCard
                    key={`${year}-rectory-${g.month}`}
                    sectionKey={`${year}-rectory-${g.month}`}
                    letter={letterFor(idx)}
                    title={`${g.monthName?.toUpperCase()} ${year}`}
                    parishes={g.parishes}
                    copiedKey={copiedKey}
                    setCopiedKey={setCopiedKey}
                  />
                ))}
              </div>
            )}

            {national.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <GroupHeading>Debtors: National Collection</GroupHeading>
                {national.map((g, idx) => (
                  <SectionCard
                    key={`${year}-national-${g.id}`}
                    sectionKey={`${year}-national-${g.id}`}
                    letter={letterFor(idx)}
                    title={formatSectionTitle(g.name?.toUpperCase(), year)}
                    parishes={g.parishes}
                    copiedKey={copiedKey}
                    setCopiedKey={setCopiedKey}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
