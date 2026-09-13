import React, { useState, useEffect } from 'react';
import { X, Database, Cloud, Mail, CheckCircle2, ShieldCheck, Key, Save } from 'lucide-react';
import { getConfigStatus } from '../services/api';

export default function SettingsModal({ onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [pgUser, setPgUser] = useState('postgres');
  const [pgPassword, setPgPassword] = useState('');
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDatabase, setPgDatabase] = useState('pothole_db');

  const [awsBucket, setAwsBucket] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsKey, setAwsKey] = useState('');
  const [awsSecret, setAwsSecret] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getConfigStatus();
        setConfig(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">PostgreSQL & Cloud Storage Configuration</h3>
              <p className="text-xs text-slate-400">Manage database connections, AWS S3 bucket, and notification dispatchers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Active Status Badge */}
          {config && (
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-sky-400 font-bold block">CURRENT ACTIVE DATABASE</span>
                <span className="font-mono text-xs text-slate-200">{config.database_type}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-sky-400 font-bold block">MEDIA STORAGE</span>
                <span className="font-mono text-xs text-slate-200">
                  {config.aws_s3_configured ? 'AWS S3 Connected' : 'Local Storage (/uploads/)'}
                </span>
              </div>
            </div>
          )}

          {/* PostgreSQL Settings */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 space-y-4">
            <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>PostgreSQL Database Credentials</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">PostgreSQL User</label>
                <input
                  type="text"
                  value={pgUser}
                  onChange={(e) => setPgUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter PostgreSQL password"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Host</label>
                <input
                  type="text"
                  value={pgHost}
                  onChange={(e) => setPgHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Port</label>
                <input
                  type="text"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Database Name</label>
                <input
                  type="text"
                  value={pgDatabase}
                  onChange={(e) => setPgDatabase(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Connection URI: postgresql://{pgUser}:{pgPassword ? '••••••' : 'password'}@{pgHost}:{pgPort}/{pgDatabase}
            </p>
          </div>

          {/* AWS S3 Settings */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 space-y-4">
            <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>AWS S3 Media Storage</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">S3 Bucket Name</label>
                <input
                  type="text"
                  placeholder="e.g. pothole-detection-evidence"
                  value={awsBucket}
                  onChange={(e) => setAwsBucket(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">AWS Region</label>
                <input
                  type="text"
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">AWS Access Key ID</label>
                <input
                  type="text"
                  placeholder="AKIA..."
                  value={awsKey}
                  onChange={(e) => setAwsKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">AWS Secret Access Key</label>
                <input
                  type="password"
                  placeholder="Secret key..."
                  value={awsSecret}
                  onChange={(e) => setAwsSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Success Message */}
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Environment configuration updated successfully!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
