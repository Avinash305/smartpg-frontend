import apiClient from './api';

export async function getLocalizationSettingsCurrent() {
  const res = await apiClient.get('/localization-settings/current/');
  return res.data;
}

export async function createLocalizationSettings(payload) {
  const res = await apiClient.post('/localization-settings/', payload);
  return res.data;
}

export async function updateLocalizationSettings(id, payload) {
  const res = await apiClient.put(`/localization-settings/${id}/`, payload);
  return res.data;
}
