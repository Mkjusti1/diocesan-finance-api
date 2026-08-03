import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

const GET_PARISHES = gql`
  query GetParishes {
    parishes {
      id
      name
    }
  }
`;

const DELETE_RECORDS = gql`
  mutation DeleteRemittanceRecordsByParishAndYear($parishId: ID!, $year: Int!) {
    deleteRemittanceRecordsByParishAndYear(parishId: $parishId, year: $year) {
      success
      deletedCount
      message
    }
  }
`;

export default function BulkDeleteRecords() {
  const [selectedParish, setSelectedParish] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: parishesData, loading: parishesLoading } = useQuery(GET_PARISHES);
  const [deleteRecords, { loading: deleting, data: result, error }] = useMutation(DELETE_RECORDS, {
    refetchQueries: ['GetParishes', 'GetRemittanceRecords'],
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  const handleDelete = async () => {
    if (!selectedParish || !selectedYear) return;
    
    await deleteRecords({
      variables: {
        parishId: selectedParish,
        year: parseInt(selectedYear),
      },
    });
    
    setShowConfirm(false);
    setSelectedParish('');
    setSelectedYear('');
  };

  const selectedParishName = parishesData?.parishes?.find(p => p.id === selectedParish)?.name;

  const selectStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#374151',
    outline: 'none',
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #fecaca', padding: '24px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Trash2 style={{ width: '20px', height: '20px', color: '#dc2626' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Bulk Delete Records</h3>
      </div>

      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
        Select a parish and year to permanently delete all remittance records for that combination.
        This action cannot be undone.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Parish</label>
          <select
            value={selectedParish}
            onChange={(e) => setSelectedParish(e.target.value)}
            disabled={parishesLoading}
            style={selectStyle}
          >
            <option value="">{parishesLoading ? 'Loading...' : 'Select parish'}</option>
            {parishesData?.parishes?.map((parish) => (
              <option key={parish.id} value={parish.id}>
                {parish.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select year</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!showConfirm ? (
        <Button
          variant="destructive"
          onClick={() => setShowConfirm(true)}
          disabled={!selectedParish || !selectedYear || deleting}
        >
          <Trash2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
          Delete Records
        </Button>
      ) : (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#7f1d1d', marginBottom: '4px' }}>
                Are you sure?
              </p>
              <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '12px' }}>
                This will permanently delete all remittance records for{' '}
                <strong>{selectedParishName}</strong> in{' '}
                <strong>{selectedYear}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 style={{ width: '16px', height: '16px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                      Yes, Delete
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result?.deleteRemittanceRecordsByParishAndYear?.success && (
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
          <CheckCircle style={{ width: '16px', height: '16px' }} />
          {result.deleteRemittanceRecordsByParishAndYear.message}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '16px', fontSize: '14px', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
          {error.message}
        </div>
      )}
    </div>
  );
}
