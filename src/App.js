import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRScannerMain from './components/QRScannerMain';
import StoreListPage from './components/StoreListPage';
import StoreDetailPage from './components/StoreDetailPage';
import InventoryReportPage from './components/InventoryReportPage';
import InventoryStatusPage from './components/InventoryStatusPage';
import QRScanPage from './components/QRScanPage';
import StoreSelectPage from './components/StoreSelectPage';
import ManagerPage from './components/ManagerPage';
import AdminPage from './components/AdminPage';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<QRScannerMain />} />
          <Route path="/store-list" element={<StoreListPage />} />
          <Route path="/store-detail/:storeId" element={<StoreDetailPage />} />
          <Route path="/inventory-report" element={<InventoryReportPage />} />
          <Route path="/inventory-status" element={<InventoryStatusPage />} />
          <Route path="/store-select" element={<StoreSelectPage />} />
          <Route path="/scan" element={<QRScanPage />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 