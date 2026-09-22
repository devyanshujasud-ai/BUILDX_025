import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Upload, 
  Camera, 
  Video, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Sparkles, 
  Building2, 
  RotateCcw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { detectImage, detectVideo, lookupAuthority, getMediaUrl, FALLBACK_ROAD_IMAGE } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

const reportLocationIcon = L.divIcon({
  className: 'report-location-marker',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0284c7;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const existingReportIcon = L.divIcon({
  className: 'report-existing-marker',
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const createAssetIcon = (type, status) => {
  let bg = '#38bdf8';
  let emoji = '📍';

  if (type === 'STREETLIGHT') {
    bg = status === 'DAMAGED' ? '#ef4444' : '#eab308';
    emoji = '💡';
  } else if (type === 'DUSTBIN') {
    bg = status === 'DAMAGED' ? '#ef4444' : '#a855f7';
    emoji = '🗑️';
  } else if (type === 'ROAD_SEGMENT' || type === 'HIGHWAY_CORRIDOR') {
    bg = '#0284c7';
    emoji = '🚧';
  } else if (type === 'TRAFFIC_SIGNAL') {
    bg = '#10b981';
    emoji = '🚦';
  }

  return L.divIcon({
    className: 'custom-asset-marker',
    html: `<div style="width:24px;height:24px;border-radius:9999px;background:${bg};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function ReportMapSync({ center }) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function ReportMapClick({ onPickLocation }) {
  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function DetectionStudio({
  potholes = [],
  authorities = [],
  assets = [],
  issues = [],
  selectedPothole,
  onSelectPothole,
  onPotholeCreated,
  onNavigateToKanban
}) {
  const { t, getPriorityLabel, getStatusLabel, getDepartmentLabel, getIssueTypeLabel } = useLanguage();
  const [mapLayer, setMapLayer] = useState('ALL'); // 'ALL' | 'POTHOLE' | 'STREETLIGHT' | 'DUSTBIN' | 'ROAD'
  const [mode, setMode] = useState('image'); // 'image' | 'video' | 'webcam'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [error, setError] = useState(null);

  // Geolocation & Metadata State (Nagpur Center: Sitabuldi / Zero Mile)
  const [latitude, setLatitude] = useState(21.1458);
  const [longitude, setLongitude] = useState(79.0882);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [roadType, setRoadType] = useState('URBAN_ROAD');
  const [reportedBy, setReportedBy] = useState('Citizen AI Dashcam');
  const [notes, setNotes] = useState('');
  const [autoReport, setAutoReport] = useState(true);

  // Authority Preview State
  const [resolvedAuthority, setResolvedAuthority] = useState(null);
  const [resolvingAuthority, setResolvingAuthority] = useState(false);

  // Webcam State
  const videoRef = useRef(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(() => {
        setError('Camera started, but the browser blocked video playback. Please click Live Camera again.');
      });
    }
  }, [webcamStream, webcamActive]);

  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [webcamStream]);

  // Handle file select
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setDetectionResult(null);
      setError(null);
    }
  };

  // Preset Sample Images for Quick Testing
  const loadPreset = async (presetName, lat, lng, type) => {
    setLoading(true);
    setError(null);
    setLatitude(lat);
    setLongitude(lng);
    setRoadType(type);

    try {
      // Create a canvas with realistic pothole
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Asphalt background
      ctx.fillStyle = '#33373d';
      ctx.fillRect(0, 0, 640, 480);
      
      // Road markings
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 480);
      ctx.stroke();

      // Pothole hole
      ctx.fillStyle = '#181a1b';
      ctx.beginPath();
      ctx.ellipse(320, 310, 95, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#25282b';
      ctx.lineWidth = 8;
      ctx.stroke();

      canvas.toBlob(async (blob) => {
        const dummyFile = new File([blob], `${presetName}.jpg`, { type: 'image/jpeg' });
        setFile(dummyFile);
        setPreviewUrl(URL.createObjectURL(dummyFile));
        await triggerDetection(dummyFile, lat, lng, type);
      }, 'image/jpeg');

    } catch (err) {
      setError('Failed to generate preset image');
      setLoading(false);
    }
  };

  // Perform AI Detection API Call
  const triggerDetection = async (imageFile = file, lat = latitude, lng = longitude, type = roadType) => {
    if (!imageFile) {
      setError('Please select an image or video to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      if (lat) formData.append('latitude', lat);
      if (lng) formData.append('longitude', lng);
      formData.append('road_type', type);
      formData.append('auto_report', autoReport ? 'true' : 'false');
      formData.append('reported_by', reportedBy);
      if (notes) formData.append('notes', notes);

      let result;
      if (mode === 'video') {
        result = await detectVideo(formData);
      } else {
        result = await detectImage(formData);
      }

      setDetectionResult(result);
      if (result.suggested_authority) {
        setResolvedAuthority(result.suggested_authority);
      }
      if (result.pothole_record && onPotholeCreated) {
        onPotholeCreated(result.pothole_record);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Detection failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Reverse lookup authority when coordinates change
  const handleLookupAuthority = async () => {
    setResolvingAuthority(true);
    try {
      const res = await lookupAuthority(latitude, longitude, roadType);
      setResolvedAuthority(res.authority);
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingAuthority(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not supported in this browser.');
      return;
    }

    setDetectingLocation(true);
    setLocationMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(5)));
        setLongitude(Number(position.coords.longitude.toFixed(5)));
        setLocationMessage('Current location added.');
        setDetectingLocation(false);
      },
      () => {
        setLocationMessage('Allow location permission to detect automatically.');
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handlePickLocation = (lat, lng) => {
    setLatitude(Number(lat.toFixed(5)));
    setLongitude(Number(lng.toFixed(5)));
    setLocationMessage('Location updated from map.');
  };

  // Start / Stop Webcam Feed
  const toggleWebcam = async () => {
    if (webcamActive) {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
      setWebcamStream(null);
      setWebcamActive(false);
    } else {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Live camera is not supported in this browser. Please use Chrome, Edge, or another modern browser.');
        return;
      }

      try {
        setError(null);
        setWebcamActive(true);
        setMode('webcam');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        setWebcamStream(stream);
        useCurrentLocation();
      } catch (err) {
        setWebcamActive(false);
        setWebcamStream(null);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission was blocked. Please allow camera access in the browser and try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera was found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is already being used by another app. Close it and try again.');
        } else {
          setError('Live camera could not start. Please check browser permission and camera connection.');
        }
      }
    }
  };

  // Capture frame from webcam
  const captureWebcamFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });
      setFile(capturedFile);
      setPreviewUrl(URL.createObjectURL(capturedFile));
      triggerDetection(capturedFile);
    }, 'image/jpeg');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('complaintForm', 'headerTitle', 'AI Pothole Detection & Citizen Reports')}</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            {t('complaintForm', 'headerDesc', 'Inference engine analyzing dashcam images, high-speed road videos, or real-time camera feeds. Automatically assesses severity, tags GPS, and routes incident tickets to the responsible civic body.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Media Input & AI Detection View (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { setMode('image'); if(webcamActive) toggleWebcam(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'image' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>{t('complaintForm', 'imagePhoto', 'Image / Photo')}</span>
            </button>
            <button
              onClick={() => { setMode('video'); if(webcamActive) toggleWebcam(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'video' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{t('complaintForm', 'dashcamVideo', 'Dashcam Video')}</span>
            </button>
            <button
              onClick={toggleWebcam}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                webcamActive ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{webcamActive ? t('complaintForm', 'stopLiveFeed', 'Stop Live Feed') : t('complaintForm', 'liveCamera', 'Live Camera')}</span>
            </button>
          </div>

          {/* Upload / Stream Container */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            
            {/* Webcam Live Mode */}
            {webcamActive ? (
              <div className="relative aspect-video bg-black flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/80 backdrop-blur-md text-white text-xs font-mono font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>LIVE DASHCAM STREAM</span>
                </div>
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  <button
                    onClick={captureWebcamFrame}
                    className="px-6 py-2.5 rounded-2xl bg-white text-slate-950 font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>Capture & Detect Pothole</span>
                  </button>
                </div>
              </div>
            ) : previewUrl || detectionResult?.annotated_image_url ? (
              /* Image / Detection Result Preview */
              <div className="relative aspect-video bg-slate-950 flex items-center justify-center group overflow-hidden">
                <img
                  src={getMediaUrl(detectionResult?.annotated_image_url || previewUrl)}
                  alt="Detection view"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    if (previewUrl && e.target.src !== previewUrl) {
                      e.target.src = previewUrl;
                    } else if (e.target.src !== FALLBACK_ROAD_IMAGE) {
                      e.target.src = FALLBACK_ROAD_IMAGE;
                    }
                  }}
                />

                {/* Overlaid Badge */}
                {detectionResult && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono uppercase shadow-lg ${
                      detectionResult.highest_severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                      detectionResult.highest_severity === 'HIGH' ? 'bg-orange-500 text-white' :
                      detectionResult.highest_severity === 'MEDIUM' ? 'bg-yellow-500 text-slate-950' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {detectionResult.highest_severity} SEVERITY ({detectionResult.pothole_count || 1} DETECTED)
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 text-slate-200 text-xs font-mono border border-slate-700">
                      {Math.round((detectionResult.average_confidence || 0.88) * 100)}% Conf
                    </span>
                  </div>
                )}

                {/* Reset button */}
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); setDetectionResult(null); }}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Clear Media"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Dropzone */
              <label className="flex flex-col items-center justify-center p-12 aspect-video cursor-pointer border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-3xl transition-all group bg-slate-950/30">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 group-hover:bg-sky-500/20 text-slate-400 group-hover:text-sky-400 flex items-center justify-center border border-slate-800 group-hover:border-sky-500/30 transition-all mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                  {t('complaintForm', 'dropzoneTitle', 'Drag and drop road inspection photo')}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {t('complaintForm', 'dropzoneSubtitle', 'or click to browse from device (JPG, PNG, WebP up to 10MB)')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-950/60 border-t border-red-900/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!webcamActive && (
            <button
              onClick={() => triggerDetection()}
              disabled={loading || !file}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Image with YOLOv8 & Calculating Severity...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Run AI Detection & Geo-Routing</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Column: Metadata, Authority Routing & Automated Ticket (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Location & GPS Parameters Card */}
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>{t('complaintForm', 'locationAndMap', 'Location & Map Corridor')}</span>
              </h3>
              <button
                onClick={handleLookupAuthority}
                disabled={resolvingAuthority}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
              >
                {resolvingAuthority ? t('complaintForm', 'detecting', 'Resolving...') : t('complaintForm', 'checkAuthority', 'Check Authority')}
              </button>
            </div>

            {/* Map Layer Controls */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
              {[
                { id: 'ALL', label: `${t('complaintForm', 'allAssets', 'All')} (${potholes.length + assets.length})` },
                { id: 'POTHOLE', label: `🕳️ ${t('complaintForm', 'potholes', 'Potholes')} (${potholes.length})` },
                { id: 'STREETLIGHT', label: `💡 ${t('complaintForm', 'streetlights', 'Streetlights')} (${assets.filter((a) => a.type === 'STREETLIGHT').length})` },
                { id: 'DUSTBIN', label: `🗑️ ${t('complaintForm', 'dustbins', 'Dustbins')} (${assets.filter((a) => a.type === 'DUSTBIN').length})` },
                { id: 'ROAD', label: `🚧 ${t('complaintForm', 'corridors', 'Corridors')} (${assets.filter((a) => a.type === 'ROAD_SEGMENT' || a.type === 'HIGHWAY_CORRIDOR').length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setMapLayer(pill.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    mapLayer === pill.id
                      ? 'bg-sky-500 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="h-80 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <MapContainer
                center={[latitude, longitude]}
                zoom={13}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ReportMapSync center={[latitude, longitude]} />
                <ReportMapClick onPickLocation={handlePickLocation} />
                
                {/* Current Report Pin */}
                <Marker
                  position={[latitude, longitude]}
                  icon={reportLocationIcon}
                  draggable
                  eventHandlers={{
                    dragend: (event) => {
                      const point = event.target.getLatLng();
                      handlePickLocation(point.lat, point.lng);
                    },
                  }}
                >
                  <Popup>Report target location ({latitude.toFixed(4)}, {longitude.toFixed(4)})</Popup>
                </Marker>

                {/* Existing Pothole Incidents */}
                {(mapLayer === 'ALL' || mapLayer === 'POTHOLE') &&
                  potholes.slice(0, 30).map((pothole) => (
                    <Marker
                      key={`pothole-${pothole.id}`}
                      position={[pothole.latitude, pothole.longitude]}
                      icon={existingReportIcon}
                      eventHandlers={{
                        click: () => onSelectPothole?.(pothole),
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <strong className="text-red-600 block">{pothole.ticket_code || 'Report'}</strong>
                          <div>{pothole.road_name || pothole.address || 'Road issue'}</div>
                          <div className="text-[10px] text-slate-500">
                            Severity: <span className="font-bold">{pothole.severity}</span> • Status: {pothole.status}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                {/* Physical Assets (Streetlights, Dustbins, Road Segments) */}
                {assets
                  .filter((a) => {
                    if (mapLayer === 'ALL') return true;
                    if (mapLayer === 'STREETLIGHT') return a.type === 'STREETLIGHT';
                    if (mapLayer === 'DUSTBIN') return a.type === 'DUSTBIN';
                    if (mapLayer === 'ROAD') return a.type === 'ROAD_SEGMENT' || a.type === 'HIGHWAY_CORRIDOR';
                    return false;
                  })
                  .map((asset) => {
                    const linkedIssueCount = issues.filter((i) => i.asset_id === asset.id).length;
                    return (
                      <Marker
                        key={`asset-${asset.id}`}
                        position={[asset.latitude, asset.longitude]}
                        icon={createAssetIcon(asset.type, asset.status)}
                      >
                        <Popup>
                          <div className="text-xs space-y-1.5 min-w-[160px]">
                            <div className="font-bold text-slate-900 border-b pb-1">
                              {asset.name}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Type: <span className="font-semibold text-slate-800">{asset.type}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Dept: <span className="font-semibold text-slate-800">{asset.department}</span>
                            </div>
                            <div className="text-[11px]">
                              Status:{' '}
                              <span
                                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                  asset.status === 'OPERATIONAL'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {asset.status}
                              </span>
                            </div>
                            {linkedIssueCount > 0 && (
                              <div className="text-[10px] font-bold text-red-600 pt-1 border-t">
                                ⚠ {linkedIssueCount} Active Grievance(s)
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">{t('complaintForm', 'latitude', 'Latitude')}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">{t('complaintForm', 'longitude', 'Longitude')}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">{t('complaintForm', 'locationMode', 'Location mode')}</p>
                <p className="text-[11px] text-slate-500">
                  {t('complaintForm', 'locationModeDesc', 'Enter manually, click the map, or detect from browser GPS.')}
                </p>
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={detectingLocation}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-xs font-semibold text-slate-100 border border-slate-700 transition-colors cursor-pointer"
              >
                {detectingLocation ? t('complaintForm', 'detecting', 'Detecting...') : t('complaintForm', 'useCurrentLocation', 'Use Current Location')}
              </button>
            </div>

            {locationMessage && (
              <p className="text-[11px] text-slate-400">{locationMessage}</p>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">{t('complaintForm', 'roadClassification', 'Road Classification')}</label>
              <select
                value={roadType}
                onChange={(e) => setRoadType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="URBAN_ROAD">{t('complaintForm', 'urbanRoad', 'Urban / Municipal Road (NMC)')}</option>
                <option value="STATE_HIGHWAY">{t('complaintForm', 'stateHighway', 'State Highway / Arterial Ring Road (PWD Maharashtra)')}</option>
                <option value="NATIONAL_HIGHWAY">{t('complaintForm', 'nationalHighway', 'National Highway / Outer Bypass (NHAI Nagpur)')}</option>
                <option value="RESIDENTIAL">{t('complaintForm', 'residential', 'Residential Ward Lane (NMC Zone)')}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">{t('complaintForm', 'reportedBy', 'Reported By / Citizen Name')}</label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReport}
                  onChange={(e) => setAutoReport(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>{t('complaintForm', 'autoDispatch', 'Auto-Dispatch Incident to Civic Body')}</span>
              </label>
            </div>
          </div>

          {/* Responsible Civic Authority Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/60 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>{t('complaintForm', 'assignedAuthority', 'Assigned Civic Authority')}</span>
            </div>

            {resolvedAuthority ? (
              <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-800/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-sky-200">{resolvedAuthority.name}</h4>
                    <p className="text-xs text-slate-400">{getDepartmentLabel(resolvedAuthority.department)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {resolvedAuthority.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-sky-900/40 font-mono">
                  <div>
                    <span className="text-slate-500 block">{t('complaintForm', 'slaTarget', 'SLA Target:')}</span>
                    <span className="font-bold text-emerald-400">{resolvedAuthority.sla_hours} {t('complaintForm', 'hours', 'Hours')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('complaintForm', 'dispatchEmail', 'Dispatch Email:')}</span>
                    <span className="truncate block">{resolvedAuthority.contact_email}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                {t('complaintForm', 'aiRoutingNotice', 'AI will automatically determine the civic department (NMC, Maharashtra PWD, NHAI Nagpur) based on the GPS coordinates.')}
              </div>
            )}

            {/* Generated Ticket Success Card */}
            {detectionResult?.pothole_record && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t('complaintForm', 'ticketDispatched', 'Ticket Successfully Dispatched!')}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">{t('complaintForm', 'reference', 'Reference:')}</span>
                  <span className="font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {detectionResult.pothole_record.ticket_code}
                  </span>
                </div>
                <button
                  onClick={onNavigateToKanban}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{t('complaintForm', 'viewInKanban', 'View in Civic Kanban Board')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
