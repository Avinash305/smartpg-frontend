// In App.jsx
import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, Toast } from './context/ToastContext';
import AppRouter from './router/AppRouter';
import './utils/i18/i18n';

function App() {
  const { t, i18n } = useTranslation();

  // Dynamically set page title when language changes
  useEffect(() => {
    try {
      document.title = t('nav.title');
    } catch {}
  }, [i18n.language, t]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Toast />
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;