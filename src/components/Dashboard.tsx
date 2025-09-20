// src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardTutorial from './tutorial/DashboardTutorial';

const Dashboard = () => {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if we should start the tutorial based on navigation state
    const shouldStartTutorial = location.state?.startTutorial;
    if (shouldStartTutorial) {
      setShowTutorial(true);
      // Clear the state to prevent tutorial from starting again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEndTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>
      
      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div id="total-revenue" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">KES 125,430</p>
        </div>
        
        <div id="active-customers" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900">Active Customers</h3>
          <p className="text-2xl font-bold text-blue-600">142</p>
        </div>
        
        <div id="sales-today" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900">Sales Today</h3>
          <p className="text-2xl font-bold text-purple-600">24</p>
        </div>
        
        <div id="low-stock" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900">Low Stock Items</h3>
          <p className="text-2xl font-bold text-red-600">8</p>
        </div>
        
        <div id="insights-reports" className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 md:col-span-2 lg:col-span-1">
          <h3 className="font-medium text-gray-900">Insights & Reports</h3>
          <p className="text-gray-600">View detailed analytics</p>
        </div>
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <DashboardTutorial onEndTutorial={handleEndTutorial} />
      )}
    </div>
  );
};

export default Dashboard;
