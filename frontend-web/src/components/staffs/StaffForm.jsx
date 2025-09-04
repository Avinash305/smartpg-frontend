import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import staffService from '../../services/staff';
import authService from '../../services/auth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import Card from '../ui/Card';
import { Switch } from '../ui/Switch';
import Modal from '../ui/Modal';

const schema = yup.object().shape({
  full_name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone_number: yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .required('Phone number is required'),
  password: yup.string()
    .when('$editMode', {
      is: false,
      then: schema => schema
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
          /^(?=.*[!@#$%^&*()_+\-{}\[\];':"\\|,.<>/?])/,
          'Password must contain at least one special character'
        )
        .required('Password is required'),
      otherwise: schema => schema
    }),
  password2: yup.string()
    .when('password', {
      is: (val) => val && val.length > 0,
      then: schema => schema
        .oneOf([yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required'),
      otherwise: schema => schema
    }),
});

// Ensure media URLs work when backend returns relative paths like "/media/..."
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\+$/, '');
  const path = `/${String(url).replace(/^\/+/, '')}`;
  return `${origin}${path}`;
};

const StaffForm = ({ onSuccess, onCancel, editMode, staffData }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // seconds remaining
  const [otpError, setOtpError] = useState('');
  const otpInputRef = useRef(null);
  const isComposingRef = useRef(false);

  // New: profile picture local state & preview
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setError, 
    reset,
    control
  } = useForm({
    resolver: yupResolver(schema),
    context: { editMode },
    defaultValues: {
      role: 'pg_staff',
      is_active: true,
      ...(editMode && staffData)
    }
  });

  useEffect(() => {
    if (editMode && staffData) {
      // Reset form with staff data when in edit mode
      reset({
        ...staffData,
        phone_number: staffData.phone, // Map phone to phone_number for the form
        is_active: staffData.is_active,
        password: '',
        password2: ''
      });
      // Reset local profile picture selection and preview for new target
      setProfilePic(null);
      setPreviewUrl('');
    }
  }, [editMode, staffData, reset]);

  useEffect(() => {
    if (otpOpen) {
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

  // Gentle focus guard: keep focus on OTP input while modal is open
  useEffect(() => {
    if (!otpOpen || verifying) return;
    const el = otpInputRef.current;
    if (el && document.activeElement !== el && !isComposingRef.current) {
      el.focus();
    }
  }, [otpOpen, otpCode, verifying]);

  // Cleanup preview URL on unmount or when replaced
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      // Prepare the data object
      const staffPayload = {
        ...data,
        phone: data.phone_number,
        role: 'pg_staff',
        // Coerce select value to boolean (React Hook Form select returns string)
        is_active: data.is_active === true || data.is_active === 'true'
      };

      // Clean up data before submission
      delete staffPayload.phone_number;
      
      // Handle password fields
      if (editMode) {
        if (!data.password) {
          delete staffPayload.password;
          delete staffPayload.password2;
        } else {
          staffPayload.password2 = data.password2;
        }
      } else {
        staffPayload.password2 = data.password2;
      }

      // Attach profile picture file if selected (edit only)
      if (editMode && profilePic instanceof File) {
        staffPayload.profile_picture = profilePic;
      }

      let response;
      if (editMode && staffPayload.id) {
        response = await staffService.updateStaff(staffPayload.id, staffPayload);
      } else {
        response = await staffService.createStaff(staffPayload);
      }

      if (!response) {
        throw new Error('No response from server');
      }

      if (response.success) {
        // OTP-first flow: backend returns 200 with {detail: 'Verification code sent ...'} and no new user yet
        if (!editMode && response.status === 200 && response.data?.detail) {
          addToast({ type: 'success', message: response.data.detail });
          setTargetEmail(staffPayload.email);
          setOtpCode('');
          setOtpOpen(true);
          setResendTimer(60); // initial cooldown
          return; // Do not close; staff is not created yet
        }

        // Default success handling (edit or direct creation flows)
        addToast({
          type: 'success',
          message: `Staff ${editMode ? 'updated' : 'created'} successfully!`,
        });

        reset();
        const successPayload = { success: true, data: response.data ?? response };
        console.log('StaffForm onSuccess payload:', successPayload);
        if (onSuccess) onSuccess(successPayload);
        if (onCancel) onCancel();
        return;
      }

      // Handle error response
      if (response.error) {
        addToast({
          type: 'error',
          message: response.error,
        });
      }

      // Handle validation errors
      if (response.validationErrors) {
        Object.entries(response.validationErrors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : messages;
          const formField = field === 'password2' ? 'password2' : field;
          
          setError(formField, {
            type: 'manual',
            message: message
          });
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      addToast({
        type: 'error',
        message: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      const msg = 'Please enter the 6-digit OTP sent to the email.';
      setOtpError(msg);
      addToast({ type: 'error', message: msg });
      return;
    }
    try {
      setVerifying(true);
      setOtpError('');
      const res = await authService.verifyEmailOtp(targetEmail, otpCode);
      addToast({ type: 'success', message: res?.detail || 'Email verified. Staff account created.' });
      setOtpOpen(false);
      // After success, reset and refresh parent
      reset({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        password2: '',
        role: 'pg_staff',
        is_active: true,
      });
      const successPayload = { success: true };
      if (onSuccess) onSuccess(successPayload);
      if (onCancel) onCancel();
    } catch (error) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Invalid or expired OTP. Please try again or resend.';
      setOtpError(msg);
      addToast({ type: 'error', message: msg });
      // Keep focus on OTP field after error
      setTimeout(() => otpInputRef.current?.focus?.(), 0);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      setResending(true);
      await authService.resendEmailOtp(targetEmail);
      addToast({ type: 'success', message: 'OTP resent. Please check the email.' });
      setResendTimer(60);
    } catch (error) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Unable to resend OTP. Please wait and try again.';
      addToast({ type: 'error', message: msg });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Card className="w-full space-y-6 p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              {...register('full_name')}
              error={errors.full_name?.message}
              leftIcon={<FiUser />}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
              leftIcon={<FiMail />}
              disabled={editMode}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="9876543210"
              autoComplete="tel"
              {...register('phone_number')}
              error={errors.phone_number?.message}
              leftIcon={<FiPhone />}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <span className="text-sm text-gray-600">{editMode ? 'Toggle to activate/deactivate' : 'Active by default'}</span>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{field.value ? 'Active' : 'Inactive'}</span>
                    <Switch
                      checked={!!field.value}
                      onChange={(val) => field.onChange(!!val)}
                      aria-label="Active status"
                    />
                  </div>
                )}
              />
            </div>
          </div>

          {editMode && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files && e.target.files.length ? e.target.files[0] : null;
                  if (previewUrl) {
                    try { URL.revokeObjectURL(previewUrl); } catch (_) {}
                  }
                  setProfilePic(f);
                  setPreviewUrl(f ? URL.createObjectURL(f) : '');
                }}
                className="block w-full text-xs sm:text-sm"
              />
              {(previewUrl || staffData?.profile_picture) && (
                <img
                  src={previewUrl || resolveMediaUrl(staffData.profile_picture)}
                  alt="Profile preview"
                  className="mt-2 h-20 w-20 object-cover rounded-full border"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <p className="mt-1 text-[11px] text-gray-500">Max 4MB. JPG/PNG/WEBP.</p>
            </div>
          )}

          {!editMode && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('password')}
                  error={errors.password?.message}
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <Input
                  id="password2"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('password2')}
                  error={errors.password2?.message}
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
            </>
          )}

          <Button 
            type="submit" 
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading 
              ? editMode 
                ? 'Updating Staff...' 
                : 'Creating Staff...'
              : editMode 
                ? 'Update Staff' 
                : 'Add Staff'}
          </Button>
        </form>
      </Card>

      {/* OTP Verification Modal */}
      <Modal isOpen={otpOpen} onClose={() => setOtpOpen(false)} title="Verify staff email" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We sent a 6-digit verification code to <span className="font-medium">{targetEmail}</span>. Enter it below to verify and create the staff account.
          </p>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otpCode}
            onChange={(e) => {
              if (isComposingRef.current) {
                // During composition, don't filter; let IME complete
                setOtpCode(e.target.value);
                return;
              }
              setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            }}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setOtpCode((e.target.value || '').replace(/\D/g, '').slice(0, 6));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (otpCode && otpCode.length === 6 && !verifying) {
                  handleVerifyOtp();
                } else {
                  // Keep focus on OTP field after error
                  setTimeout(() => otpInputRef.current?.focus?.(), 0);
                }
              }
            }}
            onPaste={(e) => {
              const text = (e.clipboardData || window.clipboardData).getData('text');
              const digits = text.replace(/\D/g, '').slice(0, 6);
              if (digits) {
                e.preventDefault();
                setOtpCode(digits);
              }
            }}
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

export default StaffForm;