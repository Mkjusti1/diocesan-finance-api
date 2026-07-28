import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { client } from '@/lib/apollo';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Parishes } from '@/pages/Parishes';
import { ParishDetail } from '@/pages/ParishDetail';
import { Remittances } from '@/pages/Remittances';
import { Debtors } from '@/pages/Debtors';
import { Users } from '@/pages/Users';
import { UploadPage } from '@/pages/Upload';
import { Profile } from '@/pages/Profile';
import { CollectionPage } from '@/pages/CollectionPage';
import { NationalCollectionsPage } from '@/pages/NationalCollectionsPage';
import { RecordPayment } from '@/pages/RecordPayment';

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/parishes" element={<Parishes />} />
              <Route path="/parishes/:id" element={<ParishDetail />} />
              <Route path="/rectory" element={<CollectionPage collectionName="Rectory" title="Rectory" />} />
              <Route path="/harvest-bazaar" element={<CollectionPage collectionName="Harvest & Bazaar" title="Harvest & Bazaar" />} />
              <Route path="/cathedraticum" element={<CollectionPage collectionName="Cathedraticum" title="Cathedraticum" />} />
              <Route path="/project-sunday" element={<CollectionPage collectionName="Project Sunday" title="Project Sunday" />} />
              <Route path="/seminary-collections" element={<CollectionPage collectionName="Seminary Collections" title="Seminary Collections" />} />
              <Route path="/record-payment" element={<RecordPayment />} />\n              <Route path="/debtors" element={<Debtors />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/users" element={<Users />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}