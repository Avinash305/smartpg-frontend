import React, { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { Button, PermissionButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import TenantForm from '../components/tenants/TenantForm'
import TenantsList from '../components/tenants/TenantsList'
import { useTranslation } from 'react-i18next'
 
const TenantPage = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)

  const openCreate = () => { setEditingTenant(null); setOpen(true) }
  const openEdit = (tenant) => { setEditingTenant(tenant || null); setOpen(true) }
  const closeModal = () => setOpen(false)

  const handleSuccess = () => {
    setOpen(false)
    setEditingTenant(null)
    setRefreshSignal((v) => !v)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('sidebar.tenants')}</h1>
        <PermissionButton
          module="tenants"
          action="add"
          scopeId="global"
          reason={t('tenants.permission_add_deny')}
          denyMessage={t('tenants.permission_add_deny')}
          onClick={openCreate}
        >
          <FiPlus className="mr-2 h-4 w-4" />
          {t('tenants.add_tenant')}
        </PermissionButton>
      </div>

      <TenantsList refreshSignal={refreshSignal} onEdit={openEdit} />

      <Modal isOpen={open} onClose={closeModal} title={editingTenant ? t('tenants.edit_tenant') : t('tenants.add_tenant')} maxWidth="lg">
        <TenantForm tenant={editingTenant} onSuccess={handleSuccess} />
      </Modal>
    </div>
  )
}

export default TenantPage