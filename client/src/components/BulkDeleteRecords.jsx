import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

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

  return (
    <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Trash2 className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Bulk Delete Records</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Select a parish and year to permanently delete all remittance records for that combination.
        This action cannot be undone.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parish</label>
          <Select value={selectedParish} onValueChange={setSelectedParish} disabled={parishesLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={parishesLoading ? 'Loading...' : 'Select parish'} />
            </SelectTrigger>
            <SelectContent>
              {parishesData?.parishes?.map((parish) => (
                <SelectItem key={parish.id} value={parish.id}>
                  {parish.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!showConfirm ? (
        <Button
          variant="destructive"
          onClick={() => setShowConfirm(true)}
          disabled={!selectedParish || !selectedYear || deleting}
          className="w-full md:w-auto"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Records
        </Button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                Are you sure?
              </p>
              <p className="text-sm text-red-700 mb-3">
                This will permanently delete all remittance records for{' '}
                <strong>{selectedParishName}</strong> in{' '}
                <strong>{selectedYear}</strong>.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
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
        <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="w-4 h-4" />
          {result.deleteRemittanceRecordsByParishAndYear.message}
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error.message}
        </div>
      )}
    </div>
  );
}
