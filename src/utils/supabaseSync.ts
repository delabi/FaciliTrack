import { supabase, isSupabaseConfigured } from './supabaseClient';
import { RepairRequest, ProgressLog, Facility, Vendor, Organization, User, VendorAffiliation, VendorInvitation } from '../types';

// Convert base64 data URL to Blob for storage upload
async function base64ToBlob(base64DataUrl: string): Promise<Blob> {
  const response = await fetch(base64DataUrl);
  return await response.blob();
}

// Upload base64 image/video to Supabase Storage and return public URL
export async function uploadBase64ToStorage(base64DataUrl: string, pathName: string): Promise<string> {
  if (!isSupabaseConfigured || !base64DataUrl || !base64DataUrl.startsWith('data:')) {
    return base64DataUrl; // Already a URL or not configured
  }
  try {
    const blob = await base64ToBlob(base64DataUrl);
    const mime = base64DataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
    const ext = mime.split('/')[1] || 'jpg';
    const fileName = `${pathName}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, blob, { contentType: mime, upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Error uploading file to storage:', err);
    return base64DataUrl; // Fallback to base64
  }
}

// ==========================================
// DB SELECT FETCHERS
// ==========================================

export async function fetchOrganizations(): Promise<Organization[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('organizations').select('*');
  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    logo: row.logo,
    themeColor: row.theme_color,
    address: row.address,
    phone: row.phone
  }));
}

export async function fetchFacilities(): Promise<Facility[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('facilities').select('*');
  if (error) {
    console.error('Error fetching facilities:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address,
    description: row.description || '',
    qrCodeUrl: row.qr_code_url || ''
  }));
}

export async function fetchVendors(): Promise<Vendor[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('vendors').select('*');
  if (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    specialty: row.specialty,
    email: row.email,
    phone: row.phone,
    active: row.active ?? true
  }));
}

export async function fetchUsers(): Promise<User[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id || '',
    name: row.name,
    email: row.email,
    role: row.role,
    vendorId: row.vendor_id || undefined
  }));
}

export async function fetchRequests(): Promise<RepairRequest[]> {
  if (!isSupabaseConfigured) return [];
  
  // 1. Fetch requests
  const { data: reqData, error: reqError } = await supabase
    .from('repair_requests')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (reqError) {
    console.error('Error fetching requests:', reqError);
    return [];
  }
  
  // 2. Fetch logs
  const { data: logsData, error: logsError } = await supabase
    .from('progress_logs')
    .select('*')
    .order('timestamp', { ascending: true });
    
  if (logsError) {
    console.error('Error fetching progress logs:', logsError);
    return [];
  }
  
  // Group logs by request_id
  const logsMap: Record<string, ProgressLog[]> = {};
  (logsData || []).forEach(log => {
    if (!logsMap[log.request_id]) {
      logsMap[log.request_id] = [];
    }
    logsMap[log.request_id].push({
      status: log.status,
      timestamp: log.timestamp,
      note: log.note || '',
      updatedBy: log.updated_by
    });
  });
  
  return (reqData || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    facilityId: row.facility_id,
    title: row.title,
    description: row.description,
    category: row.category,
    urgency: row.urgency,
    status: row.status,
    reporterName: row.reporter_name || '',
    reporterContact: row.reporter_contact || '',
    mediaUrls: row.media_urls || [],
    locationCoordinates: row.location_latitude && row.location_longitude ? {
      latitude: parseFloat(row.location_latitude),
      longitude: parseFloat(row.location_longitude)
    } : undefined,
    assignedVendorId: row.assigned_vendor_id || undefined,
    completionPhotoUrl: row.completion_photo_url || undefined,
    receiptUrl: row.receipt_url || undefined,
    cost: row.cost ? parseFloat(row.cost) : undefined,
    itemizedCost: {
      parts: parseFloat(row.itemized_parts) || 0,
      labor: parseFloat(row.itemized_labor) || 0,
      other: parseFloat(row.itemized_other) || 0
    },
    inspectionPhotoUrls: row.inspection_photo_urls || [],
    inspectionNotes: row.inspection_notes || undefined,
    inspectionApproved: row.inspection_approved !== null ? row.inspection_approved : undefined,
    createdAt: row.created_at,
    progressLog: logsMap[row.id] || []
  }));
}

// ==========================================
// DB WRITE MUTATORS
// ==========================================

export async function syncRequestToDb(request: RepairRequest) {
  if (!isSupabaseConfigured) return;

  try {
    // 1. Upload files to storage if they are base64 strings
    const uploadedMediaUrls = await Promise.all(
      (request.mediaUrls || []).map((url, i) => uploadBase64ToStorage(url, `requests/${request.id}-media-${i}`))
    );

    const uploadedCompletionUrl = request.completionPhotoUrl
      ? await uploadBase64ToStorage(request.completionPhotoUrl, `requests/${request.id}-completion`)
      : undefined;

    const uploadedReceiptUrl = request.receiptUrl
      ? await uploadBase64ToStorage(request.receiptUrl, `requests/${request.id}-receipt`)
      : undefined;

    const uploadedInspectionUrls = await Promise.all(
      (request.inspectionPhotoUrls || []).map((url, i) => uploadBase64ToStorage(url, `requests/${request.id}-inspection-${i}`))
    );

    // 2. Insert or Update Request Row
    const { data: existing, error: existError } = await supabase
      .from('repair_requests')
      .select('id')
      .eq('id', request.id)
      .maybeSingle();

    if (existError) throw existError;

    const requestData = {
      organization_id: request.organizationId,
      facility_id: request.facilityId,
      title: request.title,
      description: request.description,
      category: request.category,
      urgency: request.urgency,
      status: request.status,
      reporter_name: request.reporterName,
      reporter_contact: request.reporterContact,
      media_urls: uploadedMediaUrls,
      location_latitude: request.locationCoordinates?.latitude,
      location_longitude: request.locationCoordinates?.longitude,
      assigned_vendor_id: request.assignedVendorId,
      completion_photo_url: uploadedCompletionUrl,
      receipt_url: uploadedReceiptUrl,
      cost: request.cost,
      itemized_parts: request.itemizedCost?.parts || 0,
      itemized_labor: request.itemizedCost?.labor || 0,
      itemized_other: request.itemizedCost?.other || 0,
      inspection_photo_urls: uploadedInspectionUrls,
      inspection_notes: request.inspectionNotes,
      inspection_approved: request.inspectionApproved,
      created_at: request.createdAt
    };

    let reqError;
    if (existing) {
      const { error } = await supabase
        .from('repair_requests')
        .update(requestData)
        .eq('id', request.id);
      reqError = error;
    } else {
      const { error } = await supabase
        .from('repair_requests')
        .insert({ id: request.id, ...requestData });
      reqError = error;
    }

    if (reqError) throw reqError;

    // 3. Sync Progress Logs (delete existing for this request, insert all logs)
    // For simpler sync, we truncate and re-insert the request's progress logs
    const { error: deleteError } = await supabase
      .from('progress_logs')
      .delete()
      .eq('request_id', request.id);

    if (deleteError) throw deleteError;

    if (request.progressLog && request.progressLog.length > 0) {
      const logsToInsert = request.progressLog.map(log => ({
        request_id: request.id,
        status: log.status,
        note: log.note,
        updated_by: log.updatedBy,
        timestamp: log.timestamp
      }));

      const { error: logsError } = await supabase
        .from('progress_logs')
        .insert(logsToInsert);

      if (logsError) throw logsError;
    }
  } catch (err) {
    console.error(`Error syncing request ${request.id} to Supabase:`, err);
  }
}

export async function syncFacilityToDb(facility: Facility) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('facilities').upsert({
    id: facility.id,
    organization_id: facility.organizationId,
    name: facility.name,
    address: facility.address,
    description: facility.description,
    qr_code_url: facility.qrCodeUrl
  });
  if (error) {
    console.error(`Error syncing facility ${facility.id} to Supabase:`, error);
  }
}

export async function syncVendorToDb(vendor: Vendor) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('vendors').upsert({
    id: vendor.id,
    organization_id: vendor.organizationId,
    name: vendor.name,
    specialty: vendor.specialty,
    email: vendor.email,
    phone: vendor.phone,
    active: vendor.active
  });
  if (error) {
    console.error(`Error syncing vendor ${vendor.id} to Supabase:`, error);
  }
}

export async function fetchVendorAffiliations(): Promise<VendorAffiliation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('vendor_affiliations').select('*');
  if (error) {
    console.error('Error fetching affiliations:', error);
    return [];
  }
  return (data || []).map(row => ({
    vendorId: row.vendor_id,
    organizationId: row.organization_id,
    createdAt: row.created_at
  }));
}

export async function fetchVendorInvitations(): Promise<VendorInvitation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('vendor_invitations').select('*');
  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at
  }));
}

export interface MemberInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'manager' | 'vendor' | 'tenant';
  createdAt?: string;
}

export async function fetchMemberInvitations(): Promise<MemberInvitation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('member_invitations').select('*');
  if (error) {
    console.error('Error fetching member invitations:', error);
    return [];
  }
  return (data || []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  }));
}
