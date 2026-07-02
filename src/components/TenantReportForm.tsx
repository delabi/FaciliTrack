import React, { useState } from 'react';
import { Facility, RequestCategory, RequestUrgency, RepairRequest, ProgressLog } from '../types';
import { MapPin, Upload, Film, CheckCircle2, ShieldAlert } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

interface TenantReportFormProps {
  facility: Facility;
  onSubmitted: (newRequest: RepairRequest) => void;
  onCancel: () => void;
}

export const TenantReportForm: React.FC<TenantReportFormProps> = ({ facility, onSubmitted, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequestCategory>('plumbing');
  const [urgency, setUrgency] = useState<RequestUrgency>('medium');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  
  // Media attachments
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Geo-location
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Form State
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');

  // Auto-detect location on load or request
  const detectLocation = () => {
    setLocationLoading(true);
    setLocationStatus('Accessing GPS...');
    
    if (!navigator.geolocation) {
      setTimeout(() => {
        // Mock fallback coordinates
        setCoordinates({ latitude: 30.2672 + (Math.random() - 0.5) * 0.01, longitude: -97.7431 + (Math.random() - 0.5) * 0.01 });
        setLocationLoading(false);
        setLocationStatus('Simulated GPS coordinates acquired');
      }, 800);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
        setLocationStatus('GPS Coordinates acquired');
      },
      (error) => {
        console.warn('Geolocation error, using mock fallback:', error.message);
        // Fallback mockup coordinate
        setCoordinates({ latitude: 30.2672 + (Math.random() - 0.5) * 0.01, longitude: -97.7431 + (Math.random() - 0.5) * 0.01 });
        setLocationLoading(false);
        setLocationStatus('Mock GPS location applied');
      },
      { timeout: 5000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const filesArray = Array.from(e.target.files);
    if (attachments.length + filesArray.length > 3) {
      alert('You can upload a maximum of 3 files.');
      return;
    }

    setIsUploading(true);
    
    const filePromises = filesArray.map((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isVideo) {
        if (file.size > 15 * 1024 * 1024) {
          alert(`Video file "${file.name}" exceeds the 15MB limit.`);
          return Promise.resolve(null);
        }
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      } else if (isImage) {
        return compressImage(file).catch((err) => {
          console.warn('Image compression failed, using original:', err);
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          });
        });
      } else {
        alert(`File type of "${file.name}" is not supported.`);
        return Promise.resolve(null);
      }
    });

    Promise.all(filePromises).then((results) => {
      const validResults = results.filter((r): r is string => r !== null);
      setAttachments((prev) => [...prev, ...validResults]);
      setIsUploading(false);
    });
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !reporterName.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const ticketId = `req-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString();

    const initialLog: ProgressLog = {
      status: 'pending',
      timestamp: nowStr,
      note: `Repair request submitted via facility QR scan. Reporter: ${reporterName}`,
      updatedBy: reporterName
    };

    const newRequest: RepairRequest = {
      id: ticketId,
      organizationId: facility.organizationId,
      facilityId: facility.id,
      title,
      description,
      category,
      urgency,
      status: 'pending',
      reporterName,
      reporterContact,
      mediaUrls: attachments,
      locationCoordinates: coordinates || undefined,
      createdAt: nowStr,
      progressLog: [initialLog]
    };

    // Save and switch state
    setCreatedTicketId(ticketId);
    setIsSuccess(true);
    onSubmitted(newRequest);
  };

  if (isSuccess) {
    return (
      <div className="glass-panel text-center animate-[fadeIn_0.5s_ease]">
        <div className="success-checkmark">
          <CheckCircle2 size={44} />
        </div>
        <h2 className="mb-2 text-2xl">Request Submitted!</h2>
        <p className="mb-6 text-app-subtle">
          Your repair ticket has been logged successfully for <strong>{facility.name}</strong>.
        </p>
        
        <div className="mb-6 rounded-[10px] border border-app-border bg-app-raised p-4 text-left">
          <div className="mb-2 flex justify-between gap-4">
            <span className="text-xs text-app-muted">TICKET ID</span>
            <strong className="font-mono text-app-primary">{createdTicketId}</strong>
          </div>
          <div className="mb-2 flex justify-between gap-4">
            <span className="text-xs text-app-muted">FACILITY</span>
            <span className="text-[13px] font-semibold">{facility.name}</span>
          </div>
          <div className="mb-2 flex justify-between gap-4">
            <span className="text-xs text-app-muted">CATEGORY</span>
            <span className="text-[13px] capitalize">{category}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-app-muted">URGENCY</span>
            <span className={`urgency-badge ${urgency}`}>{urgency}</span>
          </div>
        </div>

        <p className="mb-6 text-[13px] text-app-muted">
          Facility management has been notified. You can scan the QR code anytime to track progress using this ticket ID.
        </p>

        <button className="glow-btn w-full" onClick={onCancel}>
          Return to Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-[slideUp_0.4s_ease]">
      <div className="mb-[18px] flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-bold uppercase text-app-primary">
            New Repair Request
          </span>
          <h2 className="mt-0.5 text-xl leading-tight">{facility.name}</h2>
          <p className="text-xs text-app-muted">{facility.address}</p>
        </div>
        {urgency === 'emergency' && (
          <div className="flex animate-pulse items-center gap-1 text-xs font-bold text-red-500">
            <ShieldAlert size={16} /> EMERGENCY ACTIVE
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Reporter Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Your Name (e.g. Apartment 4B resident)"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contact Info (Optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Phone number or Email address"
            value={reporterContact}
            onChange={(e) => setReporterContact(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="filter-select w-full p-2.5"
              value={category}
              onChange={(e) => setCategory(e.target.value as RequestCategory)}
            >
              <option value="plumbing">Plumbing & Leaks</option>
              <option value="electrical">Electrical & Lighting</option>
              <option value="hvac">HVAC (Heating & AC)</option>
              <option value="structural">Structural / Walls / Doors</option>
              <option value="appliance">Appliances</option>
              <option value="safety">Fire / Security / Safety</option>
              <option value="other">Other Issue</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Urgency Level</label>
            <select
              className="filter-select w-full p-2.5"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
            >
              <option value="low">Low (Standard Maintenance)</option>
              <option value="medium">Medium (Needs attention soon)</option>
              <option value="high">High (Disruptive issue)</option>
              <option value="emergency">Emergency (Immediate Hazard/Flooding)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Issue Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Briefly name the problem (e.g. Overflowing toilet)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Detailed Description *</label>
          <textarea
            rows={4}
            className="form-textarea"
            placeholder="Please describe what is broken, where it is located inside the facility, and any other helpful details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Attach Photos / Videos</label>
          <label className="upload-zone">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Upload size={28} className="text-app-primary" />
            <span className="text-[13px] font-semibold">
              {isUploading ? 'Uploading file...' : 'Click to Upload Photos / Videos'}
            </span>
            <span className="text-[11px] text-app-muted">
              Supports JPG, PNG, MP4 (Max 3 files)
            </span>
          </label>

          {attachments.length > 0 && (
            <div className="preview-grid">
              {attachments.map((url, idx) => {
                const isVideo = url.startsWith('data:video');
                return (
                  <div key={idx} className="relative">
                    {isVideo ? (
                      <div className="preview-thumbnail flex items-center justify-center bg-black">
                        <Film size={24} className="text-white" />
                      </div>
                    ) : (
                      <img src={url} alt="upload preview" className="preview-thumbnail" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-0 bg-red-500 text-[10px] leading-none text-white"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-group rounded-lg border border-app-border bg-white/[0.02] p-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-app-primary" />
              <div>
                <span className="block text-[13px] font-semibold">Attach Location Coordinates</span>
                <span className="text-[11px] text-app-muted">
                  {locationStatus || 'Click detect to tag repair spot coordinates'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locationLoading}
              className="nav-btn border border-app-border bg-app-raised px-3 py-1.5 text-xs"
            >
              {locationLoading ? 'Locating...' : 'Detect'}
            </button>
          </div>

          {coordinates && (
            <div className="map-mock">
              <MapPin size={14} className="mr-1 text-red-500" />
              GPS: Lat {coordinates.latitude.toFixed(4)}, Lng {coordinates.longitude.toFixed(4)}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" className="glow-btn btn-secondary flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="glow-btn flex-[2]">
            Submit Repair Request
          </button>
        </div>
      </form>
    </div>
  );
};
