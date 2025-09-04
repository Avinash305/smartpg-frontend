import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';

const Login = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      // Redirect to the main dashboard
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1974&auto=format&fit=crop"
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/20 to-transparent" aria-hidden="true" />

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-white drop-shadow">PG Management System</h1>
            <p className="mt-2 text-sm text-white/90">Please sign in to access your account</p>
          </div>

          {/* Login Form Component */}
          <LoginForm />

          <div className="mt-6 text-center">
            <p className="inline-block px-3 py-1 rounded-full bg-black/40 text-[11px] text-white drop-shadow-sm backdrop-blur-sm">
              &copy; {new Date().getFullYear()} PG Management System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;