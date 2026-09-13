import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const getPotholes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.authority_id) params.append('authority_id', filters.authority_id);
  if (filters.zone) params.append('zone', filters.zone);
  if (filters.search) params.append('search', filters.search);
  params.append('limit', filters.limit || '100');

  const response = await api.get(`/api/potholes?${params.toString()}`);
  return response.data;
};

export const getPotholeById = async (id) => {
  const response = await api.get(`/api/potholes/${id}`);
  return response.data;
};

export const getPotholeStats = async () => {
  const response = await api.get('/api/potholes/stats/summary');
  return response.data;
};

export const detectImage = async (formData) => {
  const response = await api.post('/api/detect/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const detectVideo = async (formData) => {
  const response = await api.post('/api/detect/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updatePotholeStatus = async (id, status, notes = '', resolutionImageUrl = '') => {
  const response = await api.patch(`/api/potholes/${id}/status`, {
    status,
    resolution_notes: notes,
    resolution_image_url: resolutionImageUrl,
  });
  return response.data;
};

export const uploadResolutionProof = async (id, formData) => {
  const response = await api.post(`/api/potholes/${id}/resolution-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deletePothole = async (id) => {
  const response = await api.delete(`/api/potholes/${id}`);
  return response.data;
};

export const getAuthorities = async () => {
  const response = await api.get('/api/authorities');
  return response.data;
};

export const lookupAuthority = async (lat, lng, roadType = 'URBAN_ROAD') => {
  const response = await api.post(`/api/authorities/lookup?lat=${lat}&lng=${lng}&road_type=${roadType}`);
  return response.data;
};

export const getTickets = async () => {
  const response = await api.get('/api/tickets');
  return response.data;
};

export const getPdfReportUrl = (ticketCode) => {
  return `${API_BASE}/api/tickets/${ticketCode}/download-pdf`;
};

export const getConfigStatus = async () => {
  const response = await api.get('/api/config/status');
  return response.data;
};

export const FALLBACK_ROAD_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%230f172a"/><line x1="320" y1="0" x2="320" y2="480" stroke="%23334155" stroke-width="4" stroke-dasharray="20 15"/><ellipse cx="320" cy="240" rx="100" ry="50" fill="%231e293b" stroke="%23f59e0b" stroke-width="3" stroke-dasharray="6 4"/><ellipse cx="320" cy="240" rx="70" ry="30" fill="%23090d16"/><text x="320" y="330" text-anchor="middle" fill="%2394a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">ROAD DEFECT CAPTURE</text><text x="320" y="355" text-anchor="middle" fill="%2364748b" font-family="system-ui, sans-serif" font-size="11">Municipal Evidence Archive</text></svg>`;

export const getMediaUrl = (url) => {
  if (!url) return FALLBACK_ROAD_IMAGE;
  // Preserve blob: and data: URLs (used by file upload preview, presets, webcam capture)
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  // If URL points to private S3 bucket, map to local upload static route
  if (url.includes('s3.amazonaws.com') && url.includes('/potholes/')) {
    const filename = url.split('/potholes/').pop()?.split('?')[0];
    if (filename) {
      return `${API_BASE}/uploads/${filename}`;
    }
  }

  // Absolute HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative paths: ensure correct leading slash
  return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
};

export default api;
