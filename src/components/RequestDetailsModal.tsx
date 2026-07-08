import React, { useState, useEffect } from 'react';
import { RepairRequest, Facility, Vendor, User, RequestStatus } from '../types';
import { X, Calendar, MapPin, Phone, Mail, User as UserIcon, Wrench, Shield, DollarSign, Upload, FileText, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface RequestDetailsModalProps {
  request: RepairRequest;
  facility: Facility;
  vendors: Vendor[];
  currentUser: User | null;
  onClose: () => void;
  onUpdateRequest: (updatedRequest: RepairRequest) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  facility,
  vendors,
  currentUser,
  onClose,
  onUpdateRequest
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState(request.assignedVendorId || '');
  const [partsCost, setPartsCost] = useState<string>(request.itemizedCost ? String(request.itemizedCost.parts) : '0');
  const [laborCost, setLaborCost] = useState<string>(request.itemizedCost ? String(request.itemizedCost.labor) : '150');
  const [otherCost, setOtherCost] = useState<string>(request.itemizedCost ? String(request.itemizedCost.other) : '0');
  const [completionPhoto, setCompletionPhoto] = useState<string>(request.completionPhotoUrl || '');
  const [receiptPhoto, setReceiptPhoto] = useState<string>(request.receiptUrl || '');
  const [vendorLogNote, setVendorLogNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState(request.inspectionNotes || '');
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>(request.inspectionPhotoUrls || []);
  const [isInspectionUploading, setIsInspectionUploading] = useState(false);

  // Media Viewer Carousel State
  const [activeViewerMedia, setActiveViewerMedia] = useState<string[] | null>(null);
  const [activeViewerIndex, setActiveViewerIndex] = useState<number>(0);

  const isVideoUrl = (url: string) => {
    return url.startsWith('data:video') || 
           url.endsWith('.mp4') || 
           url.endsWith('.webm') || 
           url.endsWith('.ogg') ||
           url.includes('video/');
  };

  const openMediaViewer = (mediaList: string[], startIndex: number) => {
    setActiveViewerMedia(mediaList);
    setActiveViewerIndex(startIndex);
  };

  const closeMediaViewer = () => {
    setActiveViewerMedia(null);
  };

  const showPrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeViewerMedia) return;
    setActiveViewerIndex((prev) => (prev === 0 ? activeViewerMedia.length - 1 : prev - 1));
  };

  const showNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeViewerMedia) return;
    setActiveViewerIndex((prev) => (prev === activeViewerMedia.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (!activeViewerMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMediaViewer();
      if (e.key === 'ArrowLeft') {
        setActiveViewerIndex((prev) => (prev === 0 ? activeViewerMedia.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveViewerIndex((prev) => (prev === activeViewerMedia.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeViewerMedia]);

  // Check roles
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isVendor = currentUser?.role === 'vendor' && currentUser.vendorId === request.assignedVendorId;
  const isAssignedVendor = currentUser?.role === 'vendor';

  // Vendor profiles
  const assignedVendor = vendors.find(v => v.id === request.assignedVendorId);

  const handleStatusChange = (newStatus: RequestStatus, note: string, extraFields: Partial<RepairRequest> = {}) => {
    const nowStr = new Date().toISOString();
    const updatedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'System';

    const newLog = {
      status: newStatus,
      timestamp: nowStr,
      note,
      updatedBy
    };

    const updatedRequest: RepairRequest = {
      ...request,
      status: newStatus,
      progressLog: [...request.progressLog, newLog],
      ...extraFields
    };

    onUpdateRequest(updatedRequest);
  };

  const handleAssignVendor = () => {
    if (!selectedVendorId) return;
    const vendor = vendors.find(v => v.id === selectedVendorId);
    const vendorName = vendor ? vendor.name : 'Vendor';
    handleStatusChange(
      'assigned',
      `Assigned to vendor: ${vendorName}. Waiting for dispatch acceptance.`,
      { assignedVendorId: selectedVendorId }
    );
  };

  const handleStartWork = () => {
    handleStatusChange(
      'in-progress',
      `Repair work initiated on-site by technician.`,
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'completion' | 'receipt') => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (target === 'completion') {
        setCompletionPhoto(event.target?.result as string);
      } else {
        setReceiptPhoto(event.target?.result as string);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionPhoto) {
      alert('Please upload a photo of the completed repair work.');
      return;
    }

    const partsNum = parseFloat(partsCost) || 0;
    const laborNum = parseFloat(laborCost) || 0;
    const otherNum = parseFloat(otherCost) || 0;

    if (partsNum < 0 || laborNum < 0 || otherNum < 0) {
      alert('Cost figures cannot be negative.');
      return;
    }

    const totalSum = partsNum + laborNum + otherNum;
    handleStatusChange(
      'completed',
      vendorLogNote.trim() 
        ? `Work completed. Notes: ${vendorLogNote}` 
        : `Work completed. Replacement components checked and seal verified.`,
      {
        completionPhotoUrl: completionPhoto,
        receiptUrl: receiptPhoto || undefined,
        cost: totalSum,
        itemizedCost: {
          parts: partsNum,
          labor: laborNum,
          other: otherNum
        },
        inspectionApproved: false // Reset inspection approval for manager review
      }
    );
  };

  const handleApprovePayment = () => {
    const partsNum = parseFloat(partsCost) || 0;
    const laborNum = parseFloat(laborCost) || 0;
    const otherNum = parseFloat(otherCost) || 0;

    if (partsNum < 0 || laborNum < 0 || otherNum < 0) {
      alert('Cost figures cannot be negative.');
      return;
    }

    const totalSum = partsNum + laborNum + otherNum;
    handleStatusChange(
      'paid',
      `Invoice approved by Facility Manager. Disbursed payment amount of $${totalSum.toFixed(2)}. Ticket closed.`,
      {
        cost: totalSum,
        itemizedCost: {
          parts: partsNum,
          labor: laborNum,
          other: otherNum
        }
      }
    );
  };

  const handleInspectionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsInspectionUploading(true);
    const filesArray = Array.from(e.target.files);
    const filePromises = filesArray.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((results) => {
      setInspectionPhotos((prev) => [...prev, ...results]);
      setIsInspectionUploading(false);
    });
  };

  const handleRemoveInspectionPhoto = (indexToRemove: number) => {
    setInspectionPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApproveWork = () => {
    handleStatusChange(
      'completed',
      `Inspection Approved: Work done properly. Feedback: ${inspectionNotes || 'Approved without issues.'}`,
      {
        inspectionNotes,
        inspectionPhotoUrls: inspectionPhotos,
        inspectionApproved: true
      }
    );
  };

  const handleRequestReWork = () => {
    if (!inspectionNotes.trim()) {
      alert('Please explain in the notes why the work requires re-work, so the vendor knows what to fix.');
      return;
    }
    handleStatusChange(
      'in-progress',
      `Inspection Rejected: Re-work requested. Feedback: ${inspectionNotes}`,
      {
        inspectionNotes,
        inspectionPhotoUrls: inspectionPhotos,
        inspectionApproved: false
      }
    );
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay animate-[fadeIn_0.25s_ease]">
      <div className="modal-content animate-[slideUp_0.3s_ease]">
        
        {/* Header */}
        <div className="modal-header">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded bg-app-primary-glow px-2 py-0.5 font-mono text-[11px] font-extrabold text-app-primary">
                {request.id}
              </span>
              <span className={`status-badge ${request.status}`}>
                {request.status === 'in-progress' ? 'In Progress' : request.status}
              </span>
              <span className={`urgency-badge ${request.urgency}`}>{request.urgency} Urgency</span>
            </div>
            <h2 className="text-lg font-bold leading-snug text-app-text">{request.title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Grid stats */}
          <div className="details-grid">
            <div className="details-block">
              <div className="details-label">Facility Location</div>
              <div className="details-value flex items-center gap-1">
                <MapPin size={14} className="shrink-0 text-app-primary" />
                <span className="truncate" title={facility.name}>
                  {facility.name}
                </span>
              </div>
            </div>

            <div className="details-block">
              <div className="details-label">Reported On</div>
              <div className="details-value flex items-center gap-1">
                <Calendar size={14} className="text-app-muted" />
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>

            <div className="details-block">
              <div className="details-label">Category</div>
              <div className="details-value capitalize">
                {request.category}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="mb-1.5 text-[13px] uppercase tracking-[0.05em] text-app-muted">
              Issue Description
            </h4>
            <p className="whitespace-pre-wrap rounded-lg border border-app-border bg-app-raised p-4 text-sm text-app-subtle">
              {request.description}
            </p>
          </div>

          {/* Reporter Information */}
          <div className="mb-6 rounded-lg border border-app-border bg-white/[0.01] px-4 py-3">
            <h4 className="mb-1.5 flex items-center gap-1 text-xs uppercase tracking-[0.05em] text-app-muted">
              <UserIcon size={12} /> Reporter Details
            </h4>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <div><span className="text-app-muted">Name:</span> <strong>{request.reporterName}</strong></div>
              {request.reporterContact && (
                <div><span className="text-app-muted">Contact:</span> <strong>{request.reporterContact}</strong></div>
              )}
            </div>
          </div>

          {/* Media Attachments */}
          {request.mediaUrls.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-[13px] uppercase tracking-[0.05em] text-app-muted">
                Initial Attachments ({request.mediaUrls.length})
              </h4>
              <div className="media-container">
                {request.mediaUrls.map((url, idx) => {
                  const isVideo = isVideoUrl(url);
                  return isVideo ? (
                    <div 
                      key={idx} 
                      className="relative group cursor-pointer media-item flex items-center justify-center bg-black/20"
                      onClick={() => openMediaViewer(request.mediaUrls, idx)}
                    >
                      <video src={url} className="h-full w-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 rounded-lg transition-colors">
                        <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded">Play Video</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      key={idx}
                      src={url}
                      alt={`attachment-${idx}`}
                      className="media-item cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openMediaViewer(request.mediaUrls, idx)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* GPS Location Map */}
          {request.locationCoordinates && (
            <div className="mb-6">
              <h4 className="mb-1.5 text-[13px] uppercase tracking-[0.05em] text-app-muted">
                Repair Site Coordinates
              </h4>
              <div className="map-mock">
                <MapPin size={14} className="mr-1 text-red-500" />
                Geotagged Spot: Lat {request.locationCoordinates.latitude.toFixed(6)}, Lng {request.locationCoordinates.longitude.toFixed(6)}
              </div>
            </div>
          )}

          {/* Vendor Assignment Status */}
          {assignedVendor && (
            <div className="mb-6 rounded-[10px] border border-app-border bg-indigo-500/[0.03] p-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-[13px] uppercase tracking-[0.05em] text-app-primary">
                <Wrench size={16} /> Dispatched Maintenance Vendor
              </h4>
              <div className="grid grid-cols-1 gap-2.5 text-[13px] sm:grid-cols-2">
                <div><span className="text-app-muted">Vendor:</span> <strong>{assignedVendor.name}</strong></div>
                <div><span className="text-app-muted">Specialty:</span> <strong>{assignedVendor.specialty}</strong></div>
                <div className="flex min-w-0 items-center gap-1">
                  <Mail size={12} className="shrink-0 text-app-muted" />
                  <a href={`mailto:${assignedVendor.email}`} className="truncate text-inherit no-underline">{assignedVendor.email}</a>
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={12} className="text-app-muted" />
                  <span>{assignedVendor.phone}</span>
                </div>
              </div>
              
              {request.cost !== undefined && (
                <div className="mt-3 border-t border-app-border pt-3">
                  {request.itemizedCost ? (
                    <div className="flex flex-col gap-1 text-[13px] text-app-subtle">
                      <div className="flex justify-between">
                        <span className="text-app-muted">Parts & Materials:</span>
                        <strong className="text-app-text">${request.itemizedCost.parts.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-muted">Technician Labor:</span>
                        <strong className="text-app-text">${request.itemizedCost.labor.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-muted">Other Expenses:</span>
                        <strong className="text-app-text">${request.itemizedCost.other.toFixed(2)}</strong>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-app-border/40 pt-2 text-sm font-semibold text-app-text">
                        <span>Invoiced Total:</span>
                        <span className="text-base font-extrabold text-emerald-500">
                          ${request.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-app-muted">Invoiced Cost:</span>
                      <span className="text-lg font-extrabold text-emerald-500">
                        ${request.cost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completion Deliverables (Photos/Receipts) */}
          {(request.completionPhotoUrl || request.receiptUrl) && (
            <div className="mb-6 rounded-[10px] border border-app-border bg-emerald-500/[0.03] p-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-[13px] uppercase tracking-[0.05em] text-emerald-500">
                <CheckCircle2 size={16} /> Completed Work Proofs
              </h4>
              <div className="media-container">
                {(() => {
                  const completedProofs = [request.completionPhotoUrl, request.receiptUrl].filter(Boolean) as string[];
                  return (
                    <>
                       {request.completionPhotoUrl && (
                        <div>
                          <span className="mb-1 block text-[11px] text-app-muted">Completion Photo:</span>
                          <img
                            src={request.completionPhotoUrl}
                            alt="Completed Work"
                            className="media-item h-[120px] w-40 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openMediaViewer(completedProofs, completedProofs.indexOf(request.completionPhotoUrl!))}
                          />
                        </div>
                      )}
                      {request.receiptUrl && (
                        <div>
                          <span className="mb-1 block text-[11px] text-app-muted">Invoice/Receipt Document:</span>
                          <img
                            src={request.receiptUrl}
                            alt="Invoice Receipt"
                            className="media-item h-[120px] w-40 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openMediaViewer(completedProofs, completedProofs.indexOf(request.receiptUrl!))}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Manager Inspection Report */}
          {(request.inspectionNotes || (request.inspectionPhotoUrls && request.inspectionPhotoUrls.length > 0)) && (
            <div className={`mb-6 rounded-[10px] border border-app-border p-4 ${
              request.inspectionApproved ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]'
            }`}>
              <h4 className={`mb-2.5 flex items-center gap-1.5 text-[13px] uppercase tracking-[0.05em] ${
                request.inspectionApproved ? 'text-emerald-500' : 'text-red-500'
              }`}>
                <Shield size={16} /> 
                {request.inspectionApproved ? 'Manager Inspection: Approved' : 'Manager Rework Required'}
              </h4>
              
              {request.inspectionNotes && (
                <p className="mb-3 whitespace-pre-wrap text-[13px] text-app-subtle">
                  <strong>Feedback Notes:</strong> {request.inspectionNotes}
                </p>
              )}

              {request.inspectionPhotoUrls && request.inspectionPhotoUrls.length > 0 && (
                <div>
                  <span className="mb-1 block text-[11px] text-app-muted">Evidential Inspection Media:</span>
                  <div className="media-container">
                    {request.inspectionPhotoUrls.map((url, idx) => {
                       const isVideo = isVideoUrl(url);
                      return isVideo ? (
                        <div 
                          key={idx} 
                          className="relative group cursor-pointer media-item h-[120px] w-40 flex items-center justify-center bg-black/20"
                          onClick={() => openMediaViewer(request.inspectionPhotoUrls!, idx)}
                        >
                          <video src={url} className="h-full w-full object-cover pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 rounded-lg transition-colors">
                            <span className="text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded">Play Video</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          key={idx}
                          src={url}
                          alt={`inspection-proof-${idx}`}
                          className="media-item h-[120px] w-40 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openMediaViewer(request.inspectionPhotoUrls!, idx)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline History */}
          <div>
            <h4 className="mb-2 text-[13px] uppercase tracking-[0.05em] text-app-muted">
              Audit History & Logs
            </h4>
            <div className="timeline">
              {request.progressLog.map((log, idx) => {
                const isActive = idx === request.progressLog.length - 1;
                return (
                  <div key={idx} className="timeline-item">
                    <div className={`timeline-dot ${isActive ? 'active' : ''}`} />
                    <div className="timeline-content">
                      <div className="timeline-time">{formatDate(log.timestamp)}</div>
                      <div className="timeline-note">{log.note}</div>
                      <div className="timeline-author">Updated by: {log.updatedBy}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions panel */}
          <div className="mt-8 border-t border-app-border pt-5">
            
            {/* 1. MANAGER CONTROLS */}
            {isManager && (
              <div>
                {request.status === 'pending' && (
                  <div>
                    <h4 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
                      <Wrench size={16} /> Assign Repair Vendor
                    </h4>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        className="filter-select min-w-0 flex-1 p-2.5"
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                      >
                        <option value="">-- Select Active Vendor --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.name} ({v.specialty})</option>
                        ))}
                      </select>
                      <button
                        className="glow-btn"
                        onClick={handleAssignVendor}
                        disabled={!selectedVendorId}
                      >
                        Dispatch Vendor
                      </button>
                    </div>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div>
                    {!request.inspectionApproved ? (
                      <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                          <Shield size={16} className="text-app-primary" /> Inspect Vendor's Completed Work
                        </h4>
                        <p className="mb-4 text-[13px] text-app-subtle">
                          Verify the repair. Upload evidential photos/videos of the work and approve it, or document issues and request re-work.
                        </p>

                        <div className="form-group">
                          <label className="form-label">Inspection Evidential Photos/Videos</label>
                          <label className="upload-zone min-h-[100px] gap-1.5 p-4">
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              className="hidden"
                              onChange={handleInspectionFileChange}
                              disabled={isInspectionUploading}
                            />
                            <Upload size={22} className="text-app-primary" />
                            <span className="text-xs font-semibold">
                              {isInspectionUploading ? 'Processing media...' : 'Upload Inspection Photos / Videos'}
                            </span>
                          </label>

                          {inspectionPhotos.length > 0 && (
                            <div className="preview-grid">
                              {inspectionPhotos.map((url, idx) => (
                                <div key={idx} className="relative">
                                  <img src={url} alt="inspection preview" className="preview-thumbnail" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInspectionPhoto(idx)}
                                    className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-0 bg-red-500 text-[10px] leading-none text-white"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Inspection Notes & Feedback</label>
                          <textarea
                            rows={3}
                            className="form-textarea"
                            placeholder="Detail your findings. (Required to Request Re-work, optional for approval)"
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button 
                            type="button" 
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-500 bg-app-raised px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/10"
                            onClick={handleRequestReWork}
                          >
                            Request Re-work (Fail)
                          </button>
                          <button 
                            type="button" 
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-gradient-to-br from-emerald-500 to-emerald-400 px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-px"
                            onClick={handleApproveWork}
                          >
                            Approve Work (Pass)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
                          <DollarSign size={16} className="text-emerald-500" /> Review and Settle Invoice
                        </h4>
                        <p className="mb-3 text-[13px] text-app-subtle">
                          Work has been approved. Review and adjust invoice breakdown if necessary before disbursing payment.
                        </p>
                        
                        <div className="mb-4 grid grid-cols-3 gap-3 rounded-[10px] border border-app-border bg-app-raised p-3">
                          <div className="form-group mb-0">
                            <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Parts ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input text-xs"
                              value={partsCost}
                              onChange={(e) => setPartsCost(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group mb-0">
                            <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Labor ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input text-xs"
                              value={laborCost}
                              onChange={(e) => setLaborCost(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group mb-0">
                            <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Other ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input text-xs"
                              value={otherCost}
                              onChange={(e) => setOtherCost(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-app-border/40 pt-3">
                          <div className="text-sm font-semibold">
                            Total Payout: <span className="text-base font-extrabold text-emerald-500">${((parseFloat(partsCost) || 0) + (parseFloat(laborCost) || 0) + (parseFloat(otherCost) || 0)).toFixed(2)}</span>
                          </div>
                          <button className="glow-btn px-5 py-2 text-xs" onClick={handleApprovePayment}>
                            Approve Payment & Close Ticket
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {request.status === 'paid' && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-500">
                    <CheckCircle2 size={20} />
                    <span className="text-[13px] font-semibold">This ticket has been resolved, fully paid, and archived.</span>
                  </div>
                )}
              </div>
            )}

            {/* 2. VENDOR CONTROLS */}
            {isVendor && (
              <div>
                {request.inspectionApproved === false && request.inspectionNotes && (
                  <div className="mb-4 rounded-[10px] border border-red-500/20 bg-red-500/5 p-4 text-[13px] text-red-400 animate-pulse">
                    <h5 className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-red-500">
                      ⚠️ Rework Requested by Facility Manager
                    </h5>
                    <p className="whitespace-pre-wrap text-app-subtle">
                      <strong>Reason/Feedback:</strong> {request.inspectionNotes}
                    </p>
                  </div>
                )}

                {request.status === 'assigned' && (
                  <div>
                    <h4 className="mb-2.5 text-sm font-semibold">Vendor Work Acceptance</h4>
                    <button className="glow-btn w-full" onClick={handleStartWork}>
                      Start Repair Work (On-Site)
                    </button>
                  </div>
                )}

                {request.status === 'in-progress' && (
                  <form onSubmit={handleCompleteWork}>
                    <h4 className="mb-2.5 text-sm font-semibold">Submit Work Completion Report</h4>
                    
                    <div className="form-row mb-3">
                      <div className="form-group">
                        <label className="form-label">Completion Proof Photo *</label>
                        <label className="upload-zone min-h-20 gap-1 p-3">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, 'completion')}
                          />
                          <Upload size={18} className="text-app-primary" />
                          <span className="text-[11px] font-semibold">Upload Completion Pic</span>
                        </label>
                        {completionPhoto && (
                          <img src={completionPhoto} alt="preview" className="mt-1.5 h-[60px] w-20 rounded object-cover" />
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Invoice/Receipt Upload</label>
                        <label className="upload-zone min-h-20 gap-1 p-3">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, 'receipt')}
                          />
                          <FileText size={18} className="text-app-muted" />
                          <span className="text-[11px] font-semibold">Upload Receipt/Invoice</span>
                        </label>
                        {receiptPhoto && (
                          <img src={receiptPhoto} alt="preview" className="mt-1.5 h-[60px] w-20 rounded object-cover" />
                        )}
                      </div>
                    </div>

                    <div className="mb-3 rounded-[10px] border border-app-border bg-app-raised p-3">
                      <label className="form-label mb-2 block font-semibold">Itemized Invoiced Costs</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="form-group mb-0">
                          <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Parts ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input text-xs"
                            value={partsCost}
                            onChange={(e) => setPartsCost(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Labor ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input text-xs"
                            value={laborCost}
                            onChange={(e) => setLaborCost(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label className="block mb-1 text-[10px] uppercase tracking-wider text-app-muted">Other ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input text-xs"
                            value={otherCost}
                            onChange={(e) => setOtherCost(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="mt-2.5 text-right text-xs font-semibold text-app-muted">
                        Total Invoiced: <span className="text-sm font-bold text-app-text">${((parseFloat(partsCost) || 0) + (parseFloat(laborCost) || 0) + (parseFloat(otherCost) || 0)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="form-label">Additional Dispatch Notes</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Replaced gaskets and checked pressure"
                        value={vendorLogNote}
                        onChange={(e) => setVendorLogNote(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-gradient-to-br from-emerald-500 to-emerald-400 px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50" disabled={isUploading}>
                      {isUploading ? 'Uploading proofs...' : 'Submit Completion Report'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Simulated vendor warn */}
            {!isVendor && isAssignedVendor && request.status !== 'paid' && request.status !== 'completed' && (
              <div className="rounded-md border border-dashed border-app-border p-2.5 text-center text-xs text-app-muted">
                This ticket is assigned to a different vendor. Switch active user/vendor at the top environment bar to resolve.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Media Viewer Carousel Modal */}
      {activeViewerMedia && activeViewerMedia.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={closeMediaViewer}
        >
          {/* Close button */}
          <button 
            className="absolute top-5 right-5 cursor-pointer rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300 z-10"
            onClick={closeMediaViewer}
          >
            <X size={24} />
          </button>

          {/* Carousel container */}
          <div className="relative flex h-[80vh] w-full max-w-5xl items-center justify-center px-12">
            {/* Left navigation */}
            {activeViewerMedia.length > 1 && (
              <button 
                className="absolute left-4 cursor-pointer rounded-full bg-white/10 p-3 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300"
                onClick={showPrevMedia}
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Active media container */}
            <div 
              className="flex h-full w-full items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {isVideoUrl(activeViewerMedia[activeViewerIndex]) ? (
                <video 
                  src={activeViewerMedia[activeViewerIndex]} 
                  controls 
                  autoPlay
                  className="max-h-full max-w-full rounded-lg shadow-2xl border border-white/10"
                />
              ) : (
                <img 
                  src={activeViewerMedia[activeViewerIndex]} 
                  alt={`viewer-media-${activeViewerIndex}`} 
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10 select-none animate-[zoomIn_0.2s_ease-out]"
                />
              )}
            </div>

            {/* Right navigation */}
            {activeViewerMedia.length > 1 && (
              <button 
                className="absolute right-4 cursor-pointer rounded-full bg-white/10 p-3 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300"
                onClick={showNextMedia}
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Indicator/Thumbnails */}
          {activeViewerMedia.length > 1 && (
            <div 
              className="mt-4 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {activeViewerMedia.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveViewerIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === activeViewerIndex ? 'w-8 bg-app-primary' : 'w-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Media Info (index/total) */}
          <div className="mt-2 text-xs font-semibold text-white/50">
            {activeViewerIndex + 1} of {activeViewerMedia.length}
          </div>
        </div>
      )}
    </div>
  );
};
