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

// ==================== VIKASIT NAGPUR ASSETS & ISSUES APIS ====================

export const getAssets = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.department) params.append('department', filters.department);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  const response = await api.get(`/api/assets?${params.toString()}`);
  return response.data;
};

export const getAssetById = async (id) => {
  const response = await api.get(`/api/assets/${id}`);
  return response.data;
};

export const createAsset = async (assetData) => {
  const response = await api.post('/api/assets', assetData);
  return response.data;
};

export const updateAsset = async (id, assetData) => {
  const response = await api.put(`/api/assets/${id}`, assetData);
  return response.data;
};

export const deleteAsset = async (id) => {
  const response = await api.delete(`/api/assets/${id}`);
  return response.data;
};

export const getIssues = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.department) params.append('department', filters.department);
  if (filters.asset_id) params.append('asset_id', filters.asset_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  const response = await api.get(`/api/issues?${params.toString()}`);
  return response.data;
};

export const getIssueById = async (id) => {
  const response = await api.get(`/api/issues/${id}`);
  return response.data;
};

export const createIssue = async (issueData) => {
  const response = await api.post('/api/issues', issueData);
  return response.data;
};

export const updateIssue = async (id, issueData) => {
  const response = await api.put(`/api/issues/${id}`, issueData);
  return response.data;
};

export const updateIssueStatus = async (id, status, notes = '') => {
  const response = await api.patch(`/api/issues/${id}/status`, { status, notes });
  return response.data;
};

export const getIssueStats = async () => {
  const response = await api.get('/api/issues/stats/summary');
  return response.data;
};

export const deleteIssue = async (id) => {
  const response = await api.delete(`/api/issues/${id}`);
  return response.data;
};

// --- RFID Maintenance Worker Tracking APIs ---

export const scanRFID = async (scanData) => {
  const response = await api.post('/api/rfid/scan', scanData);
  return response.data;
};

export const getMaintenanceTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.worker_id) params.append('worker_id', filters.worker_id);
  if (filters.asset_id) params.append('asset_id', filters.asset_id);
  if (filters.limit) params.append('limit', filters.limit);
  const response = await api.get(`/api/rfid/tasks?${params.toString()}`);
  return response.data;
};

export const getWorkers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.department) params.append('department', filters.department);
  const response = await api.get(`/api/rfid/workers?${params.toString()}`);
  return response.data;
};

export const registerWorker = async (workerData) => {
  const response = await api.post('/api/rfid/workers', workerData);
  return response.data;
};

export const getRFIDStats = async () => {
  const response = await api.get('/api/rfid/stats');
  return response.data;
};

export const verifyMaintenanceTask = async (taskId, actionData) => {
  const response = await api.post(`/api/rfid/tasks/${taskId}/verify`, actionData);
  return response.data;
};

export const uploadMaintenanceProof = async (taskId, formData) => {
  const response = await api.post(`/api/rfid/tasks/${taskId}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// --- Generic ESP32 IoT Telemetry APIs ---

export const sendIoTTelemetry = async (telemetryData) => {
  const response = await api.post('/api/iot/telemetry', telemetryData);
  return response.data;
};

export const getIoTTelemetry = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.device_type) params.append('device_type', filters.device_type);
  if (filters.asset_id) params.append('asset_id', filters.asset_id);
  if (filters.is_anomaly !== undefined) params.append('is_anomaly', filters.is_anomaly);
  if (filters.limit) params.append('limit', filters.limit);
  const response = await api.get(`/api/iot/telemetry?${params.toString()}`);
  return response.data;
};

export const getIoTStats = async () => {
  const response = await api.get('/api/iot/stats');
  return response.data;
};

// --- Multi-Agency Construction Coordination APIs ---

export const getConstructionProjects = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.work_type) params.append('work_type', filters.work_type);
  if (filters.agency_id) params.append('agency_id', filters.agency_id);
  if (filters.contractor_id) params.append('contractor_id', filters.contractor_id);
  if (filters.search) params.append('search', filters.search);
  const response = await api.get(`/api/construction/projects?${params.toString()}`);
  return response.data;
};

export const getConstructionProjectById = async (id) => {
  const response = await api.get(`/api/construction/projects/${id}`);
  return response.data;
};

export const createConstructionProject = async (projectData) => {
  const response = await api.post('/api/construction/projects', projectData);
  return response.data;
};

export const updateConstructionProject = async (id, updateData) => {
  const response = await api.put(`/api/construction/projects/${id}`, updateData);
  return response.data;
};

export const getConstructionConflicts = async () => {
  const response = await api.get('/api/construction/conflicts');
  return response.data;
};

export const getConstructionAgencies = async () => {
  const response = await api.get('/api/construction/agencies');
  return response.data;
};

export const createConstructionAgency = async (agencyData) => {
  const response = await api.post('/api/construction/agencies', agencyData);
  return response.data;
};

export const getConstructionContractors = async () => {
  const response = await api.get('/api/construction/contractors');
  return response.data;
};

export const createConstructionContractor = async (contractorData) => {
  const response = await api.post('/api/construction/contractors', contractorData);
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
