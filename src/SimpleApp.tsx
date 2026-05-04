import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Simple Dashboard Component
const SimpleDashboard = () => (
  <div style={{ padding: '2rem' }}>
    <h1>Admin Dashboard</h1>
    <p>Welcome to SpeedCopy Admin Panel</p>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem',
      marginTop: '2rem'
    }}>
      <div style={{ 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>Total Orders</h3>
        <p style={{ fontSize: '2rem', margin: 0, color: '#007bff' }}>254</p>
      </div>
      <div style={{ 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>Revenue</h3>
        <p style={{ fontSize: '2rem', margin: 0, color: '#28a745' }}>₹1.2L</p>
      </div>
      <div style={{ 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>Active Vendors</h3>
        <p style={{ fontSize: '2rem', margin: 0, color: '#ffc107' }}>23</p>
      </div>
    </div>
  </div>
);

// Simple Layout
const SimpleLayout = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
    <nav style={{ 
      background: '#343a40', 
      color: 'white', 
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h1 style={{ margin: 0 }}>SpeedCopy Admin</h1>
      <div>
        <a href="/dashboard" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none' }}>Dashboard</a>
        <a href="/orders" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none' }}>Orders</a>
        <a href="/customers" style={{ color: 'white', textDecoration: 'none' }}>Customers</a>
      </div>
    </nav>
    <main>{children}</main>
  </div>
);

const SimpleApp = () => (
  <BrowserRouter>
    <SimpleLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
        <Route path="/orders" element={<div style={{ padding: '2rem' }}><h1>Orders Page</h1><p>Orders management coming soon...</p></div>} />
        <Route path="/customers" element={<div style={{ padding: '2rem' }}><h1>Customers Page</h1><p>Customer management coming soon...</p></div>} />
        <Route path="*" element={<div style={{ padding: '2rem' }}><h1>404 - Page Not Found</h1></div>} />
      </Routes>
    </SimpleLayout>
  </BrowserRouter>
);

export default SimpleApp;