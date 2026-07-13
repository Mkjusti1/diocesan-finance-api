import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_DEBTORS, REGENERATE_DEBTORS } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();

export function Debtors() {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const { data, loading, error, refetch } = useQuery(GET_DEBTORS, { variables: { year: YEAR, overdueOnly: true }, errorPolicy: 'all' });
  const [regenerateDebtors, { loading: regenerating, data: regenData, error: regenError }] = useMutation(REGENERATE_DEBTORS);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading debtors...</div>;

  const debtors = data?.debtors || [];
  const unpaid = debtors.filter(d => !d.isPaid);

  const handleRegenerate = async () => {
    try {
      await regenerateDebtors({ variables: { year: null } });
      await refetch();
      setConfirming(false);
    } catch (e) {
      // error surfaced via regenError below
    }
  };

  const downloadCSV = () => {
    const headers = ['Parish', 'Period', 'Expected', 'Actual', 'Balance', 'Status'];
    const rows = debtors.map(d => [
      d.parish.name,
      `${d.monthName} ${d.year}`,
      d.expectedAmount,
      d.actualAmount,
      d.balance,
      d.isPaid ? 'Paid' : 'Outstanding'
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debtors-${YEAR}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>Debtors</h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {unpaid.length} outstanding record{unpaid.length !== 1 ? 's' : ''} for {YEAR}
          </p>
        </div>
        {unpaid.length > 0 && (
          <button onClick={downloadCSV} style={{
            padding: '10px 16px', borderRadius: '8px', border: '1px solid #F5E3D7',
            backgroundColor: 'white', color: '#8B4C39', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            Download CSV
          </button>
        )}
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

      {/* Table */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {debtors.length === 0 ? (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '22px' }}>✓</span>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a0a06', marginBottom: '4px' }}>
              No debtor records for {YEAR}
            </p>
            <p style={{ fontSize: '13px', color: '#A7A68B' }}>All parishes are up to date</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  {['Parish', 'Period', 'Expected', 'Actual', 'Balance', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 20px',
                      fontSize: '11px', fontWeight: 700, color: '#A7A68B',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debtors.map((d, idx) => (
                  <tr key={d.id} style={{
                    borderBottom: idx < debtors.length - 1 ? '1px solid #F5E3D7' : 'none',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF9F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#8B4C39'
                        }}>
                          {d.parish.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a0a06' }}>{d.parish.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#3d1e12', whiteSpace: 'nowrap' }}>
                      {d.monthName} {d.year}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#3d1e12', whiteSpace: 'nowrap' }}>
                      {formatCurrency(d.expectedAmount)}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#3d1e12', whiteSpace: 'nowrap' }}>
                      {formatCurrency(d.actualAmount)}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: d.balance > 0 ? '#D3542A' : '#A7A68B' }}>
                        {formatCurrency(d.balance)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '4px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700,
                        backgroundColor: d.isPaid ? '#dcfce7' : '#F5E3D7',
                        color: d.isPaid ? '#166534' : '#8B4C39'
                      }}>
                        {d.isPaid ? 'Paid' : 'Outstanding'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}