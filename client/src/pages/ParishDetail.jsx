import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { ArrowLeft, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORIES = [
  'Rectory',
  'National Collections',
  'Harvest & Bazaar',
  'Cathedraticum',
  'Project Sunday',
  'Seminary Collections',
];

const GET_PARISH_DETAIL = gql`
  query ParishDetail($id: ID!) {
    parish(id: $id) { id name diocese location }
    remittanceRecords(parishId: $id) {
      id month monthName year totalAmount
      lineItems { amount source { id name category } }
    }
    remittanceSources { id name category isActive }
  }
`;

const selectStyle = {
  height: '36px', borderRadius: '8px', border: '1px solid #F5E3D7',
  padding: '0 12px', fontSize: '13px', backgroundColor: 'white',
  outline: 'none', color: '#1a0a06', cursor: 'pointer', fontWeight: 500
};

export function ParishDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const yearFromUrl = parseInt(searchParams.get('year')) || null;
  const [category, setCategory] = useState('Rectory');
  const [nationalCollectionId, setNationalCollectionId] = useState('');
  const [expandedYears, setExpandedYears] = useState(() => yearFromUrl ? new Set([yearFromUrl]) : new Set());

  const { data, loading } = useQuery(GET_PARISH_DETAIL, { variables: { id } });

  useEffect(() => {
    if (yearFromUrl && !loading) setExpandedYears(prev => new Set(prev).add(yearFromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const parish = data?.parish;
  const records = data?.remittanceRecords || [];
  const sources = data?.remittanceSources || [];

  const nationalSources = sources.filter(s => s.isActive && s.category === 'National Collections');
  const isNational = category === 'National Collections';
  const isMonthly = category === 'Rectory';

  const collectionName = isNational
    ? nationalSources.find(s => s.id === nationalCollectionId)?.name
    : category;

  // All-time summary, independent of the collection filter below
  const allTimeTotal = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const yearsOnRecord = [...new Set(records.map(r => r.year))].length;
  const currentYear = new Date().getFullYear();
  const thisYearTotal = records.filter(r => r.year === currentYear).reduce((sum, r) => sum + r.totalAmount, 0);

  // Years present for the selected collection specifically (so a year with only
  // other collections recorded doesn't show up as an empty bar here)
  const yearsForCollection = collectionName
    ? [...new Set(
        records
          .filter(r => r.lineItems?.some(li => li.source?.name?.toLowerCase().trim() === collectionName.toLowerCase().trim()))
          .map(r => r.year)
      )].sort((a, b) => b - a)
    : [];

  const getAmount = (year, month, name) => {
    const record = records.find(r => r.year === year && r.month === month);
    return record?.lineItems?.find(li => li.source?.name?.toLowerCase().trim() === name.toLowerCase().trim())?.amount || 0;
  };

  const yearTotalFor = (year) => {
    if (isMonthly) {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += getAmount(year, m, collectionName);
      return sum;
    }
    return getAmount(year, 0, collectionName);
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '13px', fontWeight: 600, color: '#8B4C39',
        padding: 0, width: 'fit-content'
      }}>
        <ArrowLeft size={16} strokeWidth={2.5} />
        Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          backgroundColor: '#F5E3D7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0
        }}>
          <Building2 size={22} color="#8B4C39" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>
            {loading ? 'Loading...' : parish?.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#A7A68B' }}>
            {parish?.diocese || 'Diocese not set'}{parish?.location ? ` · ${parish.location}` : ''}
          </p>
        </div>
      </div>

      {/* Summary cards — all-time, independent of collection filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Collected (All Time)', value: formatCurrency(allTimeTotal), bg: '#D3542A' },
          { label: `This Year (${currentYear})`, value: formatCurrency(thisYearTotal), bg: '#C89B6E' },
          { label: 'Years on Record', value: String(yearsOnRecord), bg: '#A7A68B' },
        ].map(({ label, value, bg }) => (
          <div key={label} style={{
            backgroundColor: 'white', borderRadius: '12px',
            border: '1px solid #F5E3D7', borderLeft: `4px solid ${bg}`,
            padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a0a06' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Collection breakdown, by year */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #F5E3D7', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F5E3D7', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Payment History
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setNationalCollectionId(''); setExpandedYears(new Set()); }}
              style={selectStyle}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {isNational && (
              <select
                value={nationalCollectionId}
                onChange={e => { setNationalCollectionId(e.target.value); setExpandedYears(new Set()); }}
                style={selectStyle}
              >
                <option value="">Select specific collection</option>
                {nationalSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>Loading...</div>
        ) : isNational && !nationalCollectionId ? (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            Pick which National Collection to view.
          </div>
        ) : yearsForCollection.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: '#A7A68B' }}>
            No {collectionName} payments recorded for this parish yet.
          </div>
        ) : (
          <div>
            {yearsForCollection.map((year, idx) => {
              const total = yearTotalFor(year);
              const isOpen = expandedYears.has(year);

              return (
                <div key={year} style={{ borderBottom: idx < yearsForCollection.length - 1 ? '1px solid #F5E3D7' : 'none' }}>
                  <button
                    onClick={() => isMonthly && toggleYear(year)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 24px', background: 'none', border: 'none',
                      cursor: isMonthly ? 'pointer' : 'default', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isMonthly ? (
                        isOpen ? <ChevronDown size={16} color="#8B4C39" /> : <ChevronRight size={16} color="#8B4C39" />
                      ) : (
                        <span style={{ width: '16px' }} />
                      )}
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a0a06' }}>{year}</span>
                      {!isMonthly && (
                        <span style={{ fontSize: '11px', color: '#A7A68B', fontWeight: 500 }}>Recorded annually</span>
                      )}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: total > 0 ? '#D3542A' : '#A7A68B' }}>
                      {formatCurrency(total)}
                    </span>
                  </button>

                  {isMonthly && isOpen && (
                    <div style={{ padding: '0 24px 16px 50px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {MONTHS.map((m, i) => {
                            const amount = getAmount(year, i + 1, collectionName);
                            return (
                              <tr key={m} style={{ borderBottom: i < 11 ? '1px solid #F5E3D7' : 'none' }}>
                                <td style={{ padding: '8px 0', fontSize: '13px', color: '#1a0a06', width: '80px' }}>{m}</td>
                                <td style={{ padding: '8px 0', fontSize: '13px', textAlign: 'right', fontWeight: amount ? 600 : 400, color: amount ? '#1a0a06' : '#E1D5CD' }}>
                                  {amount ? formatCurrency(amount) : 'Not recorded'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
