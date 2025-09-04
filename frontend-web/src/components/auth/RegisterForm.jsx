import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import authService from '../../services/auth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

const schema = yup.object().shape({
  full_name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone_number: yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .required('Phone number is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])/,
      'Password must contain at least one lowercase letter'
    )
    .matches(
      /^(?=.*[A-Z])/,
      'Password must contain at least one uppercase letter'
    )
    .matches(
      /^(?=.*[0-9])/,
      'Password must contain at least one number'
    )
    .matches(
      /^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
      'Password must contain at least one special character'
    )
    .required('Password is required'),
  password2: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
});

const RegisterForm = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState({});
  const { addToast } = useToast();

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // seconds remaining
  const [otpError, setOtpError] = useState('');
  const otpInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, setError, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      role: 'pg_admin'
    }
  });

  // Focus OTP input when modal opens
  useEffect(() => {
    if (otpOpen) {
      // next tick to ensure element mounted
      setTimeout(() => {
        otpInputRef.current?.focus?.();
      }, 0);
      setOtpError('');
    }
  }, [otpOpen]);

  // Countdown for resend rate limit (assumes 60s server rate limit)
  useEffect(() => {
    if (!otpOpen || resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpOpen, resendTimer]);

  const onSubmit = async (data) => {
    try {
      setBackendErrors({});
      setIsLoading(true);
      // Map frontend phone_number -> backend phone
      const userData = { ...data, phone: data.phone_number };
      delete userData.phone_number;

      console.log('Sending registration data to backend:', JSON.stringify(userData, null, 2));
      const response = await authService.register(userData);

      if (response && response.success) {
        // Open OTP modal (do NOT navigate yet)
        setRegisteredEmail(userData.email);
        setOtpCode('');
        setOtpOpen(true);
        setResendTimer(60); // initial cooldown after first send

        addToast({
          type: 'success',
          message: 'Registration successful! We have sent an OTP to your email.',
        });

        // Do not call onSuccess here; wait until OTP verification succeeds
      } else if (response) {
        if (response.validationErrors) {
          Object.entries(response.validationErrors).forEach(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages;
            // Map backend 'phone' error back to UI field 'phone_number'
            const formField = field === 'phone' ? 'phone_number' : (field === 'password2' ? 'password2' : field);
            setError(formField, { type: 'manual', message });
            setBackendErrors(prev => ({ ...prev, [formField]: message }));
            if (Object.keys(response.validationErrors)[0] === field) {
              addToast({ type: 'error', message });
            }
          });
        } else if (response.error) {
          addToast({ type: 'error', message: response.error });
        }
      } else {
        addToast({ type: 'error', message: 'An unexpected error occurred during registration' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      addToast({ type: 'error', message: error.message || 'An unexpected error occurred during registration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      const msg = 'Please enter the 6-digit OTP sent to your email.';
      setOtpError(msg);
      addToast({ type: 'error', message: msg });
      return;
    }
    try {
      setVerifying(true);
      setOtpError('');
      const res = await authService.verifyEmailOtp(registeredEmail, otpCode);
      addToast({ type: 'success', message: res?.detail || 'Email verified successfully! You can now log in.' });
      setOtpOpen(false);
      reset(); // clear form after success
      // Call onSuccess AFTER successful verification (e.g., navigate to login)
      if (onSuccess) onSuccess();
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.message || 'Invalid or expired OTP. Please try again or resend.';
      // Show inline error under the OTP input
      setOtpError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      setResending(true);
      await authService.resendEmailOtp(registeredEmail);
      addToast({ type: 'success', message: 'OTP resent. Please check your email.' });
      setResendTimer(60);
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.message || 'Unable to resend OTP. Please wait and try again.';
      addToast({ type: 'error', message: msg });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md space-y-6 p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              {...register('full_name')}
              error={errors.full_name?.message || backendErrors.full_name}
              leftIcon={<FiUser />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message || backendErrors.email}
              leftIcon={<FiMail />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="9876543210"
              autoComplete="tel"
              {...register('phone_number')}
              error={errors.phone_number?.message || backendErrors.phone_number}
              leftIcon={<FiPhone />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message || backendErrors.password}
              leftIcon={<FiLock />}
              rightIcon={
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <Input
              id="password2"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password2')}
              error={errors.password2?.message || backendErrors.password2}
              leftIcon={<FiLock />}
              rightIcon={
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              }
            />
          </div>

          {/* Hidden role field */}
          <input type="hidden" {...register('role')} />

          <Button 
            type="submit" 
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </Card>

      <Modal isOpen={otpOpen} onClose={() => setOtpOpen(false)} title="Verify your email" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We sent a 6-digit verification code to <span className="font-medium">{registeredEmail}</span>. Enter it below to verify your email.
          </p>
          <Input
            id="otp"
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            ref={otpInputRef}
            error={otpError}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              onClick={handleResendOtp}
              disabled={resending || resendTimer > 0}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : (resending ? 'Resending...' : 'Resend Code')}
            </Button>
            <Button onClick={handleVerifyOtp} loading={verifying} disabled={verifying || otpCode.length !== 6}>
              Verify Email
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RegisterForm;