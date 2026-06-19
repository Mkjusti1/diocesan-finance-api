import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Filter, ChevronDown } from 'lucide-react';
import { GET_REMITTANCE_RECORDS, GET_PARISHES, GET_REMITTANCE_SOURCES, CREATE_REMITTANCE } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const YEAR = new Date().getFullYear();
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

function Select({ className, ...props }) {
  return (
    <select
      className={`h-10 rounded-lg border px-3 text-sm bg-white focus:outline-none focus:ring-2 ${className}`}
      style={{ borderColor: '#F5E3D7', color: '#3d1e12' }}
      {...props}
    />
  );
}

export function Remittances() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filters, setFilters] = useState({ year: YEAR, month: '', parishId: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ parishId: '', year: YEAR, month: '', lineItems: {} });

  const { data, loading } = useQuery(GET_REMITTANCE_RECORDS, {
    variables: { year: filters.year, month: filters.month || undefined, parishId: filters.parishId || undefined }
  });
  const { data: parishData } = useQuery(GET_PARISHES);
  const { data: sourceData } = useQuery(GET_REMITTANCE_SOURCES);
  const [createRemittance] = useMutation(CREATE_REMITTANCE, { refetchQueries: [GET_REMITTANCE_RECORDS] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lineItems = Object.entries(form.lineItems)
      .filter(([, a]) => parseFloat(a) > 0)
      .map(([remittanceSourceId, amount]) => ({ remittanceSourceId, amount: parseFloat(amount) }));
    if (!lineItems.length) return alert('Enter at least one amount');
    await createRemittance({ variables: { input: { parishId: form.parishId, year: parseInt(form.year), month: parseInt(form.month), lineItems } } });
    setModal(false);
    setForm({ parishId: '', year: YEAR, month: '', lineItems: {} });
  };

  const records = data?.remittanceRecords || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Remittances</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A7A68B' }}>
            {records.length} record{records.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModal(true)}
            className="h-10 px-4 text-sm font-medium text-white rounded-lg flex items-center gap-2"
            style={{ backgroundColor: '#D3542A' }}>
            <Plus className="h-4 w-4" /> Record Remittance
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl border bg-white" style={{ borderColor: '#F5E3D7' }}>
        <Filter className="h-4 w-4 flex-shrink-0" style={{ color: '#A7A68B' }} />
        <Input
          type="number" placeholder="Year" value={filters.year}
          onChange={e => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
          className="w-24 h-10 rounded-lg text-sm"
          style={{ borderColor: '#F5E3D7' }}
        />
        <Select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value ? parseInt(e.target.value) : '' }))}>
          <option value="">All Months</option>
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </Select>
        <Select value={filters.parishId} onChange={e => setFilters(f => ({ ...f, parishId: e.target.value }))}>
          <option value="">All Parishes</option>
          {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: '#A7A68B' }}>Loading records...</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium" style={{ color: '#8B4C39' }}>No records found</p>
              <p className="text-xs mt-1" style={{ color: '#A7A68B' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '1px solid #F5E3D7' }}>
                    {['Parish', 'Period', 'Collections', 'Total', 'Uploaded By'].map(h => (
                      <th key={h} className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wide" style={{ color: '#A7A68B' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: '#F5E3D7' }}>
                  {records.map((r, idx) => (
                    <tr key={r.id} className="transition-colors hover:bg-amber-50/30"
                        style={{ borderBottomColor: '#F5E3D7' }}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                               style={{ backgroundColor: '#F5E3D7', color: '#8B4C39' }}>
                            {r.parish.name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{r.parish.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-foreground">{r.monthName} {r.year}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {r.lineItems.map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {item.source.name}: {formatCurrency(item.amount)}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold" style={{ color: '#D3542A' }}>
                          {formatCurrency(r.totalAmount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm" style={{ color: '#A7A68B' }}>
                          {r.uploadedBy?.name || '—'}
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b" style={{ borderColor: '#F5E3D7' }}>
              <h2 className="text-base font-bold" style={{ color: '#8B4C39' }}>Record Remittance</h2>
              <p className="text-xs mt-0.5" style={{ color: '#A7A68B' }}>Enter collection amounts for a parish</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Parish *</label>
                  <Select className="w-full" value={form.parishId} onChange={e => setForm(f => ({ ...f, parishId: e.target.value }))} required>
                    <option value="">Select parish</option>
                    {parishData?.parishes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Year *</label>
                  <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required
                    className="h-10 rounded-lg" style={{ borderColor: '#F5E3D7' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#8B4C39' }}>Month *</label>
                <Select className="w-full" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} required>
                  <option value="">Select month</option>
                  {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-3" style={{ color: '#8B4C39' }}>
                  Amounts by Collection
                </label>
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#F5E3D7' }}>
                  {sourceData?.remittanceSources.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-4 px-4 py-3"
                         style={{ backgroundColor: idx % 2 === 0 ? '#FFF9F2' : 'white', borderBottom: idx < sourceData.remittanceSources.length - 1 ? '1px solid #F5E3D7' : 'none' }}>
                      <span className="text-sm font-medium flex-1" style={{ color: '#8B4C39' }}>{s.name}</span>
                      <Input type="number" min="0" step="0.01" placeholder="0"
                        value={form.lineItems[s.id] || ''}
                        onChange={e => setForm(f => ({ ...f, lineItems: { ...f.lineItems, [s.id]: e.target.value } }))}
                        className="w-36 h-9 text-right text-sm rounded-lg" style={{ borderColor: '#F5E3D7' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-11 font-semibold text-white rounded-lg"
                  style={{ backgroundColor: '#D3542A' }}>Save Record</Button>
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-lg"
                  style={{ borderColor: '#F5E3D7', color: '#8B4C39' }}
                  onClick={() => setModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
