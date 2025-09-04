import React from 'react';
import PropTypes from 'prop-types';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './Table';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

export const SortableTable = ({ 
  columns, 
  data = [], 
  sortBy,
  order = 'asc',
  onSort,
  loading = false,
  rowKey = 'id',
  className = '',
  noDataText = 'No data available',
  onRowClick,
  expandable = false,
  expandedRowKeys = [],
  renderExpanded,
  onRowToggle,
  rowClassName = '',
  cellClassName = '',
  // Theming overrides
  headerClassName,
  headerTextClassName,
  rowHoverClassName,
  ...rest 
}) => {
  const handleSort = (field) => {
    if (!onSort) return;
    const direction = sortBy === field && order === 'asc' ? 'desc' : 'asc';
    onSort(field, direction);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <Table className="min-w-full divide-y divide-gray-200">
          <TableHeader className={headerClassName || "bg-gradient-to-r from-blue-50 to-indigo-50"}>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const isSorted = sortBy === (column.key || column.accessor);
                return (
                  <TableHead 
                    key={column.key || column.accessor}
                    className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap
                      ${headerTextClassName || 'text-indigo-700'}
                      ${column.sortable ? (headerTextClassName ? '' : 'hover:text-indigo-900') + ' cursor-pointer transition-colors' : ''}
                      ${isSorted ? (headerTextClassName ? '' : 'text-indigo-900') : ''}`}
                    onClick={() => column.sortable && handleSort(column.key || column.accessor)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.Header || column.title}</span>
                      {isSorted && (
                        <span className={headerTextClassName || "text-indigo-600"}>
                          {order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-100">
            {data.map((row, rowIndex) => {
              const id = row[rowKey] ?? rowIndex;
              const isExpanded = expandable && (expandedRowKeys || []).includes(id);
              const handleRowClick = () => {
                onRowClick?.(row);
                if (expandable) onRowToggle?.(row, !isExpanded);
              };
               return (
                <React.Fragment key={id}>
                  <TableRow 
                    className={`transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${rowHoverClassName || 'hover:bg-blue-50'} ${onRowClick || expandable ? 'cursor-pointer' : ''} ${rowClassName}`}
                    onClick={handleRowClick}
                  >
                    {columns.map((column) => {
                      const cellKey = `${id}-${String(column.key || column.accessor)}`;
                      return (
                        <TableCell 
                          key={cellKey}
                          className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 ${cellClassName}`}
                        >
                          {(() => {
                            const accessor = column.accessor;
                            const value = typeof accessor === 'function'
                              ? accessor(row)
                              : row[accessor] ?? row[column.key];
                            return column.Cell
                              ? column.Cell({ value, row })
                              : value;
                          })()}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={columns.length} className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                        {renderExpanded ? renderExpanded(row) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
               );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="bg-white p-6 sm:p-8 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading data...</span>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && data.length === 0 && (
        <div className="bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 text-gray-300 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">No data found</h3>
          <p className="text-sm text-gray-500">{noDataText}</p>
        </div>
      )}
    </div>
  );
};

SortableTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      accessor: PropTypes.string,
      Header: PropTypes.node,
      title: PropTypes.node,
      sortable: PropTypes.bool,
      Cell: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  sortBy: PropTypes.string,
  order: PropTypes.oneOf(['asc', 'desc']),
  onSort: PropTypes.func,
  loading: PropTypes.bool,
  rowKey: PropTypes.string,
  className: PropTypes.string,
  noDataText: PropTypes.string,
  onRowClick: PropTypes.func,
  expandable: PropTypes.bool,
  expandedRowKeys: PropTypes.array,
  renderExpanded: PropTypes.func,
  onRowToggle: PropTypes.func,
  rowClassName: PropTypes.string,
  cellClassName: PropTypes.string,
  // Theming overrides
  headerClassName: PropTypes.string,
  headerTextClassName: PropTypes.string,
  rowHoverClassName: PropTypes.string,
};
