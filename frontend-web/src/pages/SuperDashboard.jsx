import React, { useState } from 'react';
import PricesManager from '../components/super/PricesManager';
import CouponsManager from '../components/super/CouponsManager';

const SuperDashboard = () => {
  const [tab, setTab] = useState('prices');

  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-md text-sm font-medium border ${
        tab === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Super Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor and maintain prices and coupons dynamically.</p>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <TabButton id="prices">Prices</TabButton>
        <TabButton id="coupons">Coupons</TabButton>
      </div>

      <section className="bg-white rounded-lg shadow p-4">
        {tab === 'prices' ? <PricesManager /> : <CouponsManager />}
      </section>
    </div>
  );
};

export default SuperDashboard;
