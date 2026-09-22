import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Building2, 
  Clock, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  Phone, 
  Mail
} from 'lucide-react';
import { getMediaUrl, getPdfReportUrl, deletePothole, FALLBACK_ROAD_IMAGE } from '../services/api';

export default function PotholeDetailModal({ pothole, onClose, onRefresh }) {
  const [activeImageTab, setActiveImageTab] = useState('annotated'); // 'annotated' | 'original' | 'resolution'
  const [deleting, setDeleting] = useState(false);

  if (!pothole) return null;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this incident report?')) return;
    setDeleting(true);
    try {
      await deletePothole(pothole.id);
      if (onRefresh) onRefresh();
      onClose();
    } catch (e) {
      alert('Failed to delete pothole record');
    } finally {
      setDeleting(false);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${pothole.latitude},${pothole.longitude}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-3xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-sky-400 bg-sky-500/10 px-3 py-1 rounded-xl border border-sky-500/20">
              {pothole.ticket_code}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
              pothole.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              pothole.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              pothole.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {pothole.severity} ({pothole.severity_score}/10)
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {pothole.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Media Viewer with Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveImageTab('annotated')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeImageTab === 'annotated' ? 'bg-sky-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                AI Annotated Detection
              </button>
              <button
                onClick={() => setActiveImageTab('original')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeImageTab === 'original' ? 'bg-sky-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                Original Capture
              </button>
              {pothole.resolution_image_url && (
                <button
                  onClick={() => setActiveImageTab('resolution')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeImageTab === 'resolution' ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Post-Repair Proof
                </button>
              )}
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative flex items-center justify-center">
              <img
                src={getMediaUrl(
                  activeImageTab === 'annotated' ? (pothole.annotated_image_url || pothole.image_url) :
                  activeImageTab === 'original' ? pothole.image_url :
                  pothole.resolution_image_url
                )}
                alt="Pothole view"
                className="w-full h-full object-contain"
                onError={(e) => {
                  if (e.target.src !== FALLBACK_ROAD_IMAGE) {
                    e.target.src = FALLBACK_ROAD_IMAGE;
                  }
                }}
              />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Location & AI Info */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Geographic Location & AI Tagging</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Road / Street Name:</span>
                  <span className="font-semibold text-slate-200">{pothole.road_name || 'Arterial Road'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Zone & City:</span>
                  <span className="text-slate-300">{pothole.zone || 'Nagpur Zone'}, {pothole.city || 'Nagpur'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">GPS Coordinates:</span>
                  <span className="font-mono text-sky-300">{pothole.latitude.toFixed(5)}, {pothole.longitude.toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Road Hierarchy:</span>
                  <span className="text-slate-300 font-mono">{pothole.road_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">AI Confidence Score:</span>
                  <span className="text-emerald-400 font-bold">{Math.round(pothole.confidence * 100)}%</span>
                </div>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 pt-2"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Responsible Civic Authority Card */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Responsible Civic Body</span>
              </h4>

              {pothole.authority ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Department:</span>
                    <span className="font-semibold text-slate-200">{pothole.authority.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jurisdiction:</span>
                    <span className="text-slate-300">{pothole.authority.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Resolution SLA Target:</span>
                    <span className="font-bold text-emerald-400">{pothole.authority.sla_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate">{pothole.authority.contact_email}</span>
                  </div>
                  {pothole.authority.contact_phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <span>{pothole.authority.contact_phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No authority assigned</div>
              )}
            </div>

          </div>

          {/* Timeline Audit Log */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Incident Lifecycle Timeline</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">1. DETECTED</span>
                <span className="text-slate-200 font-bold">
                  {new Date(pothole.detected_at).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">2. ACKNOWLEDGED</span>
                <span className="text-blue-400 font-bold">
                  {pothole.acknowledged_at ? new Date(pothole.acknowledged_at).toLocaleDateString() : 'Pending'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">3. IN PROGRESS</span>
                <span className="text-amber-400 font-bold">
                  {pothole.in_progress_at ? new Date(pothole.in_progress_at).toLocaleDateString() : 'Pending'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">4. RESOLVED</span>
                <span className="text-emerald-400 font-bold">
                  {pothole.resolved_at ? new Date(pothole.resolved_at).toLocaleDateString() : 'Pending'}
                </span>
              </div>
            </div>

            {pothole.resolution_notes && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300">
                <span className="font-bold block mb-0.5">Repair Verification Notes:</span>
                <span>{pothole.resolution_notes}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 text-xs font-bold border border-red-800/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Record</span>
          </button>

          <div className="flex items-center gap-3">
            <a
              href={getPdfReportUrl(pothole.ticket_code)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-sky-500/20 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Download Official PDF Incident Report</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
