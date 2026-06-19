import { useQuery } from '@apollo/client/react';
import { GET_DEBTORS } from '@/graphql/queries';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

export function Debtors() {
  const { data, loading } = useQuery(GET_DEBTORS, { variables: { year: YEAR } });
  if (loading) return <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading debtors...</div>;

  const debtors = data?.debtors || [];
  const unpaid = debtors.filter(d => !d.isPaid);
  const totalOutstanding = unpaid.reduce((sum, d) => sum + d.balance, 0);

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
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Outstanding
            </p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#D3542A', lineHeight: 1.1, marginTop: '4px' }}>
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        )}
      </div>

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
