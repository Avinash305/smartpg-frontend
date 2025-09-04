import apiClient from './api';

// Safe logger that redacts sensitive fields in dev
const safeLog = (label, obj) => {
  if (import.meta?.env?.DEV) {
    const redacted = { ...(obj || {}) };
    if ('password' in redacted) redacted.password = '***';
    if ('password2' in redacted) redacted.password2 = '***';
    console.debug(label, redacted);
  }
};

// Helper function for consistent error handling
const handleApiError = (error) => {
  if (error.response) {
    const { data, status } = error.response;
    
    // Handle validation errors (400/422)
    if (status === 400 || status === 422) {
      // Prefer field-level errors. DRF commonly returns them at top-level.
      const fieldErrors = data?.errors || data || {};

      // Extract a user-friendly message
      const primaryMessage =
        data?.detail ||
        (Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : data?.non_field_errors) ||
        (Array.isArray(data?.email) ? data.email[0] : data?.email) ||
        'Validation failed';

      return {
        success: false,
        error: primaryMessage,
        validationErrors: fieldErrors,
        status
      };
    }
    
    // Handle 403 Forbidden
    if (status === 403) {
      return {
        success: false,
        error: data.detail || 'You do not have permission to perform this action',
        status
      };
    }

    // Handle 401 Unauthorized
    if (status === 401) {
      return {
        success: false,
        error: data?.detail || 'Authentication required. Please log in again.',
        status
      };
    }
    
    // Handle other error responses
    return {
      success: false,
      error: data.detail || data.message || 'Request failed',
      status
    };
  }
  
  // Handle network errors or other issues
  return {
    success: false,
    error: error.message || 'Network error. Please check your connection.'
  };
};

const staffService = {
  /**
   * Get staff members with optional pagination and filters
   * @param {Object} options - Options object
   * @param {string} [options.endpoint='users/'] - API endpoint to use
   * @param {Object} [options.params={}] - Query parameters for filtering/pagination
   * @returns {Promise<Object>} - Staff list and pagination info or single staff member
   */
  async getAllStaff({ endpoint = 'users/', params = {} } = {}) {
    try {
      const response = await apiClient.get(endpoint, { params });
      return { 
        success: true, 
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get a single staff member by ID
   * @param {string|number} id - Staff ID
   * @returns {Promise<Object>} - Staff details
   */
  async getStaffById(id) {
    try {
      const response = await apiClient.get(`users/${id}/`);
      return { 
        success: true, 
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Create a new staff member
   * @param {Object} staffData - Staff data for creation
   * @returns {Promise<Object>} - Creation response
   */
  async createStaff(staffData) {
    safeLog('Creating staff with data:', staffData);
    
    try {
      const response = await apiClient.post('users/', staffData);
      return { 
        success: true, 
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update an existing staff member
   * @param {string|number} id - Staff ID
   * @param {Object} staffData - Updated staff data
   * @returns {Promise<Object>} - Update response
   */
  async updateStaff(id, staffData) {
    safeLog('Updating staff with data:', staffData);
    
    // Don't send password if it's empty (for updates where password isn't being changed)
    const payload = { ...staffData };
    if (payload.password === '') {
      delete payload.password;
      delete payload.password2;
    }

    try {
      // Detect if we need multipart (any File present)
      const hasFile = (payload && (payload.profile_picture instanceof File));

      let response;
      if (hasFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'object') {
            // Serialize non-file objects (e.g., permissions) to JSON string if needed
            // For primitives, just append directly
            try {
              // Avoid serializing FileList or other file-like
              if (value && typeof value.append === 'function') return;
              formData.append(key, JSON.stringify(value));
            } catch {
              formData.append(key, String(value));
            }
          } else {
            formData.append(key, value);
          }
        });
        response = await apiClient.patch(`users/${id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await apiClient.patch(`users/${id}/`, payload);
      }
      return { 
        success: true, 
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Delete a staff member
   * @param {string|number} id - Staff ID
   * @returns {Promise<Object>} - Deletion response
   */
  async deleteStaff(id) {
    try {
      await apiClient.delete(`users/${id}/`);
      return { 
        success: true,
        status: 204 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update staff status (active/inactive)
   * @param {string|number} id - Staff ID
   * @param {boolean} isActive - New status
   * @returns {Promise<Object>} - Status update response
   */
  async updateStaffStatus(id, isActive) {
    try {
      const response = await apiClient.patch(`users/${id}/`, { 
        is_active: isActive 
      });
      return { 
        success: true, 
        data: response.data,
        status: response.status 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update staff permissions JSON
   * @param {string|number} id - Staff ID
   * @param {Object} permissions - Permissions object to set on user
   * @returns {Promise<Object>} - Update response
   */
  async updateStaffPermissions(id, permissions) {
    try {
      const response = await apiClient.patch(`users/${id}/`, { permissions });
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default staffService;