import React, { useState, useEffect, useRef } from 'react';
import { Facility, Organization } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, QrCode, Search, HelpCircle, Loader2 } from 'lucide-react';

interface QrScannerViewProps {
  facilities: Facility[];
  organizations: Organization[];
  onScanSuccess: (facilityId: string) => void;
  onTrackTicket: (ticketId: string) => void;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
  facilities,
  organizations,
  onScanSuccess,
  onTrackTicket
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'simulate' | 'ticket'>('simulate');
  const [simSelectedOrg, setSimSelectedOrg] = useState(organizations[0]?.id || '');
  const [simSelectedFac, setSimSelectedFac] = useState('');
  const [ticketInput, setTicketInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-container';

  // Set default simulated facility based on selected organization
  useEffect(() => {
    const orgFacs = facilities.filter(f => f.organizationId === simSelectedOrg);
    if (orgFacs.length > 0) {
      setSimSelectedFac(orgFacs[0].id);
    } else {
      setSimSelectedFac('');
    }
  }, [simSelectedOrg, facilities]);

  // Clean up camera on activeTab change or unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startCamera = async () => {
    setScanError('');
    setCameraLoading(true);
    try {
      // Small timeout to allow element to mount in DOM
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(qrRegionId);
          qrCodeInstanceRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // Parse facilityId from scanned text (could be a full URL or direct ID)
              let facilityId = decodedText;
              try {
                if (decodedText.includes('facilityId=')) {
                  const urlParams = new URLSearchParams(decodedText.split('?')[1]);
                  const fid = urlParams.get('facilityId');
                  if (fid) facilityId = fid;
                }
              } catch (e) {
                console.error('Error parsing QR text URL:', e);
              }

              // Verify it is a valid facility in our list
              if (facilities.some((f) => f.id === facilityId)) {
                stopCamera();
                onScanSuccess(facilityId);
              } else {
                setScanError(`Scanned code "${decodedText}" does not match any registered facility.`);
              }
            },
            (_errorMessage) => {
              // Verbose logs, can ignore mostly
            }
          );
          setIsCameraActive(true);
          setCameraLoading(false);
        } catch (err: any) {
          console.error('Camera start failed:', err);
          setScanError(`Webcam permission denied or camera not found: ${err.message || err}`);
          setCameraLoading(false);
        }
      }, 300);
    } catch (e: any) {
      setScanError(`Failed to access media devices: ${e.message || e}`);
      setCameraLoading(false);
    }
  };

  const stopCamera = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.error('Failed to stop QR scanner:', err);
      }
      qrCodeInstanceRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleSimulateSubmit = () => {
    if (simSelectedFac) {
      onScanSuccess(simSelectedFac);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      onTrackTicket(ticketInput.trim());
    }
  };

  return (
    <div className="glass-panel mx-auto max-w-[480px] animate-[fadeIn_0.4s_ease]">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary)_0%,#818cf8_100%)] text-white shadow-[0_8px_16px_var(--primary-glow)]">
          <QrCode size={28} />
        </div>
        <h2 className="text-[22px]">Facility Portal</h2>
        <p className="text-[13px] text-app-subtle">
          Scan a facility QR code to report a repair or check existing ticket status.
        </p>
      </div>

      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === 'simulate' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          Simulate Scan
        </button>
        <button
          className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('camera');
            startCamera();
          }}
        >
          Live Camera
        </button>
        <button
          className={`tab-btn ${activeTab === 'ticket' ? 'active' : ''}`}
          onClick={() => setActiveTab('ticket')}
        >
          Track Ticket
        </button>
      </div>

      {activeTab === 'camera' && (
        <div className="animate-[fadeIn_0.3s_ease]">
          {cameraLoading && (
            <div className="flex h-60 flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-app-primary" size={32} />
              <span className="text-[13px] text-app-subtle">Configuring Camera Feed...</span>
            </div>
          )}
          
          <div
            id={qrRegionId}
            className={`camera-scanner-wrapper min-h-60 ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {!isCameraActive && !cameraLoading && (
            <div className="rounded-lg border border-app-border bg-app-raised p-6 text-center">
              <Camera size={32} className="mx-auto mb-2 text-app-muted" />
              <p className="text-[13px] text-app-subtle">Camera is currently offline.</p>
              <button className="glow-btn mt-3 text-xs" onClick={startCamera}>
                Retry Camera Connection
              </button>
            </div>
          )}

          {scanError && (
            <div className="mt-3.5 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[13px] text-red-500">
              <HelpCircle size={18} className="shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-app-muted">
            <span>Position code inside the viewport box to scan automatically</span>
          </div>
        </div>
      )}

      {activeTab === 'simulate' && (
        <div className="animate-[fadeIn_0.3s_ease]">
          <div className="form-group">
            <label className="form-label">Step 1: Choose Organization</label>
            <select
              className="filter-select w-full p-2.5"
              value={simSelectedOrg}
              onChange={(e) => setSimSelectedOrg(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Step 2: Select Facility to Simulate Scan</label>
            <select
              className="filter-select w-full p-2.5"
              value={simSelectedFac}
              onChange={(e) => setSimSelectedFac(e.target.value)}
              disabled={!simSelectedOrg}
            >
              {facilities
                .filter((f) => f.organizationId === simSelectedOrg)
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              {facilities.filter((f) => f.organizationId === simSelectedOrg).length === 0 && (
                <option value="">No facilities registered</option>
              )}
            </select>
          </div>

          {simSelectedFac && (
            <div className="mb-[18px] rounded-lg border border-dashed border-app-border bg-white/[0.02] p-3 text-xs text-app-subtle">
              <strong>Mock Scan Action:</strong> Redirects app browser state to Facility ID <code className="text-app-primary">{simSelectedFac}</code>. Simulate a mobile tenant user submitting a request.
            </div>
          )}

          <button
            className="glow-btn w-full"
            onClick={handleSimulateSubmit}
            disabled={!simSelectedFac}
          >
            Simulate Scanning QR Code
          </button>
        </div>
      )}

      {activeTab === 'ticket' && (
        <form onSubmit={handleTicketSubmit} className="animate-[fadeIn_0.3s_ease]">
          <div className="form-group">
            <label className="form-label">Ticket Reference Number</label>
            <div className="search-input-wrapper">
              <Search className="search-input-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Enter Ticket ID (e.g. req-1)"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="glow-btn w-full">
            Lookup Ticket Status
          </button>

          <div className="mt-4 rounded-lg border border-app-border bg-app-raised p-3 text-xs text-app-muted">
            <strong>Demo tip:</strong> Try typing <strong className="text-app-subtle">req-1</strong>, <strong className="text-app-subtle">req-2</strong>, or <strong className="text-app-subtle">req-3</strong> to view pre-loaded ticket tracking logs.
          </div>
        </form>
      )}
    </div>
  );
};
