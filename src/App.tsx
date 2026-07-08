import React, { useState, useEffect } from 'react';
import { getStoredData, saveRequestsToStore, saveFacilitiesToStore, saveVendorsToStore } from './utils/mockData';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import {
  fetchOrganizations,
  fetchFacilities,
  fetchVendors,
  fetchUsers,
  fetchRequests
} from './utils/supabaseSync';
import { Organization, Facility, User, Vendor, RepairRequest } from './types';
import { TenantReportForm } from './components/TenantReportForm';
import { AuthScreen } from './components/AuthScreen';
import { QrScannerView } from './components/QrScannerView';
import { QrCodeManager } from './components/QrCodeManager';
import { DashboardStats } from './components/DashboardStats';
import { RequestList } from './components/RequestList';
import { RequestDetailsModal } from './components/RequestDetailsModal';
import {
  Building, Wrench, Shield, Sun, Moon, LayoutDashboard, QrCode, PlusCircle, CheckCircle2, UserCircle, Phone, Mail
} from 'lucide-react';

export default function App() {
  // State from LocalStorage
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);

  // Simulation Environment state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-4');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<'manager' | 'vendor' | 'tenant' | 'admin'>('manager');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // App navigation state
  // 'dashboard' | 'scanner' | 'qr-manager' | 'vendor-mgmt'
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Specific facility for Tenant Reporting Form (triggered by scanning QR)
  const [activeReportFacility, setActiveReportFacility] = useState<Facility | null>(null);

  // Selected request for details modal
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);

  // Dashboard filter state (from clicking metric cards)
  const [statsFilterStatus, setStatsFilterStatus] = useState<string>('all');

  // Toasts notification state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' }[]>([]);

  // Proper Auth States
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Math.floor(Math.random() * 1000000)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch profile and data helpers
  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        const userObj: User = {
          id: profile.id,
          organizationId: profile.organization_id || '',
          name: profile.name,
          email: profile.email,
          role: profile.role,
          vendorId: profile.vendor_id || undefined
        };
        setCurrentUser(userObj);
        setCurrentRole(profile.role);
        setSelectedOrgId(profile.organization_id || 'org-4');
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const data = getStoredData();
      setOrganizations(data.orgs);
      setFacilities(data.facilities);
      setVendors(data.vendors);
      setUsers(data.users);
      setRequests(data.requests);
      const defaultUser = data.users.find((u: User) => u.organizationId === 'org-4' && u.role === 'manager');
      if (defaultUser) {
        setCurrentUser(defaultUser);
        setCurrentRole('manager');
      }
      setIsAuthLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id).then(() => {
          loadSupabaseData();
        });
      } else {
        setIsAuthLoading(false);
      }
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await loadUserProfile(session.user.id);
          await loadSupabaseData();
        } else {
          setCurrentUser(null);
          setCurrentRole('tenant');
          setIsAuthLoading(false);
        }
      }
    );

    const loadSupabaseData = async () => {
      setIsAuthLoading(true);
      const [orgsDb, facilitiesDb, vendorsDb, usersDb, requestsDb] = await Promise.all([
        fetchOrganizations(),
        fetchFacilities(),
        fetchVendors(),
        fetchUsers(),
        fetchRequests()
      ]);

      if (orgsDb.length > 0) setOrganizations(orgsDb);
      if (facilitiesDb.length > 0) setFacilities(facilitiesDb);
      if (vendorsDb.length > 0) setVendors(vendorsDb);
      if (usersDb.length > 0) setUsers(usersDb);
      if (requestsDb.length > 0) setRequests(requestsDb);
      setIsAuthLoading(false);
    };

    return () => subscription.unsubscribe();
  }, []);

  // Realtime Supabase Subscription for automatic UI updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const requestsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_requests' },
        async (payload) => {
          console.log('Realtime DB change detected:', payload);
          const freshRequests = await fetchRequests();
          if (freshRequests.length > 0) {
            setRequests(freshRequests);
            setSelectedRequest(prev => {
              if (!prev) return null;
              const fresh = freshRequests.find(r => r.id === prev.id);
              return fresh || prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
    };
  }, [session]);

  // Sync dark mode class on document element
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  // Handle URL scanning routes (End-to-End Simulation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const facilityId = params.get('facilityId');
    const orgId = params.get('orgId');

    if (facilityId && orgId && facilities.length > 0) {
      const fac = facilities.find(f => f.id === facilityId && f.organizationId === orgId);
      if (fac) {
        // Automatically switch simulation to matching organization & tenant role
        setSelectedOrgId(orgId);
        setCurrentRole('tenant');
        const tenantUser = users.find(u => u.organizationId === orgId && u.role === 'tenant') || null;
        setCurrentUser(tenantUser);
        setActiveReportFacility(fac);
        setActiveTab('scanner');

        // Clean URL to prevent loop
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [facilities, users]);

  // Handle simulations and role changes
  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Find a matching user for this organization based on current role
    const matchedUser = users.find(u => u.organizationId === orgId && u.role === currentRole);
    if (matchedUser) {
      setCurrentUser(matchedUser);
    } else {
      // Fallback
      const anyUser = users.find(u => u.organizationId === orgId);
      if (anyUser) {
        setCurrentUser(anyUser);
        setCurrentRole(anyUser.role as any);
      } else {
        setCurrentUser(null);
      }
    }

    // Clear selections
    setActiveReportFacility(null);
    setSelectedRequest(null);
    setStatsFilterStatus('all');
  };

  const handleRoleChange = (role: 'manager' | 'vendor' | 'tenant' | 'admin') => {
    setCurrentRole(role);

    if (role === 'tenant') {
      const tenantUser = users.find(u => u.organizationId === selectedOrgId && u.role === 'tenant') || null;
      setCurrentUser(tenantUser);
      setActiveTab('scanner');
    } else if (role === 'vendor') {
      const vendorUser = users.find(u => u.organizationId === selectedOrgId && u.role === 'vendor') || null;
      setCurrentUser(vendorUser);
      setActiveTab('dashboard');
    } else if (role === 'manager') {
      const managerUser = users.find(u => u.organizationId === selectedOrgId && u.role === 'manager') || null;
      setCurrentUser(managerUser);
      setActiveTab('dashboard');
    } else if (role === 'admin') {
      const adminUser = users.find(u => u.role === 'admin') || null;
      setCurrentUser(adminUser);
      setActiveTab('dashboard');
    }

    // Reset report facility
    setActiveReportFacility(null);
    setSelectedRequest(null);
    setStatsFilterStatus('all');
  };

  // Add Request Handler
  const handleNewRequest = (newRequest: RepairRequest) => {
    const updated = [newRequest, ...requests];
    setRequests(updated);
    saveRequestsToStore(updated);
    addToast(`New ticket submitted: "${newRequest.title}" (${newRequest.urgency} urgency)`, 'success');
  };

  // Update Request Handler (Assignments, completions, payouts)
  const handleUpdateRequest = (updatedRequest: RepairRequest) => {
    const oldRequest = requests.find(r => r.id === updatedRequest.id);
    const updated = requests.map(r => r.id === updatedRequest.id ? updatedRequest : r);
    setRequests(updated);
    saveRequestsToStore(updated);
    setSelectedRequest(updatedRequest); // Refresh selection modal

    if (oldRequest && oldRequest.status !== updatedRequest.status) {
      if (updatedRequest.status === 'assigned') {
        const vendor = vendors.find(v => v.id === updatedRequest.assignedVendorId);
        addToast(`Ticket assigned to ${vendor ? vendor.name : 'vendor'}.`, 'info');
      } else if (updatedRequest.status === 'in-progress') {
        addToast(`Vendor accepted dispatch and initiated work.`, 'info');
      } else if (updatedRequest.status === 'completed') {
        if (updatedRequest.inspectionApproved) {
          addToast(`Manager approved inspection. Payout pending.`, 'success');
        } else {
          addToast(`Vendor submitted completion proofs. Inspection pending.`, 'success');
        }
      } else if (updatedRequest.status === 'paid') {
        addToast(`Invoice settled. Digital payout of $${updatedRequest.cost?.toFixed(2)} dispatched.`, 'success');
      }
    } else if (oldRequest && oldRequest.status === updatedRequest.status) {
      // Check inspection changes
      if (oldRequest.inspectionApproved !== updatedRequest.inspectionApproved) {
        if (updatedRequest.inspectionApproved === true) {
          addToast(`Manager approved inspection. Payout pending.`, 'success');
        } else if (updatedRequest.inspectionApproved === false && updatedRequest.inspectionNotes) {
          addToast(`Manager rejected work. Rework requested.`, 'warning');
        }
      } else if (oldRequest.status === 'in-progress' && oldRequest.inspectionApproved === false && updatedRequest.inspectionApproved === false && oldRequest.progressLog.length < updatedRequest.progressLog.length) {
        addToast(`Vendor re-started work.`, 'info');
      }
    }
  };

  // Onboard new facility
  const handleAddFacility = (newFac: Facility) => {
    const updated = [...facilities, newFac];
    setFacilities(updated);
    saveFacilitiesToStore(updated);
  };

  // Onboard new vendor
  const handleAddVendor = (newVendor: Vendor) => {
    const updated = [...vendors, newVendor];
    setVendors(updated);
    saveVendorsToStore(updated);
  };

  // Simulate scanning of QR code (opens reporting screen)
  const handleSimulateScan = (facilityId: string) => {
    const fac = facilities.find(f => f.id === facilityId);
    if (fac) {
      setActiveReportFacility(fac);
      setActiveTab('scanner');
    }
  };

  // QR scanner redirection handler
  const handleScanSuccess = (facilityId: string) => {
    const fac = facilities.find(f => f.id === facilityId);
    if (fac) {
      setActiveReportFacility(fac);
    }
  };

  // Ticket Lookup Handler
  const handleTrackTicket = (ticketId: string) => {
    const req = requests.find(r => r.id.toLowerCase() === ticketId.toLowerCase());
    if (req) {
      setSelectedRequest(req);
    } else {
      alert(`Ticket ID "${ticketId}" was not found in database.`);
    }
  };

  // Vendor Management View State
  const [newVenName, setNewVenName] = useState('');
  const [newVenSpecialty, setNewVenSpecialty] = useState('');
  const [newVenEmail, setNewVenEmail] = useState('');
  const [newVenPhone, setNewVenPhone] = useState('');

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenName.trim() || !newVenSpecialty.trim()) return;
    const newId = `ven-${Math.floor(100 + Math.random() * 900)}`;
    const newVendor: Vendor = {
      id: newId,
      organizationId: selectedOrgId,
      name: newVenName,
      specialty: newVenSpecialty,
      email: newVenEmail,
      phone: newVenPhone,
      active: true
    };

    // Create simulated user account for vendor to sign in
    const newVendorUser: User = {
      id: `usr-ven-${Math.floor(100 + Math.random() * 900)}`,
      organizationId: selectedOrgId,
      name: `${newVenName} (Vendor)`,
      email: newVenEmail,
      role: 'vendor',
      vendorId: newId
    };

    handleAddVendor(newVendor);

    const updatedUsers = [...users, newVendorUser];
    setUsers(updatedUsers);
    localStorage.setItem('fm_users', JSON.stringify(updatedUsers));

    setNewVenName('');
    setNewVenSpecialty('');
    setNewVenEmail('');
    setNewVenPhone('');
    alert('Vendor profile and login credentials created successfully!');
  };

  const currentOrg = organizations.find(o => o.id === selectedOrgId);

  const getVisibleRequests = () => {
    if (currentRole === 'vendor' && currentUser?.vendorId) {
      return requests.filter(r => r.organizationId === selectedOrgId && r.assignedVendorId === currentUser.vendorId);
    }
    return requests.filter(r => r.organizationId === selectedOrgId);
  };

  const visibleRequests = getVisibleRequests();
  const orgVendors = vendors.filter(v => v.organizationId === selectedOrgId);

  if (isSupabaseConfigured && isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs font-semibold text-app-muted">Loading secure session...</span>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <div className="app-container">

      {/* Production Auth Status Bar */}
      {isSupabaseConfigured && (
        <div className="demo-bar justify-between">
          <div className="demo-bar-title">
            <Shield size={16} className="text-emerald-500 animate-pulse" /> 
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Secure Supabase Auth Mode</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-app-muted pr-3">
            <span>Org ID: <strong className="text-white">{selectedOrgId}</strong></span>
            <span>Role: <strong className="text-white">{currentRole.toUpperCase()}</strong></span>
          </div>
        </div>
      )}

      {/* Fallback Simulation Control Bar */}
      {!isSupabaseConfigured && (
        <div className="demo-bar">
          <div className="demo-bar-title">
            <Shield size={16} /> <span>Antigravity Multitenant Sandbox Environment</span>
          </div>
          <div className="demo-selectors">
            <div className="demo-selector-group">
              <span>Org:</span>
              <select
                className="demo-select"
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div className="demo-selector-group">
              <span>User Persona:</span>
              <select
                className="demo-select"
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value as any)}
              >
                <option value="tenant">Resident / Tenant (QR Scanner)</option>
                <option value="manager">Sarah/David (Facility Manager)</option>
                <option value="vendor">John/Marcus (Contractor Vendor)</option>
                <option value="admin">Alexander (Global SysAdmin)</option>
              </select>
            </div>

            {currentUser && (
              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                <UserCircle size={14} /> Signed in as: <strong>{currentUser.name}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="header">
        <div className="logo-container" onClick={() => setActiveTab('dashboard')}>
          <div className="logo-icon">
            <Building size={20} />
          </div>
          <span className="logo-text">FaciliTrack</span>
        </div>

        {currentRole !== 'tenant' ? (
          <nav className="nav-menu">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setActiveReportFacility(null); }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              className={`nav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => { setActiveTab('scanner'); setActiveReportFacility(null); }}
            >
              <QrCode size={16} /> Scan QR Portal
            </button>
            <button
              className={`nav-btn ${activeTab === 'qr-manager' ? 'active' : ''}`}
              onClick={() => { setActiveTab('qr-manager'); setActiveReportFacility(null); }}
            >
              <PlusCircle size={16} /> QR Flyer Codes
            </button>
            <button
              className={`nav-btn ${activeTab === 'vendor-mgmt' ? 'active' : ''}`}
              onClick={() => { setActiveTab('vendor-mgmt'); setActiveReportFacility(null); }}
            >
              <Wrench size={16} /> Vendors List
            </button>
          </nav>
        ) : (
          <div className="flex items-center gap-2 text-[13px] font-bold text-app-primary">
            <QrCode size={16} /> Mobile Repair Hotspot
          </div>
        )}

        <div className="user-profile">
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="user-badge">
            <div className="user-avatar" style={{ background: currentOrg?.themeColor || 'var(--primary)' }}>
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden text-left md:block">
              <div className="user-info-text">{currentUser?.name || 'User'}</div>
              <div className="user-role-label">{currentUser?.role.toUpperCase()} • {currentOrg?.name}</div>
            </div>
          </div>
          {isSupabaseConfigured && (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">

        {/* TENANT PORTAL - DIRECT MOBILE FIRST RESPONSIVE CONTAINER */}
        {currentRole === 'tenant' ? (
          <div className="mx-auto mb-10 w-full max-w-[600px] animate-[fadeIn_0.4s_ease]">
            <div className="glass-panel mb-6 text-center">
              <h2 className="mb-2 text-2xl text-app-primary">Scan QR / Ticket Tracker</h2>
              <p className="text-[13px] text-app-subtle">
                Report leaks, AC system issues, or electrical hazards at Lehigh Companion Care homes.
              </p>
            </div>

            {activeReportFacility ? (
              <TenantReportForm
                facility={activeReportFacility}
                onSubmitted={handleNewRequest}
                onCancel={() => setActiveReportFacility(null)}
              />
            ) : (
              <QrScannerView
                facilities={facilities}
                organizations={organizations}
                onScanSuccess={handleScanSuccess}
                onTrackTicket={handleTrackTicket}
              />
            )}
          </div>
        ) : (

          /* ADMINISTRATIVE VIEWS (MANAGER / VENDOR / SYSADMIN) */
          <div>

            {/* View 1: DASHBOARD STATS & TICKET LISTING */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[28px] leading-tight">{currentOrg?.name} Operational Hub</h1>
                    <p className="text-app-subtle">
                      Overview of facility repairs, dispatched vendors, and invoices.
                    </p>
                  </div>
                  {currentRole === 'manager' && (
                    <button
                      className="glow-btn"
                      onClick={() => setActiveTab('qr-manager')}
                    >
                      <QrCode size={16} /> Deploy QR Code
                    </button>
                  )}
                </div>

                {/* Dashboard Metrics charts */}
                <DashboardStats
                  requests={visibleRequests}
                  selectedOrgId={selectedOrgId}
                  activeFilterStatus={statsFilterStatus}
                  onFilterStatusChange={setStatsFilterStatus}
                />

                {/* Ticket listing grid */}
                <div className="glass-panel mt-6">
                  <div className="mb-[18px] flex items-center justify-between">
                    <h2 className="text-lg">
                      Repair Requests
                      {statsFilterStatus !== 'all' && (
                        <span className="ml-2 text-[13px] capitalize text-app-primary">
                          ({statsFilterStatus} filter active)
                        </span>
                      )}
                    </h2>
                  </div>
                  <RequestList
                    requests={visibleRequests}
                    facilities={facilities}
                    selectedOrgId={selectedOrgId}
                    activeFilterStatus={statsFilterStatus}
                    onRequestClick={(req) => setSelectedRequest(req)}
                  />
                </div>
              </div>
            )}

            {/* View 2: SCAN QR PORTAL */}
            {activeTab === 'scanner' && (
              <div className="py-5">
                <QrScannerView
                  facilities={facilities}
                  organizations={organizations}
                  onScanSuccess={handleScanSuccess}
                  onTrackTicket={handleTrackTicket}
                />

                {activeReportFacility && (
                  <div className="mx-auto mt-5 max-w-[480px]">
                    <TenantReportForm
                      facility={activeReportFacility}
                      onSubmitted={handleNewRequest}
                      onCancel={() => setActiveReportFacility(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* View 3: QR CODE MANAGER */}
            {activeTab === 'qr-manager' && (
              <QrCodeManager
                facilities={facilities}
                organizations={organizations}
                selectedOrgId={selectedOrgId}
                onAddFacility={handleAddFacility}
                onSimulateQrClick={handleSimulateScan}
              />
            )}

            {/* View 4: VENDOR MANAGEMENT */}
            {activeTab === 'vendor-mgmt' && (
              <div className="vendor-page w-full">
                <div className="vendor-page-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-[22px] leading-tight text-app-text">Vendor & Contractor Registry</h2>
                    <p className="max-w-3xl text-[13px] text-app-subtle">
                      Onboard and assign local tradespeople for plumbing, electrical, safety, and HVAC services.
                    </p>
                  </div>
                </div>

                <div className="vendor-layout grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)] lg:gap-6">
                  {/* Register Vendor */}
                  <section className="glass-panel vendor-form-panel m-0 p-[18px] lg:sticky lg:top-24 lg:p-6">
                    <h3 className="mb-3.5 text-base leading-snug">Onboard New Contractor</h3>
                    <form onSubmit={handleVendorSubmit}>
                      <div className="form-group">
                        <label className="form-label">Contracting Firm Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Apex Electrical Services"
                          value={newVenName}
                          onChange={(e) => setNewVenName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Trade / Specialty *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Heating & Aircon Repair"
                          value={newVenSpecialty}
                          onChange={(e) => setNewVenSpecialty(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="dispatch@contractor.com"
                          value={newVenEmail}
                          onChange={(e) => setNewVenEmail(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="512-555-0199"
                          value={newVenPhone}
                          onChange={(e) => setNewVenPhone(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="glow-btn vendor-submit-btn min-h-11 w-full">
                        Save Vendor Profile
                      </button>
                    </form>
                  </section>

                  {/* Vendors Grid */}
                  <section className="glass-panel vendor-list-panel m-0 p-[18px] lg:p-6">
                    <div className="vendor-list-header flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base leading-snug">Registered Contractors</h3>
                        <p className="mt-0.5 text-xs text-app-muted">{currentOrg?.name}</p>
                      </div>
                      <span className="vendor-count-badge inline-flex min-h-6 items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                        {orgVendors.length} Active
                      </span>
                    </div>

                    <div className="vendor-list grid grid-cols-1 gap-3">
                      {orgVendors.length === 0 ? (
                        <div className="vendor-empty-state rounded-[10px] border border-dashed border-app-border p-5 text-center text-[13px] text-app-subtle">
                          No vendors are registered for this organization yet.
                        </div>
                      ) : (
                        orgVendors.map(vendor => (
                          <article key={vendor.id} className="vendor-card min-w-0 rounded-[10px] border border-app-border bg-app-raised p-3.5">
                            <div className="vendor-card-main min-w-0">
                              <div className="vendor-card-title-row flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="break-words text-[15px] leading-snug text-app-text">{vendor.name}</h4>
                                <span className="vendor-status inline-flex min-h-6 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold leading-none text-emerald-500">
                                  <CheckCircle2 size={12} /> Active
                                </span>
                              </div>
                              <div className="vendor-specialty mt-1.5 break-words text-xs font-bold text-app-primary">
                                {vendor.specialty}
                              </div>
                              <div className="vendor-contact-list mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-app-muted sm:grid-cols-2">
                                <span className="vendor-contact-item flex min-w-0 items-center gap-1.5 break-words">
                                  <Phone size={13} /> {vendor.phone || 'No phone'}
                                </span>
                                <span className="vendor-contact-item flex min-w-0 items-center gap-1.5 break-words">
                                  <Mail size={13} /> {vendor.email || 'No email'}
                                </span>
                                <span>📞 {vendor.phone || 'No phone'}</span>
                                <span>✉️ {vendor.email || 'No email'}</span>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Ticket detail modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          facility={facilities.find(f => f.id === selectedRequest.facilityId)!}
          vendors={vendors.filter(v => v.organizationId === selectedRequest.organizationId)}
          currentUser={currentUser}
          onClose={() => setSelectedRequest(null)}
          onUpdateRequest={handleUpdateRequest}
        />
      )}

      {/* Toast notifications container */}
      <div className="toasts-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type} animate-[slideInRight_0.25s_ease-out]`}>
            <div className="flex items-center gap-2.5">
              <span className="toast-icon">
                {toast.type === 'success' && '✓'}
                {toast.type === 'info' && '🛈'}
                {toast.type === 'warning' && '⚠️'}
              </span>
              <div className="flex-1 text-[13px] font-medium leading-normal">
                {toast.message}
              </div>
              <button
                className="ml-auto text-app-muted hover:text-app-text border-0 bg-transparent cursor-pointer p-1 px-1.5 text-[13px]"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-app-border bg-app-surface px-6 py-5 text-center text-xs text-app-muted">
        FaciliTrack &copy; 2026.
      </footer>

    </div>
  );
}
