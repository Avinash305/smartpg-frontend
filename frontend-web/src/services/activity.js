import apiClient from './api';

const activityService = {
  /**
   * Get recent activities for a staff member
   * @param {string|number} staffId - Staff ID
   * @returns {Promise<{success:boolean, data?:Array, error?:string, status:number}>>}
   */
  async getStaffActivities(staffId) {
    try {
      if (!staffId) {
        return { success: true, data: [], status: 200 };
      }

      // Use backend user activities endpoint
      const response = await apiClient.get(`/users/${staffId}/activities/`);
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : (response.data?.results || []),
        status: response.status || 200,
      };
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        return { success: true, data: [], status: 404 };
      }
      try {
        if (import.meta?.env?.MODE === 'development') {
          const mockActivities = [
            {
              id: 1,
              type: 'login',
              description: 'Logged in to the system',
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            },
          ];
          return { success: true, data: mockActivities, status: 200 };
        }
      } catch (_) {}

      console.error('Error fetching activities:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch activities',
        status: status || 500,
      };
    }
  },
};

export default activityService;
