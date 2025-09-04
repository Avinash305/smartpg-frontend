import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiEdit2, FiArrowLeft, FiUser, FiMail, FiPhone, FiXCircle, FiCopy, FiPower } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import Modal from '../ui/Modal';
import StaffForm from './StaffForm';
import StaffPermissions from './StaffPermissions';
import staffService from '../../services/staff';
import { formatDateOnly } from '../../utils/dateUtils';
import RecentActivitiesCard from '../activities/RecentActivitiesCard';

// Ensure media URLs work when backend returns relative paths like "/media/..."
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const origin = apiBase.replace(/\/?api\/?$/i, '').replace(/\+$/, '');
  const path = `/${String(url).replace(/^\/+/, '')}`;
  return `${origin}${path}`;
};

const StaffDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [staff, setStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Helper: copy to clipboard with toast
  const handleCopy = async (text, label = 'Text') => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(String(text));
      addToast({ type: 'success', message: `${label} copied` });
    } catch (e) {
      addToast({ type: 'error', message: `Failed to copy ${label.toLowerCase()}` });
    }
  };

  // Fetch staff details
  useEffect(() => {
    if (!id) return;

    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const response = await staffService.getStaffById(id);
        if (response.success) {
          setStaff(response.data);
        } else {
          setError(response.error || 'Failed to fetch staff details');
        }
      } catch (err) {
        setError('An error occurred while fetching staff details');
        console.error('Error fetching staff:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [id]);

  const handleUpdateSuccess = (response) => {
    if (response?.success) {
      setStaff(response.data);
      addToast({
        type: 'success',
        message: 'Staff details updated successfully',
      });
      setIsEditModalOpen(false);
    }
  };

  const handlePermissionsChange = async (nextPermissions) => {
    if (!staff) return;
    try {
      setIsUpdatingPermissions(true);
      const response = await staffService.updateStaffPermissions(staff.id, nextPermissions || {});
      if (response.success) {
        setStaff(prev => ({
          ...prev,
          permissions: response.data.permissions || {}
        }));
        addToast({ type: 'success', message: 'Permissions updated successfully' });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      addToast({ type: 'error', message: 'Failed to update permissions' });
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  // Toggle staff active status with optimistic UI
  const handleToggleActive = async () => {
    if (!staff) return;
    const next = !staff.is_active;
    try {
      setIsUpdatingStatus(true);
      setStaff(prev => ({ ...prev, is_active: next }));
      const resp = await staffService.updateStaffStatus(staff.id, next);
      if (!resp?.success) {
        setStaff(prev => ({ ...prev, is_active: !next }));
        addToast({ type: 'error', message: resp?.error || 'Failed to update status' });
        return;
      }
      addToast({ type: 'success', message: `Staff ${next ? 'activated' : 'deactivated'}` });
    } catch (e) {
      setStaff(prev => ({ ...prev, is_active: !next }));
      addToast({ type: 'error', message: 'Failed to update status' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiXCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-xs sm:text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          >
            <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium">Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs sm:text-sm text-gray-600 mb-4">No staff member found with this ID.</p>
        <button
          type="button"
          onClick={() => navigate('/staff')}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
        >
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Back to Staff List</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          aria-label="Go Back"
        >
          <FiArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Staff Details</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">View and manage staff information</p>
        </div>
        <div className="flex space-x-3" />
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Profile Information</h3>
          <Button onClick={() => setIsEditModalOpen(true)} variant="primary" aria-label="Edit Staff">
            <FiEdit2 className="mr-2" /> Edit
          </Button>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column */}
            <div className="md:w-1/3">
              <div className="flex flex-col items-center">
                <div className="h-32 w-32 rounded-full bg-blue-100 flex items-center justify-center mb-4 overflow-hidden">
                  {staff.profile_picture ? (
                    <img
                      src={resolveMediaUrl(staff.profile_picture)}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <FiUser className="h-16 w-16 text-blue-600" />
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">{staff.full_name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 capitalize">{staff.role || 'Staff'}</p>
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                  staff.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="md:w-2/3">
              <div className="mt-1 space-y-4">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <FiMail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs text-gray-500">Email</p>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${staff.email}`} className="text-gray-900 break-all hover:underline">{staff.email}</a>
                      <button type="button" onClick={() => handleCopy(staff.email, 'Email')} className="inline-flex items-center rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition" aria-label="Copy email" title="Copy email">
                        <FiCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <FiPhone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs text-gray-500">Phone</p>
                    <div className="flex items-center gap-2">
                      <a href={staff.phone ? `tel:${staff.phone}` : undefined} className="text-gray-900 hover:underline">{staff.phone || 'Not provided'}</a>
                      {staff.phone && (
                        <button type="button" onClick={() => handleCopy(staff.phone, 'Phone')} className="inline-flex items-center rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition" aria-label="Copy phone" title="Copy phone">
                          <FiCopy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department */}
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500">Department</p>
                  <p className="text-gray-900">{staff.department || 'Not specified'}</p>
                </div>

                {/* Position */}
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500">Position</p>
                  <p className="text-gray-900">{staff.position || 'Not specified'}</p>
                </div>

                {/* Join Date */}
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500">Join Date</p>
                  <p className="text-gray-900">{formatDateOnly(staff.date_joined)}</p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      staff.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button type="button" onClick={handleToggleActive} disabled={isUpdatingStatus} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                      staff.is_active 
                        ? 'border-red-200 text-red-600 hover:border-red-300 hover:text-red-700' 
                        : 'border-green-200 text-green-600 hover:border-green-300 hover:text-green-700'
                    } ${isUpdatingStatus ? 'opacity-60 cursor-not-allowed' : ''}`} title={staff.is_active ? 'Deactivate' : 'Activate'} aria-label={staff.is_active ? 'Deactivate staff' : 'Activate staff'}>
                      <FiPower className="h-3.5 w-3.5" />
                      {staff.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Staff Permissions */}
      <Card className="sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Staff Permissions</h3>
        </div>
        <div className="space-y-4">
          {staff ? (
            <StaffPermissions
              permissions={staff.permissions || {}}
              onPermissionsChange={handlePermissionsChange}
              isEditable={true}
              isAdmin={staff.role === 'pg_admin' || staff.is_superuser}
              isSaving={isUpdatingPermissions}
            />
          ) : (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activities for this staff */}
      {staff && (
        <div>
          {/* <RecentActivitiesCard
            userId={staff.id}
            title={`Recent activity for ${staff.full_name || 'Staff'}`}
            maxItems={55}
            modules={['building','floor','room','bed','tenant','booking','invoice','payment']}
            debug={true}
          /> */}

          <div className="p-6">
            <h1 className="text-lg font-semibold">Recent Activities for this staff</h1>
            <p className="text-gray-500">coming soon...</p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Member"
      >
        <div className="mt-4">
          <StaffForm
            staffData={staff}
            editMode={true}
            onSuccess={handleUpdateSuccess}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default StaffDetails;