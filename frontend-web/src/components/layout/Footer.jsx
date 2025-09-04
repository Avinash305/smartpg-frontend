import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} PG Management System
            <span className="mx-2 text-gray-300">•</span>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
              v{appVersion}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
