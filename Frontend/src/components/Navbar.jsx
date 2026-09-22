import React from 'react';
import {
  Scan,
  KanbanSquare,
  BarChart3,
  Building2,
  CheckCircle2,
  MapPin,
  Radio,
  Cpu,
  HardHat,
  Globe,
  LayoutDashboard,
  DollarSign,
  CircuitBoard
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function Navbar({ activeTab, setActiveTab, stats, onOpenSettings, onOpenNewReport, onOpenRFID, onOpenIoT }) {
  const { language, setLanguage, t } = useLanguage();

  const tabs = [
    { id: 'command', label: t('nav', 'commandCenter', 'Command Center'), icon: LayoutDashboard },
    { id: 'hardware', label: t('nav', 'hardware', 'Hardware'), icon: CircuitBoard, badge: 'ESP32' },
    { id: 'budget', label: t('nav', 'budget', 'Smart Budget'), icon: DollarSign, badge: '40% Cut' },
    { id: 'detect', label: t('nav', 'report', 'Report'), icon: Scan },
    { id: 'works', label: t('nav', 'works', 'Works'), icon: HardHat },
    { id: 'kanban', label: t('nav', 'workList', 'Work List'), icon: KanbanSquare },
    { id: 'analytics', label: t('nav', 'stats', 'Stats'), icon: BarChart3 },
    { id: 'authorities', label: t('nav', 'offices', 'Offices'), icon: Building2 },
  ];


  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[64px] py-2 gap-2 sm:gap-4 flex-wrap lg:flex-nowrap">
          
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
            onClick={() => setActiveTab('command')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm group-hover:border-sky-400 transition-colors">
              <MapPin className="w-5 h-5 text-sky-400" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white">
                <span>{t('nav', 'appName', 'Vikasit Nagpur')}</span>
                <span className="text-[9px] font-mono font-bold bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30">NMC</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {t('nav', 'appSubtitle', 'Urban Infrastructure Intelligence')}
              </p>
            </div>
          </div>

          {/* Navigation Pill Bar */}
          <nav className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold tracking-tight">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Items: Language Toggle & Quick Simulators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language Selector: English | मराठी | हिन्दी */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 mx-1 hidden sm:inline" />
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('mr')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  language === 'mr'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="मराठी"
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  language === 'hi'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="हिन्दी"
              >
                हिन्दी
              </button>
            </div>

            {/* Quick Demo Modals */}
            {onOpenIoT && (
              <button
                type="button"
                onClick={onOpenIoT}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700/80 text-xs font-bold transition-colors cursor-pointer"
                title="ESP32 IoT Simulator"
              >
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                <span>IoT</span>
              </button>
            )}

            {onOpenRFID && (
              <button
                type="button"
                onClick={onOpenRFID}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-400 border border-slate-700/80 text-xs font-bold transition-colors cursor-pointer"
                title="RFID Maintenance Simulator"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>RFID</span>
              </button>
            )}

            {/* Primary Action */}
            <button
              onClick={onOpenNewReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-900/30 cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{t('nav', 'newReport', 'New Report')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
