import React from 'react';
import { Building2, Mail, Phone, Clock } from 'lucide-react';

export default function AuthorityDirectory({ authorities, potholes }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-sky-400" />
          <span>Civic Authorities & Municipal Jurisdiction Directory</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Official registered road maintenance divisions responsible for receiving automated defect tickets and coordinating rapid patch work.
        </p>
      </div>

      {/* Authority Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authorities.map((auth) => {
          const authPotholes = potholes.filter((p) => p.authority_id === auth.id);
          const resolved = authPotholes.filter((p) => p.status === 'RESOLVED').length;
          const pending = authPotholes.length - resolved;

          return (
            <div
              key={auth.id}
              className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5 hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight">{auth.name}</h3>
                    <p className="text-xs text-slate-400">{auth.department}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {auth.code}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{auth.contact_email}</span>
                  </div>
                  {auth.contact_phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{auth.contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Resolution SLA: <b className="text-emerald-400 font-mono">{auth.sla_hours} Hours</b></span>
                  </div>
                </div>
              </div>

              {/* Statistics Row */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-950">
                  <span className="text-[10px] text-slate-500 block">TOTAL</span>
                  <span className="font-bold text-white text-sm">{authPotholes.length}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950">
                  <span className="text-[10px] text-amber-500 block">PENDING</span>
                  <span className="font-bold text-amber-400 text-sm">{pending}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950">
                  <span className="text-[10px] text-emerald-500 block">RESOLVED</span>
                  <span className="font-bold text-emerald-400 text-sm">{resolved}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
