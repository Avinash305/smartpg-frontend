import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SortableTable } from '../ui/SortableTable';
import { Input } from '../ui/Input';
import Select from '../ui/Select';
import Pagination from '../ui/Paginations';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import staffService from '../../services/staff';
import { getBuildings } from '../../services/properties';
import { formatDateOnly, formatDateTime } from '../../utils/dateUtils';

const StaffsList = ({ staffs: staffsProp = [], loading, onStaffUpdate }) => {
  // Debug log for incoming props
  console.log('StaffsList - props:', { staffs: staffsProp, loading });
  
  // Ensure staffs is always an array
  const staffs = Array.isArray(staffsProp) ? staffsProp : [];
  console.log('StaffsList - processed staffs:', staffs);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [buildingFilter, setBuildingFilter] = useState([]); // from Navbar
  const [buildingsMap, setBuildingsMap] = useState({}); // id -> name

  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  const handleDelete = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffService.deleteStaff(staffId);
        toast.success('Staff member deleted successfully');
        onStaffUpdate(); // Trigger refresh in parent
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast.error('Failed to delete staff member');
      }
    }
  };

  // Get unique roles from staff data for the filter dropdown
  const availableRoles = useMemo(() => {
    const roles = new Set();
    staffs.forEach(staff => {
      if (staff?.role) {
        roles.add(staff.role);
      }
    });
    
    // Convert to array of options
    return Array.from(roles).map(role => ({
      value: role,
      label: role.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));
  }, [staffs]);

  const clearFilters = () => {
    setStatusFilter('all');
    setRoleFilter('all');
  };

  const activeFilterCount = (() => {
    let c = 0;
    if (statusFilter !== 'all') c += 1;
    if (roleFilter !== 'all') c += 1;
    return c;
  })();

  // Navbar building filter subscription
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter');
      const arr = raw ? JSON.parse(raw) : [];
      setBuildingFilter(Array.isArray(arr) ? arr.map(String) : []);
    } catch {}
    const handler = (e) => {
      const arr = (e?.detail?.selected || []).map(String);
      setBuildingFilter(arr);
    };
    window.addEventListener('building-filter-change', handler);
    return () => window.removeEventListener('building-filter-change', handler);
  }, []);

  // Load buildings once for name mapping
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getBuildings({ page_size: 1000 });
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!alive) return;
        const map = {};
        list.forEach(b => { if (b?.id != null) map[String(b.id)] = b.name || `Building ${b.id}`; });
        setBuildingsMap(map);
      } catch (e) {
        console.error('Failed to load buildings', e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Helper: derive assigned building IDs for a staff from permissions JSON
  const getAssignedBuildingIds = (staff) => {
    const out = [];
    const perms = staff?.permissions || {};
    if (!perms || typeof perms !== 'object') return out;

    // permissions shape (from StaffPermissions.jsx):
    // {
    //   [buildingId]: {
    //     buildings: { view, add, edit, delete },
    //     floors: { ... },
    //     ...
    //   },
    //   ...
    // }
    for (const [buildingId, models] of Object.entries(perms)) {
      if (!models || typeof models !== 'object') continue;
      const bKey = String(buildingId);
      const bModel = models.buildings;

      // Primary rule: assigned if can view buildings in that scope
      const hasBuildingsView = !!(bModel && bModel.view);

      // Fallback: treat as assigned if any model has any permission true
      let hasAnyPerm = false;
      if (!hasBuildingsView) {
        for (const m of Object.values(models)) {
          if (m && typeof m === 'object' && Object.values(m).some(Boolean)) {
            hasAnyPerm = true;
            break;
          }
        }
      }

      if (hasBuildingsView || hasAnyPerm) out.push(bKey);
    }

    return out;
  };

  // Prepare display text for assigned buildings
  const getAssignedBuildingsLabel = (staff) => {
    const ids = getAssignedBuildingIds(staff);
    if (ids.length === 0) return '—';
    const names = ids.map((id) => buildingsMap[String(id)] || `#${id}`);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  const filteredStaffs = useMemo(() => {
    if (!Array.isArray(staffs)) {
      console.warn('Staffs is not an array:', staffs);
      return [];
    }
    const selected = (buildingFilter || []).map(String);
    
    return staffs.filter(staff => {
      if (!staff) return false;

      // Exclude self (current logged-in user)
      const isSelf = (
        (currentUser?.id != null && String(staff.id) === String(currentUser.id)) ||
        (currentUser?.email && staff.email && String(staff.email).toLowerCase() === String(currentUser.email).toLowerCase())
      );
      if (isSelf) return false;
      
      // Use full_name for search (matches backend serializer)
      const fullName = (staff.full_name || '').trim().toLowerCase();
      const email = staff.email?.toLowerCase() || '';

      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase());
        
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' ? staff.is_active : !staff.is_active);
        
      // Role filter - compare lowercase to make it case-insensitive
      const matchesRole = roleFilter === 'all' || 
        staff.role?.toLowerCase() === roleFilter.toLowerCase();

      // Building filter from navbar: staff must have at least one assigned building in selection
      let matchesBuilding = true;
      if (selected.length > 0) {
        const assigned = getAssignedBuildingIds(staff).map(String);
        matchesBuilding = assigned.some((id) => selected.includes(id));
      }

      return matchesSearch && matchesStatus && matchesRole && matchesBuilding;
    });
  }, [staffs, searchTerm, statusFilter, roleFilter, buildingFilter, currentUser]);

  const sortedStaffs = useMemo(() => {
    const sortableItems = [...filteredStaffs];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (!a || !b) return 0;
        
        // Special handling for name sorting
        let aValue, bValue;
        
        if (sortConfig.key === 'name') {
          aValue = (a.full_name || '').trim().toLowerCase();
          bValue = (b.full_name || '').trim().toLowerCase();
        } else if (sortConfig.key === 'assigned_buildings') {
          aValue = getAssignedBuildingsLabel(a);
          bValue = getAssignedBuildingsLabel(b);
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }
        
        // Convert to string for comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredStaffs, sortConfig]);

  // Reset to first page when filters/sort/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, sortConfig]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterOpen]);

  // Pagination
  const totalPages = Math.ceil(sortedStaffs.length / itemsPerPage);
  const paginatedStaffs = sortedStaffs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Clamp currentPage if data size shrinks (e.g., after delete/filter)
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Debug: trace pagination values
  useEffect(() => {
    console.log('[StaffsList] itemsPerPage:', itemsPerPage, 'currentPage:', currentPage, 'sorted:', sortedStaffs.length, 'paginated:', paginatedStaffs.length, 'totalPages:', totalPages);
  }, [itemsPerPage, currentPage, sortedStaffs.length, paginatedStaffs.length, totalPages]);

  const columns = [
    { 
      key: 'email', 
      Header: 'Email', 
      sortable: true,
      accessor: 'email',
      Cell: ({ value, row }) => {
        // Safely get the staff ID
        const staffId = row?.id;
        
        // If no ID is found, just render the email without navigation
        if (!staffId) {
          return <span className="text-gray-700 text-xs sm:text-sm">{value || 'N/A'}</span>;
        }
        
        return (
          <button 
            onClick={() => navigate(`/staffs/${staffId}`)}
            className="text-black hover:text-blue-800 hover:underline hover:scale-105 font-bold text-left text-xs sm:text-sm cursor-pointer"
          >
            {value || 'N/A'}
          </button>
        );
      }
    },
    { 
      key: 'name',
      Header: 'Name',
      sortable: true,
      accessor: 'full_name',
      Cell: ({ value }) => (
        <span className="font-medium text-gray-800">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'assigned_buildings',
      Header: 'Assigned Buildings',
      sortable: true,
      accessor: (row) => getAssignedBuildingsLabel(row),
      Cell: ({ value }) => (
        <span className="text-gray-700 text-xs sm:text-sm">{value}</span>
      )
    },
    { 
      key: 'status', 
      Header: 'Status', 
      sortable: true,
      accessor: 'is_active',
      Cell: ({ value }) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold leading-4 whitespace-nowrap ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'date_joined', 
      Header: 'Join Date', 
      sortable: true,
      accessor: 'date_joined',
      Cell: ({ value }) => (
        <span className="text-xs sm:text-sm text-gray-600">
          {formatDateOnly(value)}
        </span>
      )
    },
     { 
      key: 'last_login', 
      Header: 'Last Login', 
      sortable: true,
      accessor: 'last_login',
      Cell: ({ value }) => (
        <span className="text-xs sm:text-sm text-gray-600">
          {value ? formatDateTime(value) : 'Never'}
        </span>
      )
    }
  ];


  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4 relative">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <Button variant="outline" onClick={() => setFilterOpen(v => !v)}>
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>

        {filterOpen && (
          <div ref={filterRef} className="absolute right-0 top-full mt-2 z-20 w-full sm:w-[520px] bg-white border border-gray-200 rounded-md shadow-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Role</label>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    ...availableRoles
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
              <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <SortableTable
          columns={columns}
          data={paginatedStaffs}
          sortBy={sortConfig.key}
          order={sortConfig.direction}
          onSort={handleSort}
          loading={loading}
          noDataText="No staff members found"
          rowKey="id"
        />
      </div>

      <div className="flex justify-end mt-3 sm:mt-4">
        <Pagination
          currentPage={currentPage}
          totalItems={sortedStaffs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          maxVisiblePages={5}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1) }}
        />
      </div>
    </div>
  );
};

export default StaffsList;