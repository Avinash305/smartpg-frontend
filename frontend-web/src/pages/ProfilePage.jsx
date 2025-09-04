import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiUser, FiMail, FiPhone, FiImage, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import staffService from '../services/staff';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import Card from '../components/ui/Card';

// Ensure media URLs work when backend returns relative paths like "/media/..."
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\+$/, '');
  const path = `/${String(url).replace(/^\/+/, '')}`;
  return `${origin}${path}`;
};

const schema = yup.object().shape({
  full_name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone_number: yup
    .string()
    .matches(/^[0-9]{10}$/i, 'Phone number must be 10 digits')
    .required('Phone number is required'),
});

const ProfilePage = () => {
  const { currentUser, refreshCurrentUser, hasPlanFeature } = useAuth();
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [profilePic, setProfilePic] = useState(null); // File | null
  const [previewUrl, setPreviewUrl] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const canUploadProfilePic = useMemo(() => !!hasPlanFeature?.('staff_media'), [hasPlanFeature]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
    },
  });

  // Initialize form with current user
  useEffect(() => {
    if (!currentUser) return;
    reset({
      full_name: currentUser.full_name || '',
      email: currentUser.email || '',
      phone_number: currentUser.phone || '',
    });
    // Reset picture state
    setProfilePic(null);
    setPreviewUrl('');
    setRemovePhoto(false);
    setImageFailed(false);
  }, [currentUser, reset]);

  // Cleanup preview URL on unmount or when replaced
  useEffect(() => {
    return () => {
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
      }
    };
  }, [previewUrl]);

  const onSubmit = async (values) => {
    if (!currentUser?.id) return;
    try {
      setSaving(true);
      const payload = {
        full_name: values.full_name,
        phone: values.phone_number,
      };

      // Attach profile picture if selected
      if (profilePic instanceof File) {
        payload.profile_picture = profilePic;
      } else if (removePhoto) {
        // Explicitly clear the field (must be null for DRF ImageField)
        payload.profile_picture = null;
      }

      const res = await staffService.updateStaff(currentUser.id, payload);
      if (res?.success) {
        await refreshCurrentUser();
        addToast({ type: 'success', message: 'Profile updated successfully.' });
        // Reset local state after save
        setProfilePic(null);
        setPreviewUrl('');
        setRemovePhoto(false);
        return;
      }

      // Error handling
      if (res?.validationErrors) {
        Object.entries(res.validationErrors).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : messages;
          const formField = field === 'phone' ? 'phone_number' : field;
          setError(formField, { type: 'server', message: String(message) });
        });
      }
      const msg = res?.error || 'Failed to update profile.';
      addToast({ type: 'error', message: msg });
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to update profile.';
      addToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const currentPicUrl = useMemo(() => resolveMediaUrl(currentUser?.profile_picture), [currentUser?.profile_picture]);

  const getInitials = (nameOrEmail) => {
    const s = String(nameOrEmail || '').trim();
    if (!s) return '👤';
    if (s.includes('@')) return s[0].toUpperCase();
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '👤';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-900">My Profile</h1>
      <p className="text-sm text-gray-600">Manage your personal information and profile picture.</p>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile details */}
        <Card
          className="w-full"
          padding="md"
          title="Profile information"
          description="Update your personal details and profile picture."
          footer={
            <div className="flex justify-end">
              <Button form="profileForm" type="submit" loading={saving} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          }
        >
          <form id="profileForm" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Profile picture */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Profile picture</label>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6">
                <div className="h-28 w-28 md:h-36 md:w-36 rounded-full border overflow-hidden bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center ring-2 ring-indigo-100 shadow-sm">
                  {(previewUrl || currentPicUrl) && !imageFailed ? (
                    <img
                      src={previewUrl || currentPicUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <span className="text-2xl md:text-4xl text-gray-500 select-none">
                      {getInitials(currentUser?.full_name || currentUser?.email)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                  {canUploadProfilePic ? (
                    <>
                      <label className="inline-flex items-center justify-center px-3 py-2 text-sm bg-white border rounded-md shadow-sm cursor-pointer hover:bg-gray-50 w-full sm:w-auto max-w-xs">
                        <FiImage className="mr-2" />
                        <span>Choose photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files && e.target.files.length ? e.target.files[0] : null;
                            if (previewUrl) {
                              try { URL.revokeObjectURL(previewUrl); } catch {}
                            }
                            setProfilePic(f);
                            setRemovePhoto(false);
                            setPreviewUrl(f ? URL.createObjectURL(f) : '');
                            setImageFailed(false);
                          }}
                        />
                      </label>
                      {previewUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
                            setPreviewUrl('');
                            setProfilePic(null);
                            setImageFailed(false);
                          }}
                          className="w-full sm:w-auto max-w-xs"
                        >
                          Cancel selection
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Upgrade plan to upload profile picture.</span>
                  )}
                  {(currentUser?.profile_picture && !previewUrl) && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => { setRemovePhoto(true); setProfilePic(null); setPreviewUrl(''); }}
                      className="inline-flex items-center w-full sm:w-auto max-w-xs"
                    >
                      <FiTrash2 className="mr-2" /> Remove current photo
                    </Button>
                  )}
                  {removePhoto && (
                    <span className="text-xs text-red-600">Will remove on save</span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Max 4MB. JPG/PNG/WEBP.</p>
            </div>
            {/* Divider */}
            <div className="md:col-span-2 h-px bg-gray-100 my-2" />

            {/* Full name */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full name</label>
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

            {/* Email (read-only) */}
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email
                {currentUser?.email_verified && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 align-middle">Verified</span>
                )}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
                leftIcon={<FiMail />}
                disabled
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="9876543210"
                autoComplete="tel"
                {...register('phone_number')}
                error={errors.phone_number?.message}
                leftIcon={<FiPhone />}
              />
              <p className="mt-1 text-[11px] text-gray-500">Use a 10-digit mobile number.</p>
            </div>

          </form>
        </Card>

      </div>
    </div>
  );
};

export default ProfilePage;