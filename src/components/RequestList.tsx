import React, { useState } from 'react';
import { RepairRequest, Facility, Organization } from '../types';
import { Search, MapPin, Calendar, Wrench, Image, Video, CheckCircle2 } from 'lucide-react';

interface RequestListProps {
  requests: RepairRequest[];
  facilities: Facility[];
  organizations?: Organization[];
  selectedOrgId: string;
  activeFilterStatus: string; // 'all', 'pending', 'active', 'completed', 'paid'
  onRequestClick: (request: RepairRequest) => void;
  isVendorView?: boolean;
  selectedOrgFilter?: string;
  onOrgFilterChange?: (orgId: string) => void;
}

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  facilities,
  organizations = [],
  selectedOrgId,
  activeFilterStatus,
  onRequestClick,
  isVendorView = false,
  selectedOrgFilter = 'all',
  onOrgFilterChange
}) => {
  const [search, setSearch] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'urgency'>('newest');

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Org Filter
    if (isVendorView) {
      if (selectedOrgFilter !== 'all' && req.organizationId !== selectedOrgFilter) return false;
    } else {
      if (req.organizationId !== selectedOrgId) return false;
    }

    // Status Filter (from metric cards)
    if (activeFilterStatus === 'pending' && req.status !== 'pending') return false;
    if (activeFilterStatus === 'active' && req.status !== 'assigned' && req.status !== 'in-progress') return false;
    if (activeFilterStatus === 'completed' && req.status !== 'completed') return false;
    if (activeFilterStatus === 'paid' && req.status !== 'paid') return false;

    // Facility Filter
    if (selectedFacilityId !== 'all' && req.facilityId !== selectedFacilityId) return false;

    // Category Filter
    if (selectedCategory !== 'all' && req.category !== selectedCategory) return false;

    // Urgency Filter
    if (selectedUrgency !== 'all' && req.urgency !== selectedUrgency) return false;

    // Text Search
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchId = req.id.toLowerCase().includes(q);
      const matchReporter = req.reporterName.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchId || matchReporter;
    }

    return true;
  });

  // Sort requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'urgency') {
      const urgencyWeight = { emergency: 4, high: 3, medium: 2, low: 1 };
      const weightA = urgencyWeight[a.urgency] || 0;
      const weightB = urgencyWeight[b.urgency] || 0;
      return weightB - weightA;
    }
    return 0;
  });

  // Helper to get Facility Name
  const getFacilityName = (facilityId: string) => {
    const fac = facilities.find((f) => f.id === facilityId);
    return fac ? fac.name : 'Unknown Facility';
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease]">
      {/* Filters Area */}
      <div className="glass-panel mb-5 p-4">
        <div className="list-filters">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by ID, title, description, resident..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isVendorView && (
            <select
              className="filter-select"
              value={selectedOrgFilter}
              onChange={(e) => {
                if (onOrgFilterChange) onOrgFilterChange(e.target.value);
                setSelectedFacilityId('all');
              }}
            >
              <option value="all">All Client Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}

          <select
            className="filter-select"
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
          >
            <option value="all">All Facilities</option>
            {facilities
              .filter((f) => isVendorView ? (selectedOrgFilter === 'all' || f.organizationId === selectedOrgFilter) : f.organizationId === selectedOrgId)
              .map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </select>

          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="structural">Structural</option>
            <option value="appliance">Appliance</option>
            <option value="safety">Safety / Alarm</option>
            <option value="other">Other</option>
          </select>

          <select
            className="filter-select"
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
          >
            <option value="all">All Urgencies</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
          </select>

          <select
            className="filter-select sm:ml-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="urgency">Sort: Urgency Level</option>
          </select>
        </div>
      </div>

      {/* Requests Display */}
      {sortedRequests.length === 0 ? (
        <div className="glass-panel p-[60px] text-center">
          <Wrench size={40} className="mx-auto mb-3 text-app-muted" />
          <h3 className="mb-1.5 text-lg">No Repair Requests Found</h3>
          <p className="text-[13px] text-app-subtle">
            Try modifying your search query or dropdown filter selections.
          </p>
        </div>
      ) : (
        <div className="requests-grid">
          {sortedRequests.map((req) => {
            const hasImages = req.mediaUrls.some(url => url.startsWith('data:image'));
            const hasVideos = req.mediaUrls.some(url => url.startsWith('data:video'));
            const isAssigned = !!req.assignedVendorId;

            return (
              <div key={req.id} className="request-card" onClick={() => onRequestClick(req)}>
                <div>
                  <div className="request-card-header">
                    <span className="rounded bg-app-primary-glow px-2 py-0.5 font-mono text-[11px] font-extrabold text-app-primary">
                      {req.id}
                    </span>
                    <span className={`status-badge ${req.status}`}>
                      {req.status === 'in-progress' ? 'In Progress' : req.status}
                    </span>
                  </div>

                  <h3 className="request-title">{req.title}</h3>
                  
                  <div className="my-2 flex items-center gap-1 text-xs text-app-muted">
                    <MapPin size={12} />
                    <span>{getFacilityName(req.facilityId)}</span>
                  </div>

                  <p className="request-desc">{req.description}</p>
                </div>

                <div className="request-meta-row">
                  <div className="flex items-center gap-2">
                    <span className={`urgency-badge ${req.urgency}`}>{req.urgency}</span>
                    <span className="font-semibold capitalize text-app-subtle">
                      {req.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasImages && <span title="Includes photos" className="flex"><Image size={14} className="text-app-muted" /></span>}
                    {hasVideos && <span title="Includes videos" className="flex"><Video size={14} className="text-app-muted" /></span>}
                    {isAssigned && <span title="Vendor Assigned" className="flex"><Wrench size={14} className="text-app-primary" /></span>}
                    {req.status === 'paid' && <span title="Paid & Closed" className="flex"><CheckCircle2 size={14} className="text-emerald-500" /></span>}
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar size={11} />
                      <span>{formatDate(req.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
