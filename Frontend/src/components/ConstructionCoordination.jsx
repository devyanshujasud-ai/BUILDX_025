import React, { useState, useEffect } from 'react';
import {
  HardHat,
  AlertTriangle,
  Calendar,
  MapPin,
  Building,
  Briefcase,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Droplets,
  Zap,
  Route,
  Waves,
  Radio,
  Layers,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  getConstructionProjects,
  getConstructionConflicts,
  getConstructionAgencies,
  getConstructionContractors,
  createConstructionProject
} from '../services/api';

const WORK_TYPE_CONFIG = {
  WATER_PIPELINE: { label: 'Water Pipeline', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  ELECTRIC_CABLE: { label: 'Electric Cable', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  ROAD_RESURFACING: { label: 'Road Resurfacing', icon: Route, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  DRAINAGE: { label: 'Drainage & Storm Sewer', icon: Waves, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  TELECOM: { label: 'Telecom & Fiber', icon: Radio, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  OTHER: { label: 'Other Utility', icon: HardHat, color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/30' },
};

const STATUS_CONFIG = {
  ACTIVE: { label: 'In Progress', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
  PLANNED: { label: 'Planned', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30', dot: 'bg-sky-400' },
  COMPLETED: { label: 'Completed', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', dot: 'bg-slate-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', dot: 'bg-red-500' },
  DELAYED: { label: 'Delayed', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', dot: 'bg-amber-400' },
};

const NAGPUR_ROAD_PRESETS = [
  { name: 'West High Court Road, Dharampeth', lat: 21.1442, lng: 79.0682 },
  { name: 'Wardha Road, Chhatrapati Square to Airport', lat: 21.1025, lng: 79.0689 },
  { name: 'Central Avenue, Gandhibagh to Telephone Exchange', lat: 21.1485, lng: 79.1120 },
  { name: 'Ring Road, Trimurti Nagar to Hingna T-Point', lat: 21.1180, lng: 79.0350 },
  { name: 'Kamptee Road, Gaddigodam to Automotive Square', lat: 21.1760, lng: 79.0980 },
  { name: 'Katol Road, Raj Bhavan to Friends Colony', lat: 21.1720, lng: 79.0550 },
];

export default function ConstructionCoordination() {
  const [projects, setProjects] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  const [formData, setFormData] = useState({
    project_id: `PRJ-NGP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    road_name: 'West High Court Road, Dharampeth',
    agency_id: '',
    contractor_id: '',
    work_type: 'ROAD_RESURFACING',
    status: 'PLANNED',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    description: '',
    latitude: 21.1440,
    longitude: 79.0680,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsData, conflictsData, agenciesData, contractorsData] = await Promise.all([
        getConstructionProjects(),
        getConstructionConflicts(),
        getConstructionAgencies().catch(() => []),
        getConstructionContractors().catch(() => [])
      ]);
      setProjects(projectsData);
      setConflicts(conflictsData);
      setAgencies(agenciesData);
      setContractors(contractorsData);

      if (agenciesData.length > 0 && !formData.agency_id) {
        setFormData(prev => ({
          ...prev,
          agency_id: agenciesData[0].id,
          contractor_id: contractorsData.length > 0 ? contractorsData[0].id : ''
        }));
      }
    } catch (err) {
      console.error('Failed to load construction coordination data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalFeedback(null);

    try {
      const payload = {
        ...formData,
        agency_id: parseInt(formData.agency_id),
        contractor_id: formData.contractor_id ? parseInt(formData.contractor_id) : null,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      const result = await createConstructionProject(payload);
      
      if (result.has_conflict) {
        setModalFeedback({
          type: 'warning',
          title: 'POTENTIAL COORDINATION CONFLICT',
          message: result.conflict_message || 'This project overlaps with an existing trenching or excavation schedule on the same road!',
          conflicts: result.conflicts
        });
      } else {
        setModalFeedback({
          type: 'success',
          title: 'Permit Approved & Registered',
          message: `Project ${result.project_id} registered with zero spatial/temporal road conflicts.`
        });
        setTimeout(() => {
          setIsModalOpen(false);
          setModalFeedback(null);
        }, 1500);
      }

      // Refresh list
      fetchData();
    } catch (err) {
      console.error('Project creation failed:', err);
      setModalFeedback({
        type: 'error',
        title: 'Submission Error',
        message: err.response?.data?.detail || 'Failed to register construction project. Please verify inputs.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (workTypeFilter !== 'ALL' && p.work_type !== workTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.project_id?.toLowerCase().includes(q) ||
        p.road_name?.toLowerCase().includes(q) ||
        p.agency?.name?.toLowerCase().includes(q) ||
        p.contractor?.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Calculate Metrics
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length;
  const plannedCount = projects.filter(p => p.status === 'PLANNED').length;
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
  const conflictCount = conflicts.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <HardHat className="w-4 h-4" />
            <span>Vikasit Nagpur Civic Infrastructure Coordination</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Work & Construction Coordination</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
              Inter-Agency Deconfliction
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Centralized spatial-temporal registry preventing repeated road-cutting by coordinating NMC Water, MSEDCL Electricity, Maha-Metro, and Telecom utilities across Nagpur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormData({
                project_id: `PRJ-NGP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                road_name: 'West High Court Road, Dharampeth',
                agency_id: agencies[0]?.id || '',
                contractor_id: contractors[0]?.id || '',
                work_type: 'ELECTRIC_CABLE',
                status: 'PLANNED',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                description: 'Underground feeder cable installation and trench reinstatement.',
                latitude: 21.1445,
                longitude: 79.0685,
              });
              setModalFeedback(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Work Permit</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Permits</p>
            <p className="text-2xl font-black text-white mt-1">{projects.length}</p>
            <p className="text-xs text-slate-500 mt-1">Across 5 civic agencies</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <HardHat className="w-6 h-6 text-slate-300" />
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Works</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
            <p className="text-xs text-emerald-500/70 mt-1">Currently digging / active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
            <Route className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Planned Pipeline</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{plannedCount}</p>
            <p className="text-xs text-sky-500/70 mt-1">Scheduled for coming weeks</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/30">
            <Calendar className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        <div className={`rounded-2xl p-5 border flex items-center justify-between transition-all ${
          conflictCount > 0
            ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div>
            <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Coordination Conflicts</p>
            <p className={`text-2xl font-black mt-1 ${conflictCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {conflictCount}
            </p>
            <p className="text-xs text-amber-400/80 mt-1 font-medium">
              {conflictCount > 0 ? 'Overlapping road excavations' : 'Zero clashes reported'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            conflictCount > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${conflictCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
        </div>
      </div>

      {/* PRIMARY CONFLICT WARNING SECTION - Exact match requirement */}
      {conflicts.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-300 tracking-tight flex items-center gap-2">
                <span>POTENTIAL COORDINATION CONFLICT DETECTED</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {conflicts.length} Road Clashes
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Spatial-temporal collision engine detected overlapping excavation schedules within 350 meters on the same arterial corridor. Joint trenching is recommended to prevent repeated road-cutting.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="bg-slate-950/90 rounded-2xl p-4 border border-amber-500/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      POTENTIAL COORDINATION CONFLICT
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {conflict.location}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    Proximity: {conflict.distance_meters}m | Overlap: {conflict.overlap_start} to {conflict.overlap_end}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-200 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  {conflict.message}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[11px] text-slate-400">{conflict.project_1_id}</p>
                      <p className="font-bold text-slate-200">{conflict.project_1_agency}</p>
                      <p className="text-cyan-400">{conflict.project_1_work_type}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[11px] text-slate-400">{conflict.project_2_id}</p>
                      <p className="font-bold text-slate-200">{conflict.project_2_agency}</p>
                      <p className="text-amber-400">{conflict.project_2_work_type}</p>
                    </div>
                    <span className="text-xs text-amber-400 font-bold px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      Clashes
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Works' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'PLANNED', label: 'Planned' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Work Type & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Work Types</option>
            <option value="WATER_PIPELINE">Water Pipeline</option>
            <option value="ELECTRIC_CABLE">Electric Cable</option>
            <option value="ROAD_RESURFACING">Road Resurfacing</option>
            <option value="DRAINAGE">Drainage & Storm Sewer</option>
            <option value="TELECOM">Telecom & Fiber</option>
            <option value="OTHER">Other Utility</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search road, agency, permit ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Showing {filteredProjects.length} of {projects.length} Registered Infrastructure Projects</span>
          <span>Nagpur Municipal Corporation (NMC) Digging Permission Portal</span>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-slate-900/60 rounded-3xl p-12 border border-slate-800/80 text-center space-y-3">
            <HardHat className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-bold text-slate-300">No Construction Projects Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No road excavation permits match the selected filter criteria. Clear filters or register a new project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredProjects.map((project) => {
              const workType = WORK_TYPE_CONFIG[project.work_type] || WORK_TYPE_CONFIG.OTHER;
              const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.PLANNED;
              const WorkIcon = workType.icon;

              return (
                <div
                  key={project.id}
                  className={`rounded-3xl p-6 transition-all flex flex-col justify-between border ${
                    project.has_conflict
                      ? 'bg-slate-900/95 border-amber-500/50 shadow-xl shadow-amber-500/5 hover:border-amber-400'
                      : 'bg-slate-900/80 border-slate-800 shadow-lg hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: ID, Work Type, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {project.project_id}
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${workType.bg} ${workType.color}`}>
                            <WorkIcon className="w-3 h-3" />
                            {workType.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-2 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{project.road_name}</span>
                        </h3>
                      </div>

                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.bg} ${status.color}`}>
                        <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                        <span>{status.label}</span>
                      </div>
                    </div>

                    {/* Conflict Highlight Box if this project has a collision */}
                    {project.has_conflict && (
                      <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>POTENTIAL COORDINATION CONFLICT</span>
                        </div>
                        {project.conflicts?.map((c, i) => (
                          <p key={i} className="text-slate-300 text-[11px] leading-relaxed">
                            {c.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Agency & Contractor Details */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          <Building className="w-3.5 h-3.5 text-sky-400" />
                          <span>Issuing Agency</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {project.agency?.name || 'Nagpur Civic Agency'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">{project.agency?.code || 'NMC'}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Assigned Contractor</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {project.contractor?.name || 'Departmental Execution'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{project.contractor?.contact_person || 'Engineering Wing'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Dates & GPS */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{project.start_date}</span>
                      <span>to</span>
                      <span className="font-mono text-slate-300">{project.end_date}</span>
                    </div>

                    <span className="font-mono text-[11px] text-slate-500">
                      {project.latitude?.toFixed(4)}, {project.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Register New Work Permit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Register Infrastructure Work Permit</h3>
                  <p className="text-xs text-slate-400">Automatic collision detection runs on submission</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {/* Feedback Alerts */}
              {modalFeedback && (
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  modalFeedback.type === 'warning'
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : modalFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/60 border-red-500/50 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {modalFeedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {modalFeedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {modalFeedback.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                    <span>{modalFeedback.title}</span>
                  </div>
                  <p className="text-xs text-slate-200">{modalFeedback.message}</p>
                </div>
              )}

              {/* Grid 1: Permit ID and Work Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Permit / Project ID</label>
                  <input
                    type="text"
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Type</label>
                  <select
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="WATER_PIPELINE">WATER_PIPELINE (NMC Water Works)</option>
                    <option value="ELECTRIC_CABLE">ELECTRIC_CABLE (MSEDCL Electricity)</option>
                    <option value="ROAD_RESURFACING">ROAD_RESURFACING (PWD / Tarring)</option>
                    <option value="DRAINAGE">DRAINAGE (Storm Water Drainage)</option>
                    <option value="TELECOM">TELECOM (Fiber Optic Cables)</option>
                    <option value="OTHER">OTHER (General Works)</option>
                  </select>
                </div>
              </div>

              {/* Road / Location Preset Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Road / Location Corridor</label>
                  <span className="text-[11px] text-slate-500">Quick Nagpur Presets</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. West High Court Road, Dharampeth"
                  value={formData.road_name}
                  onChange={(e) => setFormData({ ...formData, road_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NAGPUR_ROAD_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        road_name: preset.name,
                        latitude: preset.lat,
                        longitude: preset.lng
                      })}
                      className="text-[10px] px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {preset.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid 2: Agency & Contractor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agency</label>
                  <select
                    value={formData.agency_id}
                    onChange={(e) => setFormData({ ...formData, agency_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name} ({agency.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contractor</label>
                  <select
                    value={formData.contractor_id}
                    onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Direct Departmental --</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid 3: Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="PLANNED">PLANNED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="DELAYED">DELAYED</option>
                  </select>
                </div>
              </div>

              {/* Grid 4: GPS Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Scope & Excavation Details</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe trench depth, ducting specifications, road reinstatement plan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Collisions...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Submit & Check Clashes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
