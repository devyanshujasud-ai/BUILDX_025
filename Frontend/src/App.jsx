import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DetectionStudio from './components/DetectionStudio';
import TicketKanban from './components/TicketKanban';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuthorityDirectory from './components/AuthorityDirectory';
import PotholeDetailModal from './components/PotholeDetailModal';
import SettingsModal from './components/SettingsModal';
import { getPotholes, getAuthorities, getPotholeStats } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('detect'); // 'detect' | 'kanban' | 'analytics' | 'authorities'
  const [potholes, setPotholes] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [potholesData, authoritiesData, statsData] = await Promise.all([
        getPotholes(),
        getAuthorities(),
        getPotholeStats(),
      ]);
      setPotholes(potholesData);
      setAuthorities(authoritiesData);
      setStats(statsData);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewReport={() => setActiveTab('detect')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'detect' && (
          <DetectionStudio
            potholes={potholes}
            authorities={authorities}
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

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            authorities={authorities}
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
    </div>
  );
}
