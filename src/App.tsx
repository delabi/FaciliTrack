import React, { useState, useEffect } from 'react';
import { getStoredData, saveRequestsToStore, saveFacilitiesToStore, saveVendorsToStore } from './utils/mockData';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import {
  fetchOrganizations,
  fetchFacilities,
  fetchVendors,
  fetchUsers,
  fetchRequests,
  fetchVendorAffiliations,
  fetchVendorInvitations,
  fetchMemberInvitations,
  MemberInvitation
} from './utils/supabaseSync';
import { Organization, Facility, User, Vendor, RepairRequest, VendorAffiliation, VendorInvitation } from './types';
import { TenantReportForm } from './components/TenantReportForm';
import { AuthScreen } from './components/AuthScreen';
import { QrScannerView } from './components/QrScannerView';
import { QrCodeManager } from './components/QrCodeManager';
import { DashboardStats } from './components/DashboardStats';
import { RequestList } from './components/RequestList';
import { RequestDetailsModal } from './components/RequestDetailsModal';
import {
  Building, Wrench, Shield, Sun, Moon, LayoutDashboard, QrCode, PlusCircle, CheckCircle2, UserCircle, Phone, Mail, Clock
} from 'lucide-react';

export default function App() {
  // Platform invitation and affiliation states
  const [vendorAffiliations, setVendorAffiliations] = useState<VendorAffiliation[]>([]);
  const [vendorInvitations, setVendorInvitations] = useState<VendorInvitation[]>([]);
  const [memberInvitations, setMemberInvitations] = useState<MemberInvitation[]>([]);

  // Local state for platform administration forms
  const [newOrgNameAdmin, setNewOrgNameAdmin] = useState('');
  const [newOrgColor, setNewOrgColor] = useState('#4f46e5');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgAdminName, setNewOrgAdminName] = useState('');
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [newOrgAdminPhone, setNewOrgAdminPhone] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newFacilityAddress, setNewFacilityAddress] = useState('');
  const [newFacilityDesc, setNewFacilityDesc] = useState('');

  const [newVenName, setNewVenName] = useState('');
  const [newVenSpecialty, setNewVenSpecialty] = useState('');
  const [newVenEmail, setNewVenEmail] = useState('');
  const [newVenPhone, setNewVenPhone] = useState('');
  const [activeInviteLink, setActiveInviteLink] = useState<string | null>(null);

  // States for SuperAdmin user profiles editor
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'superadmin' | 'admin' | 'manager' | 'vendor'>('manager');
  const [editUserOrgId, setEditUserOrgId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization? This will permanently delete all associated facilities, requests, and contractor affiliations.")) return;

    if (isSupabaseConfigured) {
      const { error: reqErr } = await supabase.from('repair_requests').delete().eq('organization_id', orgId);
      const { error: facErr } = await supabase.from('facilities').delete().eq('organization_id', orgId);
      const { error: affErr } = await supabase.from('vendor_affiliations').delete().eq('organization_id', orgId);
      const { error: invErr } = await supabase.from('vendor_invitations').delete().eq('organization_id', orgId);
      const { error: memErr } = await supabase.from('member_invitations').delete().eq('organization_id', orgId);

      const { error } = await supabase.from('organizations').delete().eq('id', orgId);
      if (error) {
        addToast(`Error deleting organization: ${error.message}`, 'warning');
      } else {
        addToast('Organization deleted successfully!', 'success');
        setOrganizations(prev => prev.filter(o => o.id !== orgId));
      }
    } else {
      const stored = getStoredData();
      const updatedOrgs = stored.orgs.filter((o: any) => o.id !== orgId);
      const updatedFacs = stored.facilities.filter((f: any) => f.organizationId !== orgId);
      const updatedReqs = stored.requests.filter((r: any) => r.organizationId !== orgId);
      
      localStorage.setItem('fm_v3_orgs', JSON.stringify(updatedOrgs));
      localStorage.setItem('fm_v3_facilities', JSON.stringify(updatedFacs));
      localStorage.setItem('fm_v3_requests', JSON.stringify(updatedReqs));
      
      setOrganizations(updatedOrgs);
      setFacilities(updatedFacs);
      setRequests(updatedReqs);
      addToast('Organization deleted locally!', 'success');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user account completely?")) return;
    
    if (isSupabaseConfigured) {
      try {
        const { error: fnError } = await supabase.functions.invoke('send-invite', {
          body: {
            action: 'delete-user',
            userId
          }
        });

        if (fnError) {
          addToast(`Failed to delete account: ${fnError.message}`, 'warning');
          return;
        }
        
        addToast('User account deleted successfully!', 'success');
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        addToast('Error communicating with accounts service.', 'warning');
      }
    } else {
      const stored = getStoredData();
      const updatedUsers = stored.users.filter((u: any) => u.id !== userId);
      localStorage.setItem('fm_v3_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      addToast('User deleted locally!', 'success');
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (isSupabaseConfigured) {
      try {
        const { error: fnError } = await supabase.functions.invoke('send-invite', {
          body: {
            action: 'update-user',
            userId: editingUser.id,
            name: editUserName,
            role: editUserRole,
            orgId: editUserOrgId || null
          }
        });

        if (fnError) {
          addToast(`Failed to update account: ${fnError.message}`, 'warning');
          return;
        }

        addToast('User profile updated successfully!', 'success');
        const freshUsers = await fetchUsers();
        setUsers(freshUsers);
        setEditingUser(null);
      } catch (err) {
        addToast('Error communicating with accounts service.', 'warning');
      }
    } else {
      const stored = getStoredData();
      const updatedUsers = stored.users.map((u: any) => 
        u.id === editingUser.id 
          ? { ...u, name: editUserName, role: editUserRole, organizationId: editUserOrgId || null } 
          : u
      );
      localStorage.setItem('fm_v3_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      setEditingUser(null);
      addToast('User updated locally!', 'success');
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
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

    if (isSupabaseConfigured) {
      const { error: venError } = await supabase.from('vendors').insert({
        id: newId,
        organization_id: selectedOrgId,
        name: newVenName,
        specialty: newVenSpecialty,
        email: newVenEmail,
        phone: newVenPhone,
        active: true
      });
      if (venError) {
        addToast(`Error saving vendor: ${venError.message}`, 'warning');
        return;
      }
      
      await supabase.from('vendor_affiliations').insert({
        vendor_id: newId,
        organization_id: selectedOrgId
      });

      addToast('Vendor profile onboarded and affiliated!', 'success');

      // Dispatch actual email invite via Supabase Edge Function
      if (newVenEmail.trim()) {
        try {
          const { error: fnError } = await supabase.functions.invoke('send-invite', {
            body: {
              email: newVenEmail.trim(),
              role: 'vendor',
              orgId: selectedOrgId,
              vendorId: newId
            }
          });
          if (fnError) {
            console.warn('Edge function failed:', fnError);
            let errorMsg = fnError.message;
            try {
              const errBody = await fnError.context.json();
              if (errBody && errBody.error) errorMsg = errBody.error;
            } catch (e) {}
            addToast(`Mailer notice: ${errorMsg}. Copy link manually.`, 'warning');
          } else {
            addToast('Vendor invitation email dispatched!', 'success');
          }
        } catch (err) {
          console.warn('Edge function error:', err);
          addToast('Could not reach invite service. Fallback link generated.', 'info');
        }
      }

      const [freshVendors, freshAffils] = await Promise.all([
        fetchVendors(),
        fetchVendorAffiliations()
      ]);
      setVendors(freshVendors);
      setVendorAffiliations(freshAffils);
    } else {
      handleAddVendor(newVendor);
      addToast('Vendor profile added locally!', 'success');
    }

    if (newVenEmail.trim()) {
      const inviteLink = `${window.location.origin}/signup?inviteType=vendor&email=${encodeURIComponent(newVenEmail.trim())}`;
      setActiveInviteLink(inviteLink);
    }

    setNewVenName('');
    setNewVenSpecialty('');
    setNewVenEmail('');
    setNewVenPhone('');
  };

  // SuperAdmin: Create Organization
  const handleCreateOrgAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgNameAdmin.trim() || !newOrgAdminEmail.trim() || !newOrgAdminName.trim()) {
      addToast('Organization Name, Admin Name, and Admin Email are required.', 'warning');
      return;
    }
    const generatedOrgId = `org-${Math.floor(Math.random() * 1000000)}`;

    if (isSupabaseConfigured) {
      const { error: orgError } = await supabase.from('organizations').insert({
        id: generatedOrgId,
        name: newOrgNameAdmin.trim(),
        theme_color: newOrgColor,
        address: newOrgAddress.trim() || null,
        phone: newOrgAdminPhone.trim() || null
      });

      if (orgError) {
        addToast(`Error creating organization: ${orgError.message}`, 'warning');
        return;
      }

      await supabase.from('member_invitations').insert({
        organization_id: generatedOrgId,
        email: newOrgAdminEmail.trim(),
        role: 'admin'
      });

      try {
        const { error: fnError } = await supabase.functions.invoke('send-invite', {
          body: {
            email: newOrgAdminEmail.trim(),
            role: 'admin',
            orgId: generatedOrgId
          }
        });
        if (fnError) {
          console.warn('Edge function failed:', fnError);
          let errorMsg = fnError.message;
          try {
            const errBody = await fnError.context.json();
            if (errBody && errBody.error) errorMsg = errBody.error;
          } catch (e) {}
          addToast(`Mailer notice: ${errorMsg}. Copy link manually.`, 'warning');
        } else {
          addToast('Organization created & Admin invitation email dispatched!', 'success');
        }
      } catch (err) {
        console.warn('Edge function error:', err);
        addToast('Could not reach invite service. Fallback link generated.', 'info');
      }

      const freshOrgs = await fetchOrganizations();
      setOrganizations(freshOrgs);
    } else {
      const newOrg: Organization = {
        id: generatedOrgId,
        name: newOrgNameAdmin.trim(),
        themeColor: newOrgColor,
        address: newOrgAddress.trim() || undefined,
        phone: newOrgAdminPhone.trim() || undefined
      };
      
      const stored = getStoredData();
      const updatedOrgs = [...stored.orgs, newOrg];
      localStorage.setItem('fm_v3_orgs', JSON.stringify(updatedOrgs));
      setOrganizations(updatedOrgs);
      addToast('Organization created locally!', 'success');
    }

    const inviteLink = `${window.location.origin}/signup?inviteType=member&email=${encodeURIComponent(newOrgAdminEmail.trim())}`;
    setActiveInviteLink(inviteLink);

    setNewOrgNameAdmin('');
    setNewOrgAddress('');
    setNewOrgAdminName('');
    setNewOrgAdminEmail('');
    setNewOrgAdminPhone('');
  };

  // OrgAdmin: Invite Manager
  const handleInviteManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerEmail.trim()) return;

    if (isSupabaseConfigured) {
      try {
        const { error: fnError } = await supabase.functions.invoke('send-invite', {
          body: {
            email: newManagerEmail.trim(),
            role: 'manager',
            orgId: selectedOrgId
          }
        });
        if (fnError) {
          console.warn('Edge function failed:', fnError);
          let errorMsg = fnError.message;
          try {
            const errBody = await fnError.context.json();
            if (errBody && errBody.error) errorMsg = errBody.error;
          } catch (e) {}
          addToast(`Mailer notice: ${errorMsg}. Copy link manually.`, 'warning');
        } else {
          addToast('Manager invitation email dispatched!', 'success');
        }
      } catch (err) {
        console.warn('Edge function error:', err);
        addToast('Could not reach invite service. Fallback link generated.', 'info');
      }
    }

    const { error } = await supabase.from('member_invitations').insert({
      organization_id: selectedOrgId,
      email: newManagerEmail.trim(),
      role: 'manager'
    });
    if (error) {
      addToast(`Error tracking invite: ${error.message}`, 'warning');
    } else {
      const inviteLink = `${window.location.origin}/signup?inviteType=member&email=${encodeURIComponent(newManagerEmail.trim())}`;
      setActiveInviteLink(inviteLink);
      setNewManagerEmail('');
      const freshInvites = await fetchMemberInvitations();
      setMemberInvitations(freshInvites);
    }
  };

  // OrgAdmin: Invite Vendor to affiliate
  const handleInviteVendor = async (vendorEmail: string) => {
    const { error } = await supabase.from('vendor_invitations').insert({
      organization_id: selectedOrgId,
      email: vendorEmail,
      status: 'pending'
    });
    if (error) {
      addToast(`Error: ${error.message}`, 'warning');
    } else {
      addToast('Affiliation invitation sent to vendor!', 'success');
      const freshInvites = await fetchVendorInvitations();
      setVendorInvitations(freshInvites);
    }
  };

  // Vendor: Accept Invitation
  const handleAcceptInvite = async (inviteId: string, orgId: string) => {
    if (!currentUser?.vendorId) return;
    const { error: affError } = await supabase.from('vendor_affiliations').insert({
      vendor_id: currentUser.vendorId,
      organization_id: orgId
    });
    if (affError) {
      addToast(`Error: ${affError.message}`, 'warning');
      return;
    }
    await supabase.from('vendor_invitations').update({ status: 'accepted' }).eq('id', inviteId);
    addToast('Invitation accepted! You can now handle jobs for this organization.', 'success');
    
    const [freshAffils, freshInvites, freshRequests] = await Promise.all([
      fetchVendorAffiliations(),
      fetchVendorInvitations(),
      fetchRequests()
    ]);
    setVendorAffiliations(freshAffils);
    setVendorInvitations(freshInvites);
    setRequests(freshRequests);
  };

  // Vendor: Decline Invitation
  const handleDeclineInvite = async (inviteId: string) => {
    await supabase.from('vendor_invitations').update({ status: 'declined' }).eq('id', inviteId);
    addToast('Invitation declined.', 'info');
    const freshInvites = await fetchVendorInvitations();
    setVendorInvitations(freshInvites);
  };

  // OrgAdmin: Add Facility
  const handleCreateFacilityOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacilityName.trim() || !newFacilityAddress.trim()) return;
    const generatedId = `fac-${Math.floor(Math.random() * 1000000)}`;
    const newFacUrl = `/report?facilityId=${generatedId}&orgId=${selectedOrgId}`;
    
    const { error } = await supabase.from('facilities').insert({
      id: generatedId,
      organization_id: selectedOrgId,
      name: newFacilityName,
      address: newFacilityAddress,
      description: newFacilityDesc,
      qr_code_url: newFacUrl
    });

    if (error) {
      addToast(`Error: ${error.message}`, 'warning');
    } else {
      addToast('Facility created successfully!', 'success');
      setNewFacilityName('');
      setNewFacilityAddress('');
      setNewFacilityDesc('');
      const freshFacs = await fetchFacilities();
      setFacilities(freshFacs);
    }
  };

  // Dynamic Navigation Menu Builder
  const renderNavigation = () => {
    if (currentRole === 'superadmin') {
      return (
        <nav className="nav-menu">
          <button
            className={`nav-btn ${activeTab === 'superadmin-dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('superadmin-dashboard')}
          >
            <LayoutDashboard size={16} /> Global Desk
          </button>
          <button
            className={`nav-btn ${activeTab === 'organizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('organizations')}
          >
            <Building size={16} /> Organizations ({organizations.length})
          </button>
          <button
            className={`nav-btn ${activeTab === 'users-mgmt' ? 'active' : ''}`}
            onClick={() => setActiveTab('users-mgmt')}
          >
            <UserCircle size={16} /> User Accounts ({users.length})
          </button>
        </nav>
      );
    }

    if (currentRole === 'admin') {
      return (
        <nav className="nav-menu">
          <button
            className={`nav-btn ${activeTab === 'org-dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('org-dashboard')}
          >
            <LayoutDashboard size={16} /> Org Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'managers-list' ? 'active' : ''}`}
            onClick={() => setActiveTab('managers-list')}
          >
            <UserCircle size={16} /> Managers
          </button>
          <button
            className={`nav-btn ${activeTab === 'facilities-mgmt' ? 'active' : ''}`}
            onClick={() => setActiveTab('facilities-mgmt')}
          >
            <Building size={16} /> Facilities ({facilities.filter(f => f.organizationId === selectedOrgId).length})
          </button>
          <button
            className={`nav-btn ${activeTab === 'vendors-invite' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendors-invite')}
          >
            <Wrench size={16} /> Vendors & Invites
          </button>
        </nav>
      );
    }

    if (currentRole === 'vendor') {
      return (
        <nav className="nav-menu">
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} /> My Jobs
          </button>
          <button
            className={`nav-btn ${activeTab === 'invites-affiliations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites-affiliations')}
          >
            <Mail size={16} /> Invites & Partners
          </button>
        </nav>
      );
    }

    if (currentRole === 'manager') {
      return (
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
      );
    }

    return (
      <div className="flex items-center gap-2 text-[13px] font-bold text-app-primary">
        <QrCode size={16} /> Mobile Repair Hotspot
      </div>
    );
  };

  // State from LocalStorage
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<RepairRequest[]>([]);

  // Simulation Environment state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-4');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<'manager' | 'vendor' | 'tenant' | 'admin' | 'superadmin'>('manager');
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
      const [orgsDb, facilitiesDb, vendorsDb, usersDb, requestsDb, affils, vInvites, mInvites] = await Promise.all([
        fetchOrganizations(),
        fetchFacilities(),
        fetchVendors(),
        fetchUsers(),
        fetchRequests(),
        fetchVendorAffiliations(),
        fetchVendorInvitations(),
        fetchMemberInvitations()
      ]);

      if (orgsDb.length > 0) setOrganizations(orgsDb);
      if (facilitiesDb.length > 0) setFacilities(facilitiesDb);
      if (vendorsDb.length > 0) setVendors(vendorsDb);
      if (usersDb.length > 0) setUsers(usersDb);
      if (requestsDb.length > 0) setRequests(requestsDb);
      setVendorAffiliations(affils);
      setVendorInvitations(vInvites);
      setMemberInvitations(mInvites);
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

  const handleRoleChange = (role: 'manager' | 'vendor' | 'tenant' | 'admin' | 'superadmin') => {
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
      setActiveTab('org-dashboard');
    } else if (role === 'superadmin') {
      const superadminUser = users.find(u => u.role === 'superadmin') || {
        id: 'usr-superadmin',
        organizationId: '',
        name: 'Platform SuperAdmin',
        email: 'super@facilitrack.com',
        role: 'superadmin'
      };
      setCurrentUser(superadminUser);
      setActiveTab('superadmin-dashboard');
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
                <option value="admin">Alexander (Org Admin)</option>
                <option value="superadmin">SuperAdmin (Platform Owner)</option>
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

        {renderNavigation()}

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

          /* ADMINISTRATIVE VIEWS (SUPERADMIN / ORGADMIN / MANAGER / VENDOR) */
          <div>
            {/* 1. SUPERADMIN PANEL */}
            {currentRole === 'superadmin' && activeTab === 'superadmin-dashboard' && (
              <div>
                <div className="mb-6">
                  <h1 className="text-[28px] leading-tight text-white">Platform Master Control</h1>
                  <p className="text-app-subtle">Global overview of registered tenants, platform workloads, and metrics.</p>
                </div>
                
                <div className="stats-grid grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                  <div className="stat-card glass-panel">
                    <span className="stat-label">Organizations</span>
                    <span className="stat-value text-indigo-400">{organizations.length}</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <span className="stat-label">Active Contractors</span>
                    <span className="stat-value text-emerald-400">{vendors.length}</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <span className="stat-label">System Tickets</span>
                    <span className="stat-value text-purple-400">{requests.length}</span>
                  </div>
                </div>

                <div className="glass-panel">
                  <h2 className="text-lg mb-4 text-white">All Active Requests</h2>
                  <RequestList
                    requests={requests}
                    facilities={facilities}
                    selectedOrgId={selectedOrgId}
                    activeFilterStatus="all"
                    onRequestClick={(req) => setSelectedRequest(req)}
                  />
                </div>
              </div>
            )}

            {currentRole === 'superadmin' && activeTab === 'organizations' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                <section className="glass-panel h-fit">
                  <h3 className="text-base mb-4 font-bold text-white">Register New Tenant Organization</h3>
                  <form onSubmit={handleCreateOrgAdmin} className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Organization Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Apex Commercial Real Estate"
                        value={newOrgNameAdmin}
                        onChange={(e) => setNewOrgNameAdmin(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Organization Location / Address</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 100 Main St, Austin, TX"
                        value={newOrgAddress}
                        onChange={(e) => setNewOrgAddress(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Theme Branding Color</label>
                      <input
                        type="color"
                        className="form-input h-10 p-1 bg-transparent cursor-pointer"
                        value={newOrgColor}
                        onChange={(e) => setNewOrgColor(e.target.value)}
                      />
                    </div>

                    <div className="border-t border-white/10 pt-3 mt-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-app-primary mb-3">System Admin Details</h4>
                      
                      <div className="form-group mb-3">
                        <label className="form-label">Admin Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Jane Doe"
                          value={newOrgAdminName}
                          onChange={(e) => setNewOrgAdminName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group mb-3">
                        <label className="form-label">Admin Email *</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="admin@organization.com"
                          value={newOrgAdminEmail}
                          onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Admin Phone / Telephone</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="512-555-0188"
                          value={newOrgAdminPhone}
                          onChange={(e) => setNewOrgAdminPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className="glow-btn w-full py-2">Create Organization & Invite Admin</button>
                  </form>
                </section>

                <section className="glass-panel">
                  <h3 className="text-base mb-4 font-bold text-white">Registered Organizations</h3>
                  <div className="space-y-3">
                    {organizations.map(org => (
                      <div key={org.id} className="flex items-center justify-between p-3.5 border border-app-border rounded-lg bg-app-raised">
                        <div>
                          <h4 className="font-bold text-sm text-white">{org.name}</h4>
                          <span className="text-[11px] text-app-muted">ID: {org.id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: org.themeColor }} />
                          <span className="text-xs text-app-muted">
                            {facilities.filter(f => f.organizationId === org.id).length} Facilities
                          </span>
                          <button
                            onClick={() => handleDeleteOrg(org.id)}
                            className="p-1 px-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md border border-red-500/20 active:scale-95 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {currentRole === 'superadmin' && activeTab === 'users-mgmt' && (
              <div>
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-[28px] leading-tight text-white">User Accounts Control</h1>
                    <p className="text-app-subtle">See, edit, and delete all user accounts and profiles registered on the platform.</p>
                  </div>
                  <div className="flex max-w-[280px] items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-app-text">
                    <input
                      type="text"
                      className="w-full bg-transparent outline-none placeholder:text-app-muted"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                  {/* Users List */}
                  <section className="glass-panel">
                    <h3 className="text-base mb-4 font-bold text-white">User Directory</h3>
                    <div className="space-y-3">
                      {users
                        .filter(u => 
                          u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map(user => {
                          const userOrg = organizations.find(o => o.id === user.organizationId);
                          return (
                            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 border border-app-border rounded-lg bg-app-raised gap-3">
                              <div>
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                  {user.name} 
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    user.role === 'superadmin' ? 'bg-red-500/10 text-red-400' :
                                    user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' :
                                    user.role === 'manager' ? 'bg-emerald-500/10 text-emerald-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {user.role}
                                  </span>
                                </h4>
                                <p className="text-xs text-app-muted mt-0.5">{user.email}</p>
                                {userOrg && (
                                  <p className="text-[11px] text-indigo-400 mt-1">Affiliation: {userOrg.name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 sm:self-center self-end">
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditUserName(user.name);
                                    setEditUserRole(user.role as any);
                                    setEditUserOrgId(user.organizationId || '');
                                  }}
                                  className="p-1 px-3 text-xs font-bold text-app-primary hover:text-white bg-app-primary/10 hover:bg-app-primary/20 rounded-md border border-app-primary/20 active:scale-95 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1 px-3 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md border border-red-500/20 active:scale-95 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </section>

                  {/* Edit Section */}
                  <section className="glass-panel h-fit">
                    <h3 className="text-base mb-4 font-bold text-white">Edit User Profile</h3>
                    {editingUser ? (
                      <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
                        <div className="form-group">
                          <label className="form-label">Full Name *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">System Role *</label>
                          <select
                            className="form-input"
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value as any)}
                          >
                            <option value="superadmin">SuperAdmin</option>
                            <option value="admin">OrgAdmin</option>
                            <option value="manager">Manager</option>
                            <option value="vendor">Vendor</option>
                          </select>
                        </div>

                        {editUserRole !== 'superadmin' && editUserRole !== 'vendor' && (
                          <div className="form-group">
                            <label className="form-label">Organization Affiliation</label>
                            <select
                              className="form-input"
                              value={editUserOrgId}
                              onChange={(e) => setEditUserOrgId(e.target.value)}
                            >
                              <option value="">No Organization</option>
                              {organizations.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button type="submit" className="glow-btn flex-1 py-2 text-xs">Save Changes</button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="flex-1 py-2 text-xs font-bold text-app-muted hover:text-white bg-white/5 border border-white/10 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="text-center py-8 text-xs text-app-muted border border-dashed border-app-border rounded-lg">
                        Select a user from the directory to edit their details.
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* 2. ORGADMIN VIEW: ORG DASHBOARD */}
            {currentRole === 'admin' && activeTab === 'org-dashboard' && (
              <div>
                <div className="mb-6">
                  <h1 className="text-[28px] leading-tight text-white">{currentOrg?.name} Admin Desk</h1>
                  <p className="text-app-subtle">Review repair tickets and facility conditions for your organization.</p>
                </div>

                <DashboardStats
                  requests={visibleRequests}
                  selectedOrgId={selectedOrgId}
                  activeFilterStatus={statsFilterStatus}
                  onFilterStatusChange={setStatsFilterStatus}
                />

                <div className="glass-panel mt-6">
                  <h2 className="text-lg mb-4 text-white">Organization Tickets</h2>
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

            {/* ORGADMIN VIEW: MANAGERS LIST */}
            {currentRole === 'admin' && activeTab === 'managers-list' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                <section className="glass-panel h-fit">
                  <h3 className="text-base mb-4 font-bold text-white">Invite New Manager</h3>
                  <p className="text-xs text-app-muted mb-4">
                    Send an invitation to join your organization as a manager. They can sign up with this email.
                  </p>
                  <form onSubmit={handleInviteManager} className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Manager Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="manager@domain.com"
                        value={newManagerEmail}
                        onChange={(e) => setNewManagerEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="glow-btn w-full py-2">Send Invitation</button>
                  </form>
                </section>

                <section className="glass-panel">
                  <h3 className="text-base mb-4 font-bold text-white">Active Managers & Invites</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Team Managers</h4>
                      <div className="space-y-2">
                        {users.filter(u => u.organizationId === selectedOrgId && u.role === 'manager').map(mgr => (
                          <div key={mgr.id} className="p-3 border border-app-border rounded-lg bg-app-raised flex justify-between items-center text-sm">
                            <span className="font-bold text-white">{mgr.name}</span>
                            <span className="text-xs text-app-muted">{mgr.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-app-border pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Pending Invitations</h4>
                      <div className="space-y-2">
                        {memberInvitations.filter(inv => inv.organizationId === selectedOrgId && inv.role === 'manager').length === 0 ? (
                          <div className="text-xs text-app-muted text-center py-4 border border-dashed border-app-border rounded-lg">
                            No pending invitations
                          </div>
                        ) : (
                          memberInvitations.filter(inv => inv.organizationId === selectedOrgId && inv.role === 'manager').map(inv => (
                            <div key={inv.id} className="p-3 border border-app-border rounded-lg bg-app-raised flex justify-between items-center text-sm">
                              <span className="text-white">{inv.email}</span>
                              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Invited</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ORGADMIN VIEW: FACILITIES MGMT */}
            {currentRole === 'admin' && activeTab === 'facilities-mgmt' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                <section className="glass-panel h-fit">
                  <h3 className="text-base mb-4 font-bold text-white">Add New Facility</h3>
                  <form onSubmit={handleCreateFacilityOrg} className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Facility Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Apex Office Center"
                        value={newFacilityName}
                        onChange={(e) => setNewFacilityName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Address *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="123 Corporate Dr, Austin TX"
                        value={newFacilityAddress}
                        onChange={(e) => setNewFacilityAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-input"
                        placeholder="Facility operations details..."
                        value={newFacilityDesc}
                        onChange={(e) => setNewFacilityDesc(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="glow-btn w-full py-2">Save Facility</button>
                  </form>
                </section>

                <section className="glass-panel">
                  <h3 className="text-base mb-4 font-bold text-white">Registered Facilities</h3>
                  <div className="space-y-3">
                    {facilities.filter(f => f.organizationId === selectedOrgId).map(fac => (
                      <div key={fac.id} className="p-3.5 border border-app-border rounded-lg bg-app-raised flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-white">{fac.name}</h4>
                          <p className="text-xs text-app-muted mt-0.5">{fac.address}</p>
                        </div>
                        <a 
                          href={fac.qrCodeUrl}
                          className="text-xs font-bold text-app-primary bg-indigo-500/10 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 active:scale-95 transition-all"
                        >
                          View QR Portal
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ORGADMIN VIEW: VENDORS INVITE */}
            {currentRole === 'admin' && activeTab === 'vendors-invite' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Search Platform Vendors */}
                  <section className="glass-panel">
                    <h3 className="text-base mb-3 font-bold text-white">Search & Affiliate Vendors</h3>
                    <p className="text-xs text-app-muted mb-4">
                      Search our global platform directory to find and invite trade specialists to partner with your organization.
                    </p>
                    <div className="form-group mb-4">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search by specialty or company name..."
                        value={vendorSearchQuery}
                        onChange={(e) => setVendorSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {vendors
                        .filter(v => 
                          (v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
                          v.specialty.toLowerCase().includes(vendorSearchQuery.toLowerCase())) &&
                          !vendorAffiliations.some(a => a.vendorId === v.id && a.organizationId === selectedOrgId)
                        )
                        .map(vendor => (
                          <div key={vendor.id} className="p-3 border border-app-border rounded-lg bg-app-raised flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-sm text-white">{vendor.name}</h4>
                              <span className="text-xs text-app-primary font-semibold">{vendor.specialty}</span>
                            </div>
                            {vendorInvitations.some(i => i.organizationId === selectedOrgId && i.email === vendor.email && i.status === 'pending') ? (
                              <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full">Invited</span>
                            ) : (
                              <button
                                onClick={() => handleInviteVendor(vendor.email)}
                                className="cursor-pointer text-xs font-bold text-app-primary bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                              >
                                Send Invite
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </section>

                  {/* Affiliated Vendors & Pending Invites */}
                  <section className="glass-panel">
                    <h3 className="text-base mb-4 font-bold text-white">Partner Vendor Network</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Linked Contractors</h4>
                        <div className="space-y-2">
                          {vendors.filter(v => vendorAffiliations.some(a => a.vendorId === v.id && a.organizationId === selectedOrgId)).length === 0 ? (
                            <div className="text-xs text-app-muted text-center py-4 border border-dashed border-app-border rounded-lg">
                              No partner contractors linked yet
                            </div>
                          ) : (
                            vendors.filter(v => vendorAffiliations.some(a => a.vendorId === v.id && a.organizationId === selectedOrgId)).map(v => {
                              const isRegistered = users.some(u => u.role === 'vendor' && u.vendorId === v.id);
                              return (
                                <div key={v.id} className="p-3 border border-app-border rounded-lg bg-app-raised flex justify-between items-center text-sm">
                                  <div>
                                    <span className="font-bold text-white block">{v.name}</span>
                                    <span className="text-[11px] text-app-primary font-bold">{v.specialty}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-app-muted">{v.email}</span>
                                    {isRegistered ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 animate-pulse">
                                        Invited
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="border-t border-app-border pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">Pending Vendor Invites</h4>
                        <div className="space-y-2">
                          {vendorInvitations.filter(i => i.organizationId === selectedOrgId && i.status === 'pending').length === 0 ? (
                            <div className="text-xs text-app-muted text-center py-4 border border-dashed border-app-border rounded-lg">
                              No pending vendor invitations
                            </div>
                          ) : (
                            vendorInvitations.filter(i => i.organizationId === selectedOrgId && i.status === 'pending').map(inv => (
                              <div key={inv.id} className="p-3 border border-app-border rounded-lg bg-app-raised flex justify-between items-center text-sm">
                                <span className="text-white">{inv.email}</span>
                                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Pending Response</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* 3. VENDOR VIEW: INVITES & AFFILIATIONS */}
            {currentRole === 'vendor' && activeTab === 'invites-affiliations' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="glass-panel">
                  <h3 className="text-base mb-4 font-bold text-white">Incoming Partnership Invitations</h3>
                  <div className="space-y-3">
                    {vendorInvitations.filter(i => i.email === currentUser?.email && i.status === 'pending').length === 0 ? (
                      <div className="text-xs text-app-muted text-center py-8 border border-dashed border-app-border rounded-lg">
                        No new invitations at the moment.
                      </div>
                    ) : (
                      vendorInvitations.filter(i => i.email === currentUser?.email && i.status === 'pending').map(invite => {
                        const invOrg = organizations.find(o => o.id === invite.organizationId);
                        return (
                          <div key={invite.id} className="p-4 border border-app-border rounded-lg bg-app-raised flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                              <h4 className="font-bold text-white text-sm">{invOrg?.name || 'Unknown Organization'}</h4>
                              <p className="text-xs text-app-muted">Wants to add you as an active repair contractor</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptInvite(invite.id, invite.organizationId)}
                                className="cursor-pointer text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineInvite(invite.id)}
                                className="cursor-pointer text-xs font-bold text-app-muted hover:bg-slate-800 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="glass-panel">
                  <h3 className="text-base mb-4 font-bold text-white">Affiliated Client Organizations</h3>
                  <p className="text-xs text-app-muted mb-4">
                    Below are the organizations you are linked with. You will receive active repair requests dispatched by these partners.
                  </p>
                  <div className="space-y-3">
                    {organizations
                      .filter(org => vendorAffiliations.some(a => a.organizationId === org.id && a.vendorId === currentUser?.vendorId))
                      .map(org => (
                        <div key={org.id} className="p-3.5 border border-app-border rounded-lg bg-app-raised flex justify-between items-center">
                          <h4 className="font-bold text-sm text-white">{org.name}</h4>
                          <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Partnered</span>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
            )}

            {/* View 1: DASHBOARD STATS & TICKET LISTING */}
            {activeTab === 'dashboard' && currentRole !== 'superadmin' && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[28px] leading-tight text-white">{currentOrg?.name} Operational Hub</h1>
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
                    <h2 className="text-lg text-white">
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
                        orgVendors.map(vendor => {
                          const isRegistered = users.some(u => u.role === 'vendor' && u.vendorId === vendor.id);
                          return (
                            <article key={vendor.id} className="vendor-card min-w-0 rounded-[10px] border border-app-border bg-app-raised p-3.5">
                              <div className="vendor-card-main min-w-0">
                                <div className="vendor-card-title-row flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <h4 className="break-words text-[15px] leading-snug text-app-text">{vendor.name}</h4>
                                  {isRegistered ? (
                                    <span className="vendor-status inline-flex min-h-6 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold leading-none text-emerald-500">
                                      <CheckCircle2 size={12} /> Active
                                    </span>
                                  ) : (
                                    <span className="vendor-status inline-flex min-h-6 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-bold leading-none text-amber-500">
                                      <Clock size={12} /> Invited
                                    </span>
                                  )}
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
                                </div>
                              </div>
                            </article>
                          );
                        })
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
          vendors={vendors.filter(v => vendorAffiliations.some(a => a.vendorId === v.id && a.organizationId === selectedRequest.organizationId))}
          currentUser={currentUser}
          onClose={() => setSelectedRequest(null)}
          onUpdateRequest={handleUpdateRequest}
        />
      )}

      {/* Vendor Invitation Link Modal */}
      {activeInviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-[480px] p-6 animate-[scaleUp_0.25s_ease-out] relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Mail className="text-indigo-400" size={20} /> Vendor Sign Up Invitation
            </h3>
            <p className="text-xs text-app-muted mb-4 leading-normal">
              Copy this personalized link and send it to the contractor. They can sign up instantly and associate their user account.
            </p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={activeInviteLink}
                className="form-input flex-1 font-mono text-[11px] bg-slate-950/80 border-white/10"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeInviteLink);
                  addToast('Invitation link copied!', 'success');
                }}
                className="glow-btn px-4 py-2 text-xs font-bold whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setActiveInviteLink(null)}
                className="cursor-pointer text-xs font-bold text-app-muted hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg active:scale-95 transition-all"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
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
