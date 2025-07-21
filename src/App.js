import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRScannerMain from './components/QRScannerMain';
import StoreListPage from './components/StoreListPage';
import StoreDetailPage from './components/StoreDetailPage';
import SettingsPage from './components/SettingsPage';
import InventoryReportPage from './components/InventoryReportPage';
import InventoryStatusPage from './components/InventoryStatusPage';
import QRScanPage from './components/QRScanPage';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<QRScannerMain />} />
          <Route path="/store-list" element={<StoreListPage />} />
          <Route path="/store-detail/:storeId" element={<StoreDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/inventory-report" element={<InventoryReportPage />} />
          <Route path="/inventory-status" element={<InventoryStatusPage />} />
          <Route path="/scan" element={<QRScanPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 