import React, { useState, useEffect, useCallback } from 'react';
import StaffsList from '../components/staffs/StaffsList';
import StaffForm from '../components/staffs/StaffForm';
import staffService from '../services/staff';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const StaffPage = () => {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { addToast } = useToast();

  const fetchStaffs = useCallback(async () => {
    try {
      setLoading(true);
      if (!isAuthenticated || !currentUser) {
        addToast({ type: 'error', message: 'Please log in to view staff members' });
        return;
      }

      const response = await staffService.getAllStaff();
      const staffData = response?.data || [];
      const staffArray = Array.isArray(staffData) ? staffData : [];
      setStaffs(staffArray);
    } catch (error) {
      console.error('Error fetching staff:', error);
      addToast({ type: 'error', message: 'Failed to fetch staff members' });
      setStaffs([]);
      
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false); 
    }
  }, [isAuthenticated, currentUser, addToast, logout]);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs, refreshTrigger]);

  const handleStaffAdded = (response) => {
    if (!response || typeof response !== 'object') {
      addToast({ type: 'error', message: 'No valid response received from server' });
      return;
    }
    
    if (response?.success) {
      addToast({ type: 'success', message: 'Staff member added successfully' });
      setIsAddModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
    } else {
      const errorMessage = response?.error || 'Failed to add staff member';
      addToast({ type: 'error', message: errorMessage });
    }
  };

  const handleStaffUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
        {(currentUser?.role === 'pg_admin' || currentUser?.is_superuser) && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
          >
            + Add Staff
          </Button>
        )}
      </div>

      <StaffsList 
        staffs={staffs} 
        loading={loading} 
        onStaffUpdate={handleStaffUpdate} 
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Staff Member"
      >
        <StaffForm 
          onSuccess={handleStaffAdded}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default StaffPage;