import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import Label from '../ui/Label';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/DropdownMenu';
import { ChevronDown, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import authService from '../../services/auth';

export const LoginForm = () => {
  const [formData, setFormData] = useState({
    role: 'pg_admin', // Default role
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1: email entry, 2: code+new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPwd, setFpNewPwd] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpErrors, setFpErrors] = useState({});
  const [fpResendCooldown, setFpResendCooldown] = useState(0);
  const [fpResending, setFpResending] = useState(false);
  const { login, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const roleOptions = [
    { value: 'pg_admin', icon: User }, 
    { value: 'pg_staff', icon: User },
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.role) {
      newErrors.role = t('login.errors.select_role');
    }
    if (!formData.email) {
      newErrors.email = t('login.errors.email_required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('login.errors.email_invalid');
    }
    if (!formData.password) {
      newErrors.password = t('login.errors.password_required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
    if (errors.role) {
      setErrors(prev => ({
        ...prev,
        role: ''
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (fpResendCooldown <= 0) return;
    const timer = setInterval(() => setFpResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [fpResendCooldown]);

  const openForgot = () => {
    setShowForgot(true);
    setFpStep(1);
    setFpEmail(formData.email || '');
    setFpCode('');
    setFpNewPwd('');
    setFpErrors({});
  };

  const closeForgot = () => {
    setShowForgot(false);
    setFpLoading(false);
  };

  const handleForgotRequest = async (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!fpEmail) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(fpEmail)) errs.email = 'Invalid email';
    setFpErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setFpLoading(true);
      await authService.requestPasswordResetOtp(fpEmail);
      addToast({ message: 'If the email exists, a code has been sent.', type: 'success', duration: 4000 });
      setFpStep(2);
      setFpResendCooldown(60);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Unable to request reset.';
      addToast({ message: msg, type: 'error', duration: 5000 });
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotVerify = async (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!fpCode) errs.code = 'Code is required';
    if (!fpNewPwd) errs.new_password = 'New password is required';
    if (fpNewPwd && fpNewPwd.length < 8) errs.new_password = 'Password must be at least 8 characters';
    setFpErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setFpLoading(true);
      await authService.verifyPasswordResetOtp(fpEmail, fpCode, fpNewPwd);
      addToast({ message: 'Password has been reset. You can log in now.', type: 'success', duration: 4000 });
      setShowForgot(false);
      // Prefill login email and clear password for safety
      setFormData((p) => ({ ...p, email: fpEmail, password: '' }));
    } catch (e) {
      const msg = e.response?.data?.detail || 'Invalid code or error resetting password.';
      // Map server message to field-level errors so user sees it inline
      const fieldErrs = {};
      if (/invalid code/i.test(msg) || /expired/i.test(msg) || /too many attempts/i.test(msg)) {
        fieldErrs.code = msg;
      } else if (/password/i.test(msg)) {
        fieldErrs.new_password = msg;
      }
      if (Object.keys(fieldErrs).length) setFpErrors(fieldErrs);
      addToast({ message: msg, type: 'error', duration: 5000 });
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotResend = async () => {
    if (fpResendCooldown > 0 || !/\S+@\S+\.\S+/.test(fpEmail)) return;
    try {
      setFpResending(true);
      await authService.requestPasswordResetOtp(fpEmail);
      addToast({ message: 'A new code has been sent (if email exists).', type: 'success', duration: 4000 });
      setFpResendCooldown(60);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Unable to resend code.';
      addToast({ message: msg, type: 'error', duration: 5000 });
    } finally {
      setFpResending(false);
    }
  };

  const handleManualResend = async () => {
    if (resendCooldown > 0 || !/\S+@\S+\.\S+/.test(formData.email)) return;
    try {
      setResending(true);
      await authService.resendEmailOtp(formData.email);
      addToast({ message: 'Verification code sent to your email.', type: 'success', duration: 4000 });
      setResendCooldown(60);
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.message || 'Unable to resend verification code.';
      addToast({ message: msg, type: 'error', duration: 5000 });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const user = await login({ ...formData, remember: formData.rememberMe });
      // Validate selected role vs actual account role
      if (user?.role && user.role !== formData.role) {
        const expected = displayRoleLabel(formData.role);
        const actual = displayRoleLabel(user.role);
        const msg = `Selected role (${expected}) does not match your account role (${actual}).`;
        addToast({ message: msg, type: 'error', duration: 5000 });
        setErrors({ submit: msg });
        // Clear session to avoid logging in under a mismatched role
        try { logout(); } catch {}
        return;
      }
      
      // Log user info to console
      const userInfo = {
        'User ID': user.id,
        'Email': user.email,
        'Role': user.role,
        'Full Name': user.full_name || 'Not provided',
        'Status': user.is_active ? 'Active' : 'Inactive',
        'Last Login': user.last_login || 'First login',
        'Account Type': user.role === 'pg_admin' ? 'Admin' : 'Staff',
        'Login Time': new Date().toLocaleString()
      };
      
      console.log('=== USER LOGGED IN SUCCESSFULLY ===');
      console.table(userInfo);
      console.log('Raw user object:', user);
      
      addToast({
        message: t('login.success'),
        type: 'success',
        duration: 3000
      });
      
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        if (user.role === 'pg_admin') {
          navigate('/dashboard');
        } else if (user.role === 'pg_staff') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || t('login.errors.failed');
      addToast({
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayRoleLabel = (value) => {
    switch (value) {
      case 'pg_admin': return t('login.role_pg_admin');
      case 'pg_staff': return t('login.role_pg_staff');
      default: return t('login.select_role');
    }
  };

  return (
    <Card className="max-w-md w-full space-y-6 p-6 rounded-xl bg-white/80 backdrop-blur-md shadow-2xl border border-white/30">
      {errors.submit && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-sm text-red-700">{errors.submit}</p>
          {/Email not verified/i.test(errors.submit) && (
            <div className="mt-2 text-xs text-gray-700 flex items-center justify-between">
              {resendCooldown > 0 ? (
                <p>You can request a new code in {resendCooldown}s.</p>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleManualResend} disabled={resending}>
                  {resending ? 'Sending…' : 'Resend verification code'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="role-select">{t('login.login_as')}</Label>
          <div className="mt-1">
            <input
              type="hidden"
              id="role"
              name="role"
              value={formData.role}
              onChange={() => {}}
              aria-hidden="true"
              style={{ display: 'none' }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger 
                id="role-select"
                className="flex items-center justify-between w-full px-4 py-2 text-sm border rounded-md border-input bg-background/80 backdrop-blur-sm hover:bg-accent/60 hover:text-accent-foreground"
                aria-haspopup="listbox"
                aria-expanded={isRoleDropdownOpen}
                aria-controls="role-options"
              >
                <div className="flex items-center">
                  {React.createElement(
                    roleOptions.find(r => r.value === formData.role)?.icon || User,
                    { className: 'h-4 w-4 mr-2' }
                  )}
                  {displayRoleLabel(roleOptions.find(r => r.value === formData.role)?.value)}
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                id="role-options"
                role="listbox"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                {roleOptions.map((option) => {
                  const Icon = option.icon || User;
                  return (
                    <DropdownMenuItem 
                      key={option.value}
                      id={`role-option-${option.value}`}
                      role="option"
                      aria-selected={formData.role === option.value}
                      onSelect={() => handleRoleSelect(option.value)}
                      className="cursor-pointer flex items-center"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {displayRoleLabel(option.value)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600" id="role-error">
              {errors.role}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="email">{t('login.email')}</Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 z-10" />
            </div>  
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="pl-10 bg-white/90 backdrop-blur-sm"
              placeholder={t('login.email_placeholder')}
              autoComplete="username"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">{t('login.password')}</Label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 z-10" />
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              className="pl-10 pr-10 bg-white/90 backdrop-blur-sm"
              placeholder={t('login.password_placeholder')}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              tabIndex="-1"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rememberMe: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                {t('login.remember_me')}
              </label>
            </div>
            <div className="text-sm">
              <button
                type="button"
                onClick={openForgot}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {t('login.forgot_password')}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                {t('login.signing_in')}
              </>
            ) : (
              t('login.sign_in')
            )}
          </Button>
        </div>
      </form>
      
      <div className="text-center text-sm text-gray-600">
        <p>{t('login.no_account')}{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            {t('login.sign_up')}
          </Link>
        </p>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={closeForgot}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-1">Forgot Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              {fpStep === 1 ? 'Enter your email to receive a verification code.' : 'Enter the code sent to your email and your new password.'}
            </p>

            {fpStep === 1 && (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <Label htmlFor="fpEmail">Email</Label>
                  <Input
                    id="fpEmail"
                    type="email"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {fpErrors.email && <p className="mt-1 text-sm text-red-600">{fpErrors.email}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={fpLoading}>
                  {fpLoading ? <><LoadingSpinner className="mr-2 h-4 w-4" /> Sending…</> : 'Send code'}
                </Button>
              </form>
            )}

            {fpStep === 2 && (
              <form onSubmit={handleForgotVerify} className="space-y-4">
                <div>
                  <Label htmlFor="fpEmail2">Email</Label>
                  <Input id="fpEmail2" type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="fpCode">Verification Code</Label>
                  <div className="flex gap-2">
                    <Input id="fpCode" value={fpCode} onChange={(e) => setFpCode(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="6-digit code" autoComplete="one-time-code" />
                    <Button type="button" variant="secondary" onClick={handleForgotResend} disabled={fpResending || fpResendCooldown>0}>
                      {fpResending ? 'Sending…' : fpResendCooldown>0 ? `Resend in ${fpResendCooldown}s` : 'Resend'}
                    </Button>
                  </div>
                  {fpErrors.code && <p className="mt-1 text-sm text-red-600">{fpErrors.code}</p>}
                </div>
                <div>
                  <Label htmlFor="fpNewPwd">New Password</Label>
                  <Input id="fpNewPwd" type="password" value={fpNewPwd} onChange={(e) => setFpNewPwd(e.target.value)} placeholder="Enter new password" autoComplete="new-password" />
                  {fpErrors.new_password && <p className="mt-1 text-sm text-red-600">{fpErrors.new_password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={fpLoading}>
                  {fpLoading ? <><LoadingSpinner className="mr-2 h-4 w-4" /> Resetting…</> : 'Reset Password'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};