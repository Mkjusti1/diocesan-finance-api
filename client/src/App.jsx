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
              <Route path="/remittances" element={<Remittances />} />

              {/* Collection pages */}
              <Route path="/rectory" element={<CollectionPage title="Rectory" collectionName="Rectory" type="monthly" />} />
              <Route path="/national-collections" element={<NationalCollectionsPage />} />
              <Route path="/harvest-bazaar" element={<CollectionPage title="Harvest & Bazaar" collectionName="Harvest & Bazaar" type="annual" />} />
              <Route path="/cathedraticum" element={<CollectionPage title="Cathedraticum" collectionName="Cathedraticum" type="annual" />} />
              <Route path="/project-sunday" element={<CollectionPage title="Project Sunday" collectionName="Project Sunday" type="annual" />} />
              <Route path="/seminary-collections" element={<CollectionPage title="Seminary Collections" collectionName="Bigard Memorial Seminary" type="annual" />} />

              <Route path="/debtors" element={<Debtors />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/users" element={<Users />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}
