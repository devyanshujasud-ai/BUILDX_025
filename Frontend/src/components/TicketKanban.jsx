import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertOctagon, 
  ArrowRight, 
  Building2, 
  Eye, 
  FileText, 
  Upload
} from 'lucide-react';
import { getMediaUrl, getPdfReportUrl, updatePotholeStatus, uploadResolutionProof, FALLBACK_ROAD_IMAGE } from '../services/api';

const COLUMNS = [
  { id: 'REPORTED', title: 'Reported', color: 'border-red-500/40 bg-red-500/5', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  { id: 'ACKNOWLEDGED', title: 'Acknowledged', color: 'border-blue-500/40 bg-blue-500/5', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  { id: 'IN_PROGRESS', title: 'In Progress (Repair)', color: 'border-amber-500/40 bg-amber-500/5', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  { id: 'RESOLVED', title: 'Resolved & Closed', color: 'border-emerald-500/40 bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
];

export default function TicketKanban({ potholes, onSelectPothole, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [resolveModalPothole, setResolveModalPothole] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionFile, setResolutionFile] = useState(null);

  const handleAdvanceStatus = async (pothole, nextStatus) => {
    if (nextStatus === 'RESOLVED') {
      setResolveModalPothole(pothole);
      return;
    }

    setUpdatingId(pothole.id);
    try {
      await updatePotholeStatus(pothole.id, nextStatus);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolveModalPothole) return;
    setUpdatingId(resolveModalPothole.id);

    try {
      if (resolutionFile) {
        const formData = new FormData();
        formData.append('file', resolutionFile);
        if (resolutionNotes) formData.append('notes', resolutionNotes);
        await uploadResolutionProof(resolveModalPothole.id, formData);
      } else {
        await updatePotholeStatus(resolveModalPothole.id, 'RESOLVED', resolutionNotes || 'Repaired by road crew.');
      }
      setResolveModalPothole(null);
      setResolutionNotes('');
      setResolutionFile(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Failed to record resolution');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-sky-400" />
            <span>Civic Authority Resolution Kanban</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track pothole lifecycle across municipal corporations (MCD, PWD, NHAI, NDMC) from initial automated detection to verified road repair.
          </p>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {COLUMNS.map((col) => {
          const colPotholes = potholes.filter((p) => p.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-3xl border ${col.color} bg-slate-900/60 backdrop-blur-md p-4 shadow-xl flex flex-col min-h-[600px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    col.id === 'REPORTED' ? 'bg-red-500' :
                    col.id === 'ACKNOWLEDGED' ? 'bg-blue-500' :
                    col.id === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">{col.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${col.badge}`}>
                  {colPotholes.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {colPotholes.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs italic">
                    No tickets in this phase
                  </div>
                ) : (
                  colPotholes.map((pothole) => (
                    <div
                      key={pothole.id}
                      className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800/80 hover:border-slate-700 transition-all shadow-md group space-y-3"
                    >
                      {/* Ticket Code & Severity Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-400">
                          {pothole.ticket_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          pothole.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          pothole.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          pothole.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {pothole.severity}
                        </span>
                      </div>

                      {/* Photo Thumbnail */}
                      <div 
                        className="w-full h-32 rounded-xl overflow-hidden relative bg-slate-900 border border-slate-800 cursor-pointer"
                        onClick={() => onSelectPothole(pothole)}
                      >
                        <img
                          src={getMediaUrl(pothole.annotated_image_url || pothole.image_url)}
                          alt="Pothole"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            if (e.target.src !== FALLBACK_ROAD_IMAGE) {
                              e.target.src = FALLBACK_ROAD_IMAGE;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                            {pothole.road_name || 'Arterial Road'}
                          </span>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 text-[11px] text-slate-400 font-medium">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building2 className="w-3 h-3 text-sky-400" />
                            <span>{pothole.authority?.code || 'MCD'}</span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(pothole.detected_at).toLocaleDateString()}
                          </span>
                        </div>
                        {pothole.resolution_notes && (
                          <p className="text-emerald-400 text-[10px] italic line-clamp-1">
                            ✓ {pothole.resolution_notes}
                          </p>
                        )}
                      </div>

                      {/* Progression Controls */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                        <button
                          onClick={() => onSelectPothole(pothole)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getPdfReportUrl(pothole.ticket_code)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Download PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </a>

                        {/* Next Step Action */}
                        {col.id === 'REPORTED' && (
                          <button
                            onClick={() => handleAdvanceStatus(pothole, 'ACKNOWLEDGED')}
                            disabled={updatingId === pothole.id}
                            className="flex-1 py-1 px-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Acknowledge</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {col.id === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => handleAdvanceStatus(pothole, 'IN_PROGRESS')}
                            disabled={updatingId === pothole.id}
                            className="flex-1 py-1 px-2 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Dispatch Team</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {col.id === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleAdvanceStatus(pothole, 'RESOLVED')}
                            disabled={updatingId === pothole.id}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Mark Resolved</span>
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolution Proof Upload Modal */}
      {resolveModalPothole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Mark Incident as Resolved</span>
            </h3>
            <p className="text-xs text-slate-400">
              Submit repair confirmation for Ticket <b className="text-sky-300 font-mono">{resolveModalPothole.ticket_code}</b>.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Upload Repaired Road Photo (Proof)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setResolutionFile(e.target.files?.[0])}
                className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Repair Notes / Asphalt Mix Details</label>
              <textarea
                rows={3}
                placeholder="e.g., Cold asphalt mix applied and roller compacted. Road smooth."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setResolveModalPothole(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={updatingId === resolveModalPothole.id}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg"
              >
                Confirm & Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
