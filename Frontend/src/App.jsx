import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DetectionStudio from './components/DetectionStudio';
import TicketKanban from './components/TicketKanban';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuthorityDirectory from './components/AuthorityDirectory';
import PotholeDetailModal from './components/PotholeDetailModal';
import SettingsModal from './components/SettingsModal';
import RFIDSimulatorModal from './components/RFIDSimulatorModal';
import IoTSimulatorModal from './components/IoTSimulatorModal';
import ConstructionCoordination from './components/ConstructionCoordination';
import UnifiedCommandCenter from './components/UnifiedCommandCenter';
import SmartBudgetOptimizer from './components/SmartBudgetOptimizer';
import HardwareMonitor from './components/HardwareMonitor';
import { LanguageProvider } from './i18n/LanguageContext';
import { getPotholes, getAuthorities, getPotholeStats, getAssets, getIssues } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('command'); // 'command' | 'detect' | 'works' | 'kanban' | 'analytics' | 'authorities'
  const [potholes, setPotholes] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rfidModalOpen, setRfidModalOpen] = useState(false);
  const [iotModalOpen, setIotModalOpen] = useState(false);

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [potholesData, authoritiesData, statsData, assetsData, issuesData] = await Promise.all([
        getPotholes(),
        getAuthorities(),
        getPotholeStats(),
        getAssets().catch(() => []),
        getIssues().catch(() => []),
      ]);
      setPotholes(potholesData);
      setAuthorities(authoritiesData);
      setStats(statsData);
      setAssets(assetsData);
      setIssues(issuesData);
    } catch (err) {
      console.error('Failed to load system data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePotholeCreated = (newPothole) => {
    setPotholes((prev) => [newPothole, ...prev]);
    fetchData();
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewReport={() => setActiveTab('detect')}
        onOpenRFID={() => setRfidModalOpen(true)}
        onOpenIoT={() => setIotModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'command' && (
          <UnifiedCommandCenter
            stats={stats}
            authorities={authorities}
            assets={assets}
            issues={issues}
            potholes={potholes}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenRFID={() => setRfidModalOpen(true)}
            onOpenIoT={() => setIotModalOpen(true)}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'budget' && (
          <SmartBudgetOptimizer />
        )}

        {activeTab === 'hardware' && (
          <HardwareMonitor />
        )}

        {activeTab === 'detect' && (
          <DetectionStudio
            potholes={potholes}
            authorities={authorities}
            assets={assets}
            issues={issues}
            selectedPothole={selectedPothole}
            onSelectPothole={(p) => setSelectedPothole(p)}
            onPotholeCreated={handlePotholeCreated}
            onNavigateToKanban={() => setActiveTab('kanban')}
          />
        )}

        {activeTab === 'kanban' && (
          <TicketKanban
            potholes={potholes}
            onSelectPothole={(p) => setSelectedPothole(p)}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'works' && (
          <ConstructionCoordination />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            authorities={authorities}
            assets={assets}
            issues={issues}
          />
        )}

        {activeTab === 'authorities' && (
          <AuthorityDirectory
            authorities={authorities}
            potholes={potholes}
          />
        )}
      </main>

      {/* Modals */}
      {selectedPothole && (
        <PotholeDetailModal
          pothole={selectedPothole}
          onClose={() => setSelectedPothole(null)}
          onRefresh={fetchData}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Global RFID Simulator Modal */}
      <RFIDSimulatorModal
        isOpen={rfidModalOpen}
        onClose={() => setRfidModalOpen(false)}
        onScanSuccess={() => {
          fetchData();
        }}
      />

      {/* Global ESP32 IoT Simulator Modal */}
      <IoTSimulatorModal
        isOpen={iotModalOpen}
        onClose={() => setIotModalOpen(false)}
        onTelemetrySent={() => {
          fetchData();
        }}
      />
      </div>
    </LanguageProvider>
  );
}
