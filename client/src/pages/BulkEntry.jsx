import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import { Save, Loader2, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GET_PARISHES = gql`
  query GetParishesForEntry {
    parishes {
      id
      name
      createdYear
    }
    remittanceSources {
      id
      name
      category
      isActive
    }
  }
`;

const BULK_RECORD = gql`
  mutation BulkRecordRemittances($input: BulkRecordRemittancesInput!) {
    bulkRecordRemittances(input: $input) {
      success
      createdCount
      updatedCount
      collectionName
      message
    }
  }
`;

const CATEGORIES = [
  'Rectory',
  'National Collections',
  'Harvest & Bazaar',
  'Cathedraticum',
  'Project Sunday',
  'Seminary Collections',
];

const MONTHS = [
  { value: 0, label: 'Annual' },
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export function BulkEntry() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCollectionName, setSelectedCollectionName] = useState('');
  const [amounts, setAmounts] = useState({});
  const [result, setResult] = useState(null);

  const { data, loading: loadingParishes } = useQuery(GET_PARISHES);
  const [submitBulk, { loading: submitting }] = useMutation(BULK_RECORD, {
    onCompleted: (data) => setResult(data.bulkRecordRemittances),
  });

  const parishes = data?.parishes || [];
  const sources = data?.remittanceSources || [];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  // Collections belonging to the currently selected category (e.g. every
  // individual National Collections item: Catechetical Week, Divine Mercy, etc.)
  const collectionsInCategory = sources.filter(s => s.isActive && s.category === selectedCategory);
  const needsCollectionPicker = collectionsInCategory.length > 1;

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedCollectionName('');
    setResult(null);
  };

  const handleAmountChange = (parishId, value) => {
    setAmounts(prev => ({ ...prev, [parishId]: value }));
    setResult(null);
  };

  const handleSubmit = async () => {
    const entries = Object.entries(amounts)
      .filter(([, amount]) => parseFloat(amount) > 0)
      .map(([parishId, amount]) => ({ parishId, amount: parseFloat(amount) }));

    if (entries.length === 0) {
      alert('Please enter at least one amount');
      return;
    }

    if (needsCollectionPicker && !selectedCollectionName) {
      alert(`Please choose which ${selectedCategory} collection this is for`);
      return;
    }

    await submitBulk({
      variables: {
        input: {
          year: parseInt(selectedYear),
          month: parseInt(selectedMonth),
          collectionCategory: selectedCategory,
          collectionName: needsCollectionPicker ? selectedCollectionName : undefined,
          entries,
        },
      },
    });

    setAmounts({});
  };

  const inputStyle = {
    width: '100%',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #F5E3D7',
    fontSize: '13px',
    textAlign: 'right',
    outline: 'none',
  };

  const selectStyle = {
    height: '38px',
    borderRadius: '8px',
    border: '1px solid #F5E3D7',
    padding: '0 12px',
    fontSize: '13px',
    backgroundColor: 'white',
    outline: 'none',
    color: '#1a0a06',
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a0a06', marginBottom: '4px' }}>
          Bulk Entry Sheet
        </h1>
        <p style={{ fontSize: '13px', color: '#A7A68B' }}>
          Enter amounts for all parishes at once
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', backgroundColor: 'white', padding: '18px 20px', borderRadius: '12px', border: '1px solid #F5E3D7' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' }}>Collection</label>
          <select value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} style={selectStyle}>
            <option value="">Select collection</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {needsCollectionPicker && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' }}>Which {selectedCategory}?</label>
            <select value={selectedCollectionName} onChange={e => { setSelectedCollectionName(e.target.value); setResult(null); }} style={selectStyle}>
              <option value="">Select specific collection</option>
              {collectionsInCategory.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#A7A68B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' }}>Period</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Sheet */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #F5E3D7', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5E3D7', backgroundColor: '#FFF9F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#8B4C39', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Parish Amounts
          </p>
          <p style={{ fontSize: '12px', color: '#A7A68B' }}>
            {parishes.length} parishes
          </p>
        </div>

        {loadingParishes ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#A7A68B' }}>Loading parishes...</div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: '#FFF9F2', borderBottom: '2px solid #F5E3D7' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', width: '60px' }}>S/N</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase' }}>Parish</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: '#A7A68B', textTransform: 'uppercase', width: '180px' }}>Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                {parishes.map((parish, idx) => (
                  <tr key={parish.id} style={{ borderBottom: '1px solid #F5E3D7' }}>
                    <td style={{ padding: '8px 20px', fontSize: '13px', color: '#A7A68B' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, color: '#1a0a06' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={14} style={{ color: '#C89B6E' }} />
                        {parish.name}
                      </div>
                    </td>
                    <td style={{ padding: '8px 20px' }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={amounts[parish.id] || ''}
                        onChange={e => handleAmountChange(parish.id, e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={!selectedCategory || (needsCollectionPicker && !selectedCollectionName) || submitting || parishes.length === 0}
          style={{ backgroundColor: '#D3542A', color: 'white' }}
        >
          {submitting ? (
            <>
              <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <>
              <Save style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Save All Entries
            </>
          )}
        </Button>

        {result?.success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px' }}>
            <CheckCircle size={16} />
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
