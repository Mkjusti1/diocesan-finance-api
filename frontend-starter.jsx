// diocesan-finance-web/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from '@apollo/client';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PriestDashboard from './pages/PriestDashboard';
import UploadSpreadsheet from './pages/UploadSpreadsheet';
import ParishDetail from './pages/ParishDetail';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Apollo Client Setup
const httpLink = new HttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
  headers: {
    authorization: localStorage.getItem('token')
      ? `Bearer ${localStorage.getItem('token')}`
      : ''
  }
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache()
});

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/upload"
              element={
                <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                  <UploadSpreadsheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parish/:id"
              element={
                <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                  <ParishDetail />
                </ProtectedRoute>
              }
            />
            
            {/* Priest Routes */}
            <Route
              path="/priest"
              element={
                <ProtectedRoute roles={['PRIEST']}>
                  <PriestDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}

// diocesan-finance-web/src/pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { DIOCESE_FINANCIAL_SUMMARY } from '../graphql/queries';
import Header from '../components/Header';
import YearSelector from '../components/YearSelector';
import FinancialSummaryTable from '../components/FinancialSummaryTable';
import MonthlyComparisonChart from '../components/MonthlyComparisonChart';
import { Box, Container, Button, CircularProgress } from '@mui/material';

export default function AdminDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, loading, error } = useQuery(DIOCESE_FINANCIAL_SUMMARY, {
    variables: { year }
  });

  if (loading) return <CircularProgress />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Box>
      <Header title="Diocese Financial Dashboard" />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Year Selector */}
        <YearSelector year={year} onYearChange={setYear} />

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
          <SummaryCard
            title="Total Diocesan Remittance"
            amount={data?.dioceseFinancialSummary?.totalRemittance}
          />
          <SummaryCard
            title="Number of Parishes"
            amount={data?.dioceseFinancialSummary?.parishTotals?.length}
          />
          <SummaryCard
            title="Average per Parish"
            amount={
              data?.dioceseFinancialSummary?.totalRemittance /
              data?.dioceseFinancialSummary?.parishTotals?.length
            }
          />
        </Box>

        {/* Monthly Remittance Trend Chart */}
        <MonthlyComparisonChart
          data={data?.dioceseFinancialSummary?.monthlyDioceseTotals}
        />

        {/* Detailed Parish Table */}
        <FinancialSummaryTable
          parishTotals={data?.dioceseFinancialSummary?.parishTotals}
        />

        {/* Upload Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            href="/admin/upload"
            size="large"
          >
            Upload Remittance Data
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

// Reusable Summary Card Component
function SummaryCard({ title, amount }) {
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: '#f5f5f5',
        borderRadius: 2,
        textAlign: 'center'
      }}
    >
      <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>{title}</h4>
      <h2 style={{ margin: 0, color: '#333' }}>
        ₦{new Intl.NumberFormat('en-NG').format(amount || 0)}
      </h2>
    </Box>
  );
}

// diocesan-finance-web/src/pages/UploadSpreadsheet.jsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import Header from '../components/Header';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function UploadSpreadsheet() {
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadedRecords, setUploadedRecords] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValidType = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(
        selectedFile.type
      );
      if (isValidType) {
        setFile(selectedFile);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: 'Please upload an Excel (.xlsx) or CSV file' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !year) {
      setMessage({ type: 'error', text: 'Please select a file and year' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `✓ Uploaded ${result.recordCount} records` });
        setUploadedRecords(result.records);
        setFile(null);
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Header title="Upload Remittance Data" />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            {/* Instructions */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
              <h4>Upload Instructions:</h4>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>File format: Excel (.xlsx) or CSV</li>
                <li>One sheet per month (JAN, FEB, MAR, etc.)</li>
                <li>First column: Parish Name</li>
                <li>Other columns: Remittance sources (First Collection, Second Collection, etc.)</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </Box>

            {/* File Input */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Select File
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                />
              </Button>
              {file && <p>Selected: {file.name}</p>}
            </Box>

            {/* Year Input */}
            <TextField
              fullWidth
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              sx={{ mb: 3 }}
            />

            {/* Upload Button */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleUpload}
              disabled={!file || loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Upload'}
            </Button>

            {/* Message */}
            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}

            {/* Uploaded Records */}
            {uploadedRecords.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <h4>Uploaded Records:</h4>
                <List>
                  {uploadedRecords.map((record) => (
                    <ListItem key={record.id}>
                      <ListItemText
                        primary={`Parish ID: ${record.parishId}`}
                        secondary={`${record.year}/${record.month} - Created: ${new Date(record.createdAt).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

// diocesan-finance-web/src/pages/PriestDashboard.jsx
import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { MY_PARISH_YEARLY_REMITTANCE } from '../graphql/queries';
import Header from '../components/Header';
import YearSelector from '../components/YearSelector';
import { Box, Container, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

export default function PriestDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, loading, error } = useQuery(MY_PARISH_YEARLY_REMITTANCE, {
    variables: { year }
  });

  if (loading) return <CircularProgress />;
  if (error) return <div>Error: {error.message}</div>;

  const parishData = data?.parishYearlyRemittance;

  return (
    <Box>
      <Header title={`${parishData?.parish?.name} - Financial Records`} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <YearSelector year={year} onYearChange={setYear} />

        {/* Summary */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <h3>Year Total: ₦{new Intl.NumberFormat('en-NG').format(parishData?.yearTotal || 0)}</h3>
        </Box>

        {/* Monthly Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#e0e0e0' }}>
              <TableRow>
                <TableCell><strong>Month</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parishData?.monthlyTotals?.map((month) => (
                <TableRow key={month.month}>
                  <TableCell>{month.monthName}</TableCell>
                  <TableCell align="right">
                    ₦{new Intl.NumberFormat('en-NG').format(month.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Box>
  );
}

// diocesan-finance-web/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Validate token with backend
      fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: '{ me { id email role } }' })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.data?.me) {
            setUser(data.data.me);
          } else {
            logout();
          }
        });
    }
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// diocesan-finance-web/src/graphql/queries.js
import { gql } from '@apollo/client';

export const DIOCESE_FINANCIAL_SUMMARY = gql`
  query DioceseFinancialSummary($year: Int!) {
    dioceseFinancialSummary(year: $year) {
      year
      totalRemittance
      parishTotals {
        parish {
          id
          name
        }
        yearTotal
        monthlyTotals {
          month
          monthName
          amount
        }
      }
      monthlyDioceseTotals {
        month
        monthName
        total
      }
    }
  }
`;

export const MY_PARISH_YEARLY_REMITTANCE = gql`
  query MyParishYearlyRemittance($year: Int!) {
    parishYearlyRemittance(parishId: 0, year: $year) {
      parish {
        id
        name
      }
      yearTotal
      monthlyTotals {
        month
        monthName
        amount
      }
    }
  }
`;
