import apiClient from './api';

const authService = {
  /**
   * Login user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} - User data and tokens
   */
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/token/', {
        email,
        password,
      });

      if (response.data.access) {
        localStorage.setItem('access', response.data.access);
        if (response.data.refresh) localStorage.setItem('refresh', response.data.refresh);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration response
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register/', userData);
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // If we have a response from the server, use its data
      if (error.response) {
        const { data, status } = error.response;
        
        // Handle validation errors (400/422)
        if (status === 400 || status === 422) {
          return {
            success: false,
            error: 'Validation failed',
            validationErrors: data || {}
          };
        }
        
        // Handle other error responses
        return {
          success: false,
          error: data.detail || data.message || 'Registration failed',
          status
        };
      }
      
      // Handle network errors or other issues
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.'
      };
    }
  },

  /**
   * Logout the current user
   */
  logout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
  },

  /**
   * Get current authenticated user
   * @returns {Promise<Object>} - User data
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/users/me/');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('access');
  },

  /**
   * Refresh access token
   * @returns {Promise<string>} - New access token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });

      if (response.data.access) {
        localStorage.setItem('access', response.data.access);
        return response.data.access;
      }

      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      throw error;
    }
  },

  /**
   * Verify user email with OTP code
   * @param {string} email
   * @param {string} code
   * @returns {Promise<Object>} - { detail }
   */
  async verifyEmailOtp(email, code) {
    try {
      const response = await apiClient.post('/auth/verify-email/', { email, code });
      return response.data;
    } catch (error) {
      console.error('Email OTP verification error:', error);
      throw error;
    }
  },

  /**
   * Resend email OTP
   * @param {string} email
   * @returns {Promise<Object>} - { detail }
   */
  async resendEmailOtp(email) {
    try {
      const response = await apiClient.post('/auth/resend-otp/', { email });
      return response.data;
    } catch (error) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  },

  /**
   * Request password reset via OTP (email-based)
   * @param {string} email
   * @returns {Promise<Object>} - { detail }
   */
  async requestPasswordResetOtp(email) {
    try {
      const response = await apiClient.post('/auth/password/forgot/', { email });
      return response.data;
    } catch (error) {
      console.error('Password reset (OTP) request error:', error);
      throw error;
    }
  },

  /**
   * Verify OTP and set new password
   * @param {string} email
   * @param {string} code
   * @param {string} newPassword
   * @returns {Promise<Object>} - { detail }
   */
  async verifyPasswordResetOtp(email, code, newPassword) {
    try {
      const response = await apiClient.post('/auth/password/verify-otp/', {
        email,
        code,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Password reset (OTP) verify error:', error);
      throw error;
    }
  },

  /**
   * Legacy placeholder kept for compatibility; backend now uses OTP.
   */
  async verifyEmail(uid, token) {
    try {
      const response = await apiClient.post('/auth/verify-email/', { uid, token });
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  /**
   * Request password reset
   * @param {string} email - User's email
   * @returns {Promise<Object>} - Reset request response
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/auth/password/reset/', { email });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  },

  /**
   * Reset password with token
   * @param {string} uid - User ID
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset response
   */
  async resetPassword(uid, token, newPassword) {
    try {
      const response = await apiClient.post('/auth/password/reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },
};

export default authService;
