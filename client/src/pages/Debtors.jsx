import { useQuery } from '@apollo/client/react';
import { GET_DEBTORS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const YEAR = new Date().getFullYear();

export function Debtors() {
  const { data, loading } = useQuery(GET_DEBTORS, { variables: { year: YEAR } });
  if (loading) return <div className="py-16 text-center text-sm" style={{ color: '#A7A68B' }}>Loading debtors...</div>;

  const debtors = data?.debtors || [];
  const unpaid = debtors.filter(d => !d.isPaid);
  const totalOutstanding = unpaid.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debtors</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A7A68B' }}>
            {unpaid.length} outstanding record{unpaid.length !== 1 ? 's' : ''} for {YEAR}
          </p>
        </div>
        {unpaid.length > 0 && (
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#A7A68B' }}>Total Outstanding</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: '#D3542A' }}>{formatCurrency(totalOutstanding)}</p>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {debtors.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium" style={{ color: '#8B4C39' }}>No debtor records for {YEAR}</p>
              <p className="text-xs mt-1" style={{ color: '#A7A68B' }}>All parishes are up to date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                    {['Parish', 'Period', 'Expected', 'Actual', 'Balance', 'Status'].map(h => (
                      <th key={h} className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wide"
                          style={{ color: '#A7A68B' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {debtors.map((d, idx) => (
                    <tr key={d.id} className="transition-colors hover:bg-amber-50/30"
                        style={{ borderBottom: idx < debtors.length - 1 ? '1px solid #F5E3D7' : 'none' }}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                               style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                            {d.parish.name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{d.parish.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-foreground">{d.monthName} {d.year}</td>
                      <td className="py-4 px-6 text-sm text-foreground">{formatCurrency(d.expectedAmount)}</td>
                      <td className="py-4 px-6 text-sm text-foreground">{formatCurrency(d.actualAmount)}</td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold" style={{ color: d.balance > 0 ? '#D3542A' : '#A7A68B' }}>
                          {formatCurrency(d.balance)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={d.isPaid
                                ? { backgroundColor: '#dcfce7', color: '#166534' }
                                : { backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                          {d.isPaid ? 'Paid' : 'Outstanding'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
