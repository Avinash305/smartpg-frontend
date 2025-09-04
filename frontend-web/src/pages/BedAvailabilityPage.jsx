import React, { useEffect, useState } from 'react'
import BedAvailabilityCard from '../components/dashboard/BedAvailabilityCard'
import { getBuildings } from '../services/properties'
import { useTranslation } from 'react-i18next'

const BedAvailabilityPage = () => {
  const { t } = useTranslation()
  const [selectedBuildings, setSelectedBuildings] = useState([])
  const [activeBuildingIds, setActiveBuildingIds] = useState([])

  // Restore initial selection from localStorage and subscribe to navbar events
  useEffect(() => {
    try {
      const raw = localStorage.getItem('building_filter')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setSelectedBuildings(arr.map(String))
      }
    } catch {}

    const onChange = (e) => {
      const arr = e?.detail?.selected
      if (Array.isArray(arr)) setSelectedBuildings(arr.map(String))
    }
    window.addEventListener('building-filter-change', onChange)
    return () => window.removeEventListener('building-filter-change', onChange)
  }, [])

  // Fallback to all active buildings when nothing selected
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await getBuildings({ page_size: 1000, is_active: true })
        const list = Array.isArray(res) ? res : (res?.results || [])
        if (!alive) return
        setActiveBuildingIds(list.map((b) => String(b.id)))
      } catch {
        if (alive) setActiveBuildingIds([])
      }
    })()
    return () => { alive = false }
  }, [])

  const effectiveSelectedBuildings = (selectedBuildings?.length ? selectedBuildings : activeBuildingIds)
  const buildingLabel = effectiveSelectedBuildings.length ? effectiveSelectedBuildings.join(', ') : t('common.all', 'All')

  return (
    <div className="px-1 sm:px-2 md:px-4 max-w-screen-2xl mx-auto w-full">
      <BedAvailabilityCard
        selectedBuildings={effectiveSelectedBuildings}
        buildingLabel={buildingLabel}
        className="w-full"
      />
    </div>
  )
}

export default BedAvailabilityPage
