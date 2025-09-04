import React, { useEffect, useMemo, useState } from 'react';
import { getBuildings } from '../../services/properties';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';

// Models to manage permissions for (extend as needed)
const MODEL_DEFS = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'floors', label: 'Floors' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'beds', label: 'Beds' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'payments', label: 'Payments' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'expenses', label: 'Expenses' },
];

const PERM_KEYS = ['view', 'add', 'edit', 'delete'];

// Dependency rules between modules (child -> required parents)
const MODULE_DEPENDENCIES = {
  buildings: [],
  floors: ['buildings'],
  rooms: ['floors', 'buildings'],
  beds: ['rooms', 'floors', 'buildings'],
  tenants: ['buildings'],
  bookings: ['buildings'],
  payments: ['buildings'],
  invoices: ['buildings'],
  expenses: ['buildings'],
};

// Build reverse dependency map (parent -> children)
const MODULE_CHILDREN = Object.entries(MODULE_DEPENDENCIES).reduce((acc, [child, parents]) => {
  parents.forEach((p) => {
    acc[p] = acc[p] || [];
    acc[p].push(child);
  });
  return acc;
}, {});

const hasAnyPerm = (row) => !!row && (row.view || row.add || row.edit || row.delete);

// Ensure parents' 'view' are true for any module that has any permission
const ensureParentsView = (perms, buildingId, moduleKey) => {
  const parents = MODULE_DEPENDENCIES[moduleKey] || [];
  parents.forEach((p) => {
    if (!perms[buildingId][p]) perms[buildingId][p] = { view: false, add: false, edit: false, delete: false };
    perms[buildingId][p].view = true;
    // Recurse upward to ensure full chain
    ensureParentsView(perms, buildingId, p);
  });
};

// When a parent's 'view' is false, clear all child permissions recursively
const clearChildrenCascade = (perms, buildingId, parentKey) => {
  const children = MODULE_CHILDREN[parentKey] || [];
  children.forEach((child) => {
    if (perms[buildingId][child]) {
      perms[buildingId][child] = { view: false, add: false, edit: false, delete: false };
      clearChildrenCascade(perms, buildingId, child);
    }
  });
};

// Normalize the entire permission matrix for a building
const normalizeDependencies = (perms, buildingId) => {
  // Upward pass: for any module that has any permission, ensure parents' view are true
  for (const m of MODEL_DEFS) {
    const row = perms[buildingId][m.key];
    if (hasAnyPerm(row)) ensureParentsView(perms, buildingId, m.key);
  }
  // Downward pass: if a parent's view is false, clear all children's perms
  for (const parent of Object.keys(MODULE_CHILDREN)) {
    const prow = perms[buildingId][parent];
    if (prow && !prow.view) clearChildrenCascade(perms, buildingId, parent);
  }
  return perms;
};

function ensureBuildingPermStruct(perms, buildingId) {
  const next = { ...(perms || {}) };
  if (!next[buildingId]) next[buildingId] = {};
  for (const m of MODEL_DEFS) {
    if (!next[buildingId][m.key]) {
      next[buildingId][m.key] = { view: false, add: false, edit: false, delete: false };
    } else {
      // Ensure all keys exist if shape changed over time
      for (const k of PERM_KEYS) {
        if (typeof next[buildingId][m.key][k] !== 'boolean') next[buildingId][m.key][k] = false;
      }
    }
  }
  return next;
}

const Toggle = ({ checked, onChange, disabled, className = '' }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={
      `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ` +
      (disabled ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer ') +
      (checked ? 'bg-blue-600' : 'bg-gray-300') +
      (className ? ` ${className}` : '')
    }
    aria-pressed={checked}
  >
    <span
      className={
        `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ` +
        (checked ? 'translate-x-4' : 'translate-x-1')
      }
    />
  </button>
);

const HeaderCell = ({ children }) => (
  <div className="text-[11px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider flex items-center gap-1">{children}</div>
);

const Cell = ({ children }) => (
  <div className="py-2">{children}</div>
);

const StaffPermissions = ({
  permissions = {},
  onPermissionsChange,
  isEditable = true,
  isSaving = false,
}) => {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [localPerms, setLocalPerms] = useState(permissions || {});
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLocalPerms(permissions || {});
  }, [permissions]);

  useEffect(() => {
    const load = async () => {
      setIsLoadingBuildings(true);
      try {
        const data = await getBuildings({ page_size: 1000 });
        const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setBuildings(results);
        if (results.length && !selectedBuildingId) {
          setSelectedBuildingId(String(results[0].id));
        }
      } catch (e) {
        // silently fail; UI will show no buildings
      } finally {
        setIsLoadingBuildings(false);
      }
    };
    load();
  }, []);

  const buildingOptions = useMemo(() => (
    buildings.map(b => ({ value: String(b.id), label: b.name }))
  ), [buildings]);

  const effectivePerms = useMemo(() => {
    if (!selectedBuildingId) return {};
    return ensureBuildingPermStruct(localPerms, selectedBuildingId);
  }, [localPerms, selectedBuildingId]);

  const currentBuildingPerms = selectedBuildingId ? effectivePerms[selectedBuildingId] : {};

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MODEL_DEFS;
    return MODEL_DEFS.filter(m => m.label.toLowerCase().includes(term));
  }, [search]);

  const emitChange = (next) => {
    setLocalPerms(next);
    onPermissionsChange && onPermissionsChange(next);
  };

  const handleToggle = (modelKey, permKey, value) => {
    if (!selectedBuildingId) return;
    const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
    next[selectedBuildingId][modelKey][permKey] = value;
    // If enabling any perm, ensure parent 'view' chain
    if (value) {
      ensureParentsView(next, selectedBuildingId, modelKey);
    }
    // If disabling view on a parent, clear children
    if (!value && permKey === 'view') {
      clearChildrenCascade(next, selectedBuildingId, modelKey);
    }
    normalizeDependencies(next, selectedBuildingId);
    emitChange(next);
  };

  const handleToggleAllForModel = (modelKey, value) => {
    if (!selectedBuildingId) return;
    const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
    for (const k of PERM_KEYS) next[selectedBuildingId][modelKey][k] = value;
    if (value) ensureParentsView(next, selectedBuildingId, modelKey);
    if (!value) clearChildrenCascade(next, selectedBuildingId, modelKey);
    normalizeDependencies(next, selectedBuildingId);
    emitChange(next);
  };

  const handleToggleColumn = (permKey, value) => {
    if (!selectedBuildingId) return;
    const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
    for (const m of MODEL_DEFS) {
      next[selectedBuildingId][m.key][permKey] = value;
    }
    if (value) {
      // ensure parents for all modules that now have any perms
      for (const m of MODEL_DEFS) if (hasAnyPerm(next[selectedBuildingId][m.key])) ensureParentsView(next, selectedBuildingId, m.key);
    } else if (permKey === 'view') {
      // clearing all views -> clear all children cascades starting from top-level parents
      clearChildrenCascade(next, selectedBuildingId, 'buildings');
      clearChildrenCascade(next, selectedBuildingId, 'floors');
      clearChildrenCascade(next, selectedBuildingId, 'rooms');
    }
    normalizeDependencies(next, selectedBuildingId);
    emitChange(next);
  };

  const handleToggleAllRows = (value) => {
    if (!selectedBuildingId) return;
    const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
    for (const m of MODEL_DEFS) {
      for (const k of PERM_KEYS) next[selectedBuildingId][m.key][k] = value;
    }
    if (!value) {
      // fully clear: ensure no dangling parents left on
      clearChildrenCascade(next, selectedBuildingId, 'buildings');
    }
    normalizeDependencies(next, selectedBuildingId);
    emitChange(next);
  };

  const isAllCheckedForModel = (modelKey) => {
    const m = currentBuildingPerms?.[modelKey];
    if (!m) return false;
    return PERM_KEYS.every(k => !!m[k]);
  };

  const isColumnAllChecked = (permKey) => {
    return MODEL_DEFS.every(m => currentBuildingPerms?.[m.key]?.[permKey]);
  };

  const switchClass = 'transform scale-90 sm:scale-100';

  const modelRoleFor = (row) => {
    const v = !!row?.view;
    const a = !!row?.add;
    const e = !!row?.edit;
    const d = !!row?.delete;
    if (!v && !a && !e && !d) return { label: 'None', cls: 'text-gray-600 bg-gray-100 border-gray-200' };
    if (v && a && e && d) return { label: 'Admin', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (v && a && e && !d) return { label: 'Manager', cls: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (v && !a && !e && !d) return { label: 'Read-only', cls: 'text-slate-700 bg-slate-50 border-slate-200' };
    return { label: 'Custom', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  };

  return (
    <div className="space-y-4">
      {/* Building Selector */}
      <div className="flex flex-col px-2 gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs sm:text-sm text-gray-700 min-w-[90px]">Building</label>
          <div className="flex-1">
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              disabled={isLoadingBuildings || !isEditable || isSaving}
            >
              {isLoadingBuildings && <option>Loading...</option>}
              {!isLoadingBuildings && buildingOptions.length === 0 && (
                <option value="">No buildings</option>
              )}
              {buildingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full border rounded px-2 py-1 text-sm"
            disabled={!isEditable && !selectedBuildingId}
          />
        </div>
      </div>

      {/* Quick Actions */}
      {selectedBuildingId && (
        <div className="flex flex-col px-2 gap-2">
          <div className="flex flex-nowrap items-center gap-2">
            <span className="text-[10px] sm:text-xs text-gray-500">Presets:</span>
            <button
              type="button"
              className="text-[11px] sm:text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
              onClick={() => {
                if (!selectedBuildingId) return;
                const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
                for (const m of MODEL_DEFS) {
                  next[selectedBuildingId][m.key] = { view: true, add: false, edit: false, delete: false };
                }
                emitChange(next);
              }}
              disabled={!isEditable || isSaving}
            >Read-only</button>
            <button
              type="button"
              className="text-[11px] sm:text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
              onClick={() => {
                if (!selectedBuildingId) return;
                const next = ensureBuildingPermStruct(localPerms, selectedBuildingId);
                for (const m of MODEL_DEFS) {
                  next[selectedBuildingId][m.key] = { view: true, add: true, edit: true, delete: false };
                }
                emitChange(next);
              }}
              disabled={!isEditable || isSaving}
            >Manager</button>
            <button
              type="button"
              className="text-[11px] sm:text-xs px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
              onClick={() => handleToggleAllRows(true)}
              disabled={!isEditable || isSaving}
            >Admin (all)</button> 
          </div>
          <span className="text-[11px] sm:text-sm text-black block sm:hidden">Toggle column:</span>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="text-[11px] sm:text-sm text-black hidden sm:block">Toggle column:</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-gray-600">All</span>
              <Toggle className={switchClass} checked={MODEL_DEFS.every(m => isAllCheckedForModel(m.key))} onChange={handleToggleAllRows} disabled={!isEditable || isSaving} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
              <Toggle className={switchClass} checked={isColumnAllChecked('view')} onChange={(v) => handleToggleColumn('view', v)} disabled={!isEditable || isSaving} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</span>
              <Toggle className={switchClass} checked={isColumnAllChecked('add')} onChange={(v) => handleToggleColumn('add', v)} disabled={!isEditable || isSaving} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</span>
              <Toggle className={switchClass} checked={isColumnAllChecked('edit')} onChange={(v) => handleToggleColumn('edit', v)} disabled={!isEditable || isSaving} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</span>
              <Toggle className={switchClass} checked={isColumnAllChecked('delete')} onChange={(v) => handleToggleColumn('delete', v)} disabled={!isEditable || isSaving} />
            </div>
          </div>
        </div>
      )}
      {/* Permissions Grid */}
      {selectedBuildingId ? (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-gray-50/80 border-b sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60">
            <HeaderCell>Model</HeaderCell>
            <HeaderCell>All</HeaderCell>
            <HeaderCell><span className="inline-flex items-center gap-1" title="View"><Eye className="w-3.5 h-3.5" /> View</span></HeaderCell>
            <HeaderCell><span className="inline-flex items-center gap-1" title="Add"><Plus className="w-3.5 h-3.5" /> Add</span></HeaderCell>
            <HeaderCell><span className="inline-flex items-center gap-1" title="Edit"><Pencil className="w-3.5 h-3.5" /> Edit</span></HeaderCell>
            <HeaderCell><span className="inline-flex items-center gap-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /> Delete</span></HeaderCell>
          </div>

          {filteredModels.map((m, idx) => {
            const row = currentBuildingPerms?.[m.key] || { view: false, add: false, edit: false, delete: false };
            const rowEnabled = row.view || row.add || row.edit || row.delete;
            return (
              <div key={m.key} className={`grid grid-cols-6 gap-2 px-3 py-2 border-b last:border-b-0 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50/40 transition-colors`}>
                <Cell>
                  <div className="text-xs sm:text-sm text-gray-800 flex items-center gap-2">
                    <span>{m.label}</span>
                    {modelRoleFor(row).label !== 'None' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${modelRoleFor(row).cls}`}>{modelRoleFor(row).label}</span>
                    )}
                  </div>
                </Cell>
                <Cell>
                  <Toggle className={switchClass}
                    checked={isAllCheckedForModel(m.key)}
                    onChange={(v) => handleToggleAllForModel(m.key, v)}
                    disabled={!isEditable || isSaving}
                  />
                </Cell>
                <Cell>
                  <Toggle className={switchClass}
                    checked={!!row.view}
                    onChange={(v) => handleToggle(m.key, 'view', v)}
                    disabled={!isEditable || isSaving}
                  />
                </Cell>
                <Cell>
                  <Toggle className={switchClass}
                    checked={!!row.add}
                    onChange={(v) => handleToggle(m.key, 'add', v)}
                    disabled={!isEditable || isSaving}
                  />
                </Cell>
                <Cell>
                  <Toggle className={switchClass}
                    checked={!!row.edit}
                    onChange={(v) => handleToggle(m.key, 'edit', v)}
                    disabled={!isEditable || isSaving}
                  />
                </Cell>
                <Cell>
                  <Toggle className={switchClass}
                    checked={!!row.delete}
                    onChange={(v) => handleToggle(m.key, 'delete', v)}
                    disabled={!isEditable || isSaving}
                  />
                </Cell>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs sm:text-sm text-gray-500">Select a building to manage permissions.</div>
      )}

      <div className="text-[11px] sm:text-xs text-gray-500 flex items-center gap-2">
        <span>Changes are saved immediately per toggle.</span>
        {isSaving && <span className="text-blue-600">Saving...</span>}
      </div>
    </div>
  );
};

export default StaffPermissions;