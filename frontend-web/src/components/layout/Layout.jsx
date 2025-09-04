import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from '../layout/Footer';
import AdPlaceholder from '../ads/AdPlaceholder';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const globalAdSlot = import.meta.env.VITE_GOOGLE_ADS_SLOT_GLOBAL;

  // Optional: route-based slot overrides (set any of these in .env)
  const slotMap = {
    '/dashboard': import.meta.env.VITE_GOOGLE_ADS_SLOT_DASHBOARD,
    '/tenants': import.meta.env.VITE_GOOGLE_ADS_SLOT_TENANTS,
    '/invoices': import.meta.env.VITE_GOOGLE_ADS_SLOT_INVOICES,
    '/notifications': import.meta.env.VITE_GOOGLE_ADS_SLOT_NOTIFICATIONS,
  };

  const resolveSlot = (pathname) => {
    for (const [prefix, slot] of Object.entries(slotMap)) {
      if (slot && pathname.startsWith(prefix)) return slot;
    }
    return globalAdSlot;
  };

  const currentSlot = resolveSlot(location.pathname);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Don't show layout for auth pages
  if (!isAuthenticated) {
    return (
      <div className="bg-white min-h-screen">
        <Outlet />
        {currentSlot && (
          <div className="p-2">
            <AdPlaceholder
              key={`global-unauth-${location.pathname}`}
              slot={currentSlot}
              style={{ minHeight: 90 }}
            />
          </div>
        )}
      </div>
    );
  }

  // Calculate sidebar width based on collapsed state
  const sidebarWidth = isCollapsed ? '5rem' : '16rem';
  const sidebarTranslateX = sidebarOpen ? '0' : '-100%';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <motion.div
        className={`fixed lg:relative h-full z-30 bg-white shadow-lg transition-all duration-300 ease-in-out`}
      >
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={toggleSidebar} 
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </motion.div>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col pt-16 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: !isMobile && !isCollapsed ? '16rem' : !isMobile && isCollapsed ? '5rem' : '0',
          width: isMobile ? '100%' : `calc(100% - ${isCollapsed ? '5rem' : '16rem'})`,
        }}
      >
        {/* Navbar */}
        <Navbar 
          sidebarOpen={sidebarOpen}
          isOpen={sidebarOpen} 
          onClose={toggleSidebar} 
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobile={isMobile}
          toggleSidebar={toggleSidebar}
          onClick={toggleSidebar}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-2 md:p-2">
          <Outlet />
          {currentSlot && (
            <div className="mt-2">
              <AdPlaceholder
                key={`global-auth-${location.pathname}`}
                slot={currentSlot}
                style={{ minHeight: 90 }}
              />
            </div>
          )}
          <Footer />
        </main>
        
      </div>
    </div>
  );
};

export default Layout;
