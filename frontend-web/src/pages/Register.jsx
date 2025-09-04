import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import Card from '../components/ui/Card';

const Register = () => {
  const navigate = useNavigate();

  const handleRegisterSuccess = () => {
    // Redirect to login page after successful registration
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <Card className="">
          <div className="text-center mb-8">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Create an Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join us to manage your PG accommodation
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm onSuccess={handleRegisterSuccess} />

          <div className="m-3 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <RouterLink 
                to="/login" 
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign in
              </RouterLink>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;