import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { AlertCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();

const GET_DEBTORS = gql`
  query GetDebtors($year: Int, $overdueOnly: Boolean) {
    debtors(year: $year, overdueOnly: $overdueOnly) {
      id
      year
      month
      monthName
      balance
      isPaid
      parish {
        id
        name
      }
      collection {
        id
        name
      }
    }
  }
`;

const REGENERATE_DEBTORS = gql`
  mutation RegenerateDebtors($year: Int) {
    regenerateDebtors(year: $year) {
      success
      years
    }
  }
`;

const MONTH_NAMES = [
  'Annual', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARLY_COLLECTIONS = ['Harvest & Bazaar', 'Cathedraticum', 'Project Sunday', 'Seminary Collections'];

/* ─── helpers ─── */

function processDebtors(debtors, selectedYear) {
  const sections = [];

  // 1. Rectory — group by month (filtered by selected year)
  const rectoryMonths = {};
  for (let m = 1; m <= 12; m++) rectoryMonths[m] = [];

  for (const d of debtors) {
    if (d.collection?.name !== 'Rectory' || d.isPaid) continue;
    if (selectedYear && d.year !== selectedYear) continue;
    if (rectoryMonths[d.month]) rectoryMonths[d.month].push(d.parish.name);
  }

  const rectoryColumns = Object.entries(rectoryMonths)
    .filter(([, parishes]) => parishes.length > 0)
    .map(([month, parishes]) => ({
      label: MONTH_NAMES[month],
      parishes: [...new Set(parishes)].sort(),
    }));

  if (rectoryColumns.length > 0) {
    sections.push({
      title: 'Rectory',
      subtitle: String(selectedYear || ''),
      columns: rectoryColumns,
    });
  }

  // 2. National Collections — group by collection name (filtered by selected year)
  const nationalMap = {};
  for (const d of debtors) {
    const cName = d.collection?.name;
    if (!cName || cName === 'Rectory' || YEARLY_COLLECTIONS.includes(cName)) continue;
    if (d.isPaid) continue;
    if (selectedYear && d.year !== selectedYear) continue;
    if (!nationalMap[cName]) nationalMap[cName] = [];
    nationalMap[cName].push(d.parish.name);
  }

  const nationalColumns = Object.entries(nationalMap)
    .map(([label, parishes]) => ({
      label,
      parishes: [...new Set(parishes)].sort(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (nationalColumns.length > 0) {
    sections.push({
      title: 'National Collections',
      subtitle: String(selectedYear || ''),
      columns: nationalColumns,
    });
  }

  // 3. Yearly collections — group by year (show ALL years)
  for (const collName of YEARLY_COLLECTIONS) {
    const yearMap = {};
    for (const d of debtors) {
      if (d.collection?.name !== collName || d.isPaid) continue;
      if (!yearMap[d.year]) yearMap[d.year] = [];
      yearMap[d.year].push(d.parish.name);
    }

    const yearColumns = Object.entries(yearMap)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, parishes]) => ({
        label: year,
        parishes: [...new Set(parishes)].sort(),
      }));

    if (yearColumns.length > 0) {
      sections.push({
        title: collName,
        subtitle: '',
        columns: yearColumns,
      });
    }
  }

  return sections;
}

function TabularSection({ title, subtitle, columns }) {
  if (!columns || columns.length === 0) return null;

  const maxRows = Math.max(...columns.map(c => Math.ceil(c.parishes.length / 2)));

  return (
    <div style={{ marginBottom: '32px', border: '1px solid #F5E3D7', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', backgroundColor: '#FFF9F2', borderBottom: '1px solid #F5E3D7' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#8B4C39' }}>
          {title}
          {subtitle ? <span style={{ fontWeight: 400, color: '#A7A68B', marginLeft: '8px' }}>{subtitle}</span> : null}
        </h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
          <colgroup>
            {columns.map((_, i) => (
              <col key={`cg-${i}`} span={2} style={{ minWidth: '130px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={`th-${i}`}
                  colSpan={2}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#8B4C39',
                    borderBottom: '2px solid #F5E3D7',
                    borderRight: i < columns.length - 1 ? '1px solid #F5E3D7' : 'none',
                    backgroundColor: '#FFF9F2',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIdx) => (
              <tr key={`tr-${rowIdx}`}>
                {columns.flatMap((col, colIdx) => {
                  const mid = Math.ceil(col.parishes.length / 2);
                  const left = col.parishes[rowIdx];
                  const right = col.parishes[rowIdx + mid];
                  return [
                    <td
                      key={`l-${rowIdx}-${colIdx}`}
                      style={{
                        padding: '5px 10px',
                        borderBottom: '1px solid #F5E3D7',
                        borderRight: '1px solid #F5E3D7',
                        color: '#1a0a06',
                        whiteSpace: 'nowrap',
                        width: '50%',
                      }}
                    >
                      {left ? `${rowIdx + 1}. ${left}` : ''}
                    </td>,
                    <td
                      key={`r-${rowIdx}-${colIdx}`}
                      style={{
                        padding: '5px 10px',
                        borderBottom: '1px solid #F5E3D7',
                        borderRight: colIdx < columns.length - 1 ? '1px solid #F5E3D7' : 'none',
                        color: '#1a0a06',
                        whiteSpace: 'nowrap',
                        width: '50%',
                      }}
                    >
                      {right ? `${rowIdx + 1 + mid}. ${right}` : ''}
                    </td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── page ─── */

export function Debtors() {
  const { user } = useAuth();
  const [year, setYear] = useState(YEAR);
  const [confirming, setConfirming] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_DEBTORS, {
    variables: { overdueOnly: true },
    fetchPolicy: 'network-only',
  });

  const [regenerate, { data: regenData, error: regenError }] = useMutation(REGENERATE_DEBTORS);

  const debtors = data?.debtors || [];
  const sections = processDebtors(debtors, year);
  const totalOutstanding = debtors.filter(d => !d.isPaid).length;

  const handleRegenerate = async () => {
    await regenerate();
    await refetch();
    setConfirming(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Debtors</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {totalOutstanding} outstanding record{totalOutstanding !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8B4C39' }}>Year:</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              style={{
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #F5E3D7',
                padding: '0 12px',
                fontSize: '13px',
                color: '#1a0a06',
                backgroundColor: 'white',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {Array.from({ length: 7 }, (_, i) => YEAR - 3 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {user?.role === 'ADMIN' && (
            <>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #F5E3D7',
                    backgroundColor: 'white',
                    color: '#8B4C39',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={14} /> Regenerate
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#A7A68B' }}>Sure?</span>
                  <button
                    onClick={handleRegenerate}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#8B4C39',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0 14px',
                    }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #F5E3D7',
                      backgroundColor: 'white',
                      color: '#A7A68B',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0 14px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Regenerate feedback */}
      {regenData?.regenerateDebtors?.success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ecfdf5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#059669',
        }}>
          <CheckCircle size={16} />
          Regenerated for {regenData.regenerateDebtors.years.join(', ')}.
        </div>
      )}
      {regenError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#dc2626',
        }}>
          <AlertCircle size={16} />
          Failed: {regenError.message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>
              Couldn't load debtors
            </p>
            <p style={{ fontSize: '12px', color: '#dc2626' }}>
              {(error.message || '').includes('timeout') ? 'Server is warming up — please retry.' : (error.message || 'Failed to fetch')}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#A7A68B' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px' }}>Loading debtors...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && sections.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#059669" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>No outstanding debts</h3>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>All parishes are up to date</p>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => (
        <TabularSection
          key={i}
          title={section.title}
          subtitle={section.subtitle}
          columns={section.columns}
        />
      ))}
    </div>
  );
}
