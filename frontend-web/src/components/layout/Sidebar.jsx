import React, { useState, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiDollarSign, 
  FiCalendar, 
  FiMessageSquare,
  FiX,
  FiChevronRight,
  FiPieChart,
  FiTool,
  FiFileText,
  FiAlertCircle,
  FiClipboard,
  FiMenu,
  FiChevronLeft,
  FiChevronRight as FiChevronRightIcon,
  FiChevronDown,
  FiHelpCircle,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Bed as BedIcon } from 'lucide-react';

const Sidebar = memo(({ isOpen, onClose, isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const { t } = useTranslation();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        onClose?.();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  // Close sidebar when location changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose?.();
    }
  }, [location.pathname, onClose]);

  const navItems = [
    { 
      to: '/dashboard', 
      icon: <FiHome />, 
      labelKey: 'sidebar.dashboard',
      exact: true
    },
    { 
      to: '/bed-availability', 
      icon: <BedIcon className="w-5 h-5" />, 
      labelKey: 'dashboard.bed_availability.title',
      exact: false
    },
    { 
      to: '/tenants', 
      icon: <FiUsers />, 
      labelKey: 'sidebar.tenants'
    },
    { 
      to: '/bookings', 
      icon: <FiCalendar />, 
      labelKey: 'sidebar.bookings'
    },
    { 
      to: '/buildings', 
      icon: <FiHome />, 
      labelKey: 'sidebar.buildings',
      exact: false
    },
   
    { 
      to: '/expenses', 
      icon: <FiDollarSign />, 
      labelKey: 'sidebar.expenses',
      exact: false
    },

    { 
      to: '/payments', 
      icon: <FiDollarSign />, 
      labelKey: 'sidebar.payments'
    },
    { 
      to: '/messages', 
      icon: <FiMessageSquare />, 
      labelKey: 'sidebar.messages'
    },
    { 
      to: '/settings', 
      icon: <FiMessageSquare />, 
      labelKey: 'sidebar.settings'
    },
    { 
      to: '/reports', 
      icon: <FiPieChart />, 
      labelKey: 'sidebar.reports'
    },
    { 
      to: '/staffs', 
      icon: <FiTool />, 
      labelKey: 'sidebar.staffs',
      hidden: !(currentUser?.role === 'pg_admin' || currentUser?.is_superuser)
    },
    { 
      to: '/support', 
      icon: <FiHelpCircle />, 
      labelKey: 'Support'
    },
  ];

  const isActive = (path, exact = false) => {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  };

  const toggleSubmenu = (index) => {
    setActiveSubmenu(activeSubmenu === index ? null : index);
  }; 

  // New: temporary expand on hover for lg screens when collapsed
  const [hoverExpand, setHoverExpand] = useState(false);
  const effectiveCollapsed = isCollapsed && !hoverExpand; // temporarily uncollapse while hovering

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex flex-col fixed inset-y-0 z-30 bg-white shadow-lg transition-all duration-300 ease-in-out ${
          effectiveCollapsed ? 'w-20' : 'w-64'
        } overflow-hidden`}
        onMouseEnter={() => {
          if (window.innerWidth >= 1024 && isCollapsed) setHoverExpand(true);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setHoverExpand(false);
        }}
      >
        {/* Logo */}
        <div className={`flex items-center justify-between h-16 px-4 border-b border-gray-200 ${
          effectiveCollapsed ? 'px-0 justify-center' : 'px-4'
        }`}>
          {!effectiveCollapsed && (
            <h1 className="text-xl font-bold text-indigo-600">{t('nav.title')}</h1>
          )}
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title={effectiveCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {effectiveCollapsed ? <FiChevronRightIcon /> : <FiChevronLeft />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.filter(item => !item.hidden).map((item, index) => (
              <li key={index}>
                <Link
                  to={item.to}
                  className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to, item.exact)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${effectiveCollapsed ? 'justify-center' : ''}`}
                  title={effectiveCollapsed ? t(item.labelKey) : ''}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!effectiveCollapsed && <span className="ml-3">{t(item.labelKey)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg lg:hidden flex flex-col h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-14 px-3 border-b border-gray-200">
              <h1 className="text-lg font-bold text-indigo-600">{t('nav.title')}</h1>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              >
                <FiX />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1.5">
                {navItems.filter(item => !item.hidden).map((item, index) => (
                  <li key={index}>
                    <Link
                      to={item.to}
                      className={`flex items-center p-3 rounded-lg text-sm font-medium ${
                        isActive(item.to, item.exact)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={onClose}
                    >
                      <span className="text-base mr-3">{item.icon}</span>
                      <span className="text-sm">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default Sidebar;
