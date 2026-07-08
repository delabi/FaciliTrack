import { Organization, Facility, User, Vendor, RepairRequest } from '../types';
import { isSupabaseConfigured } from './supabaseClient';
import { syncRequestToDb, syncFacilityToDb, syncVendorToDb } from './supabaseSync';

// Simple SVG placeholders as data URIs for mock photos and documents
export const MOCK_MEDIA = {
  leakImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%232d3748"/><circle cx="200" cy="120" r="40" fill="%233182ce"/><path d="M200 40 L240 120 L160 120 Z" fill="%233182ce"/><text x="50%" y="220" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">Active Pipe Leak in Laundry Room</text></svg>',
  brokenAClarge: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%232d3748"/><rect x="120" y="80" width="160" height="100" rx="10" fill="%23718096" stroke="%23e2e8f0" stroke-width="4"/><path d="M140 100 L260 160 M260 100 L140 160" stroke="%23e53e3e" stroke-width="6"/><text x="50%" y="230" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">AC Unit Blowing Hot Air</text></svg>',
  completedPlumbing: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%232d3748"/><circle cx="200" cy="130" r="50" fill="%2348bb78"/><path d="M180 130 L195 145 L225 115" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="50%" y="220" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16">New P-Trap Installed Successfully</text></svg>',
  receiptPdfMock: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="100%" height="100%" fill="%23edf2f7" stroke="%23cbd5e0" stroke-width="4"/><text x="20" y="50" fill="%232d3748" font-family="monospace" font-size="20" font-weight="bold">INVOICE #PL-9821</text><text x="20" y="90" fill="%234a5568" font-family="monospace" font-size="14">Vendor: FlowMaster Plumbing</text><text x="20" y="110" fill="%234a5568" font-family="monospace" font-size="14">Date: July 01, 2026</text><line x1="20" y1="130" x2="280" y2="130" stroke="%23cbd5e0" stroke-width="2"/><text x="20" y="160" fill="%232d3748" font-family="monospace" font-size="14">1. Copper Pipe Repair    $180.00</text><text x="20" y="180" fill="%232d3748" font-family="monospace" font-size="14">2. Emergency Dispatch    $70.00</text><line x1="20" y1="310" x2="280" y2="310" stroke="%23cbd5e0" stroke-width="2"/><text x="20" y="340" fill="%232d3748" font-family="monospace" font-size="16" font-weight="bold">TOTAL AMOUNT:          $250.00</text><rect x="180" y="355" width="100" height="30" rx="5" fill="%2348bb78"/><text x="230" y="370" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="monospace" font-size="12" font-weight="bold">PAID</text></svg>'
};

export const MOCK_ORGANIZATIONS: Organization[] = [
  { id: 'org-4', name: 'Lehigh Valley Companion Care Homes', themeColor: '#0e7490' },
  { id: 'org-1', name: 'Community Homes', themeColor: '#6366f1' },
  { id: 'org-2', name: 'Apex Commercial Properties', themeColor: '#3b82f6' },
  { id: 'org-3', name: 'Delta Senior Living', themeColor: '#10b981' }
];

export const MOCK_FACILITIES: Facility[] = [
  // Lehigh Valley Companion Care Homes Facilities
  {
    id: 'fac-7',
    organizationId: 'org-4',
    name: 'Imani House',
    address: '120 Imani Dr, Allentown, PA 18103',
    description: 'Residential group home with 6 client suites and full clinical amenities.',
    qrCodeUrl: '/report?facilityId=fac-7&orgId=org-4'
  },
  {
    id: 'fac-8',
    organizationId: 'org-4',
    name: 'Pendo House',
    address: '450 Pendo Rd, Bethlehem, PA 18017',
    description: 'Assisted care house with outdoor gardens and wheel-chair layouts.',
    qrCodeUrl: '/report?facilityId=fac-8&orgId=org-4'
  },
  {
    id: 'fac-9',
    organizationId: 'org-4',
    name: 'Baraka House',
    address: '80 Baraka Way, Easton, PA 18042',
    description: 'Group home for special needs therapy programs.',
    qrCodeUrl: '/report?facilityId=fac-9&orgId=org-4'
  },
  {
    id: 'fac-10',
    organizationId: 'org-4',
    name: 'Shukrani House',
    address: '310 Shukrani Ln, Whitehall, PA 18052',
    description: 'Companion care housing duplex with central nursing hub.',
    qrCodeUrl: '/report?facilityId=fac-10&orgId=org-4'
  },
  {
    id: 'fac-11',
    organizationId: 'org-4',
    name: 'Wema House',
    address: '15 Wema Blvd, Emmaus, PA 18049',
    description: 'Residential community cottage with shared lounge and kitchen areas.',
    qrCodeUrl: '/report?facilityId=fac-11&orgId=org-4'
  },
  {
    id: 'fac-12',
    organizationId: 'org-4',
    name: 'Riziki House',
    address: '704 Riziki Pl, Macungie, PA 18062',
    description: 'Supported group residence consisting of 8 private bedrooms.',
    qrCodeUrl: '/report?facilityId=fac-12&orgId=org-4'
  },
  // Community Homes Facilities
  {
    id: 'fac-1',
    organizationId: 'org-1',
    name: 'Greenwood Villa',
    address: '1428 Greenwood Ave, Suite A, Austin TX',
    description: 'Main community housing facility consisting of 24 family apartments and a communal recreation centre.',
    qrCodeUrl: '/report?facilityId=fac-1&orgId=org-1'
  },
  {
    id: 'fac-2',
    organizationId: 'org-1',
    name: 'Sunset Care Home',
    address: '890 Sunset Blvd, Austin TX',
    description: 'Senior assisted living facility with 12 resident rooms, nursing station, and commercial kitchen.',
    qrCodeUrl: '/report?facilityId=fac-2&orgId=org-1'
  },
  {
    id: 'fac-3',
    organizationId: 'org-1',
    name: 'Oakridge Suites',
    address: '105 Oakridge Dr, Austin TX',
    description: 'Modern duplex housing complex managed for temporary resident programs.',
    qrCodeUrl: '/report?facilityId=fac-3&orgId=org-1'
  },
  // Apex Commercial Facilities
  {
    id: 'fac-4',
    organizationId: 'org-2',
    name: 'Apex Tower A',
    address: '500 Congress Ave, Tower A, Austin TX',
    description: '22-story commercial office building featuring tech tenant floors, elevators, and basement parking.',
    qrCodeUrl: '/report?facilityId=fac-4&orgId=org-2'
  },
  {
    id: 'fac-5',
    organizationId: 'org-2',
    name: 'Apex Plaza Retail Center',
    address: '1122 Lamar Blvd, Austin TX',
    description: 'Multi-tenant commercial retail strip featuring restaurants, gym facilities, and convenience outlets.',
    qrCodeUrl: '/report?facilityId=fac-5&orgId=org-2'
  },
  // Delta Senior Living Facilities
  {
    id: 'fac-6',
    organizationId: 'org-3',
    name: 'Delta Pines Manor',
    address: '400 Pine Dr, Houston TX',
    description: 'Luxury retirement estate with independent cottages, central dining, and wellness club.',
    qrCodeUrl: '/report?facilityId=fac-6&orgId=org-3'
  }
];

export const MOCK_VENDORS: Vendor[] = [
  // Lehigh Valley Vendors
  {
    id: 'ven-7',
    organizationId: 'org-4',
    name: 'Keystone Plumbing Solutions',
    specialty: 'Plumbing & Drainage',
    email: 'service@keystoneplumbing.com',
    phone: '610-555-0143',
    active: true
  },
  {
    id: 'ven-8',
    organizationId: 'org-4',
    name: 'Lehigh Valley Heating & Air',
    specialty: 'HVAC Systems',
    email: 'hvac@lvheatingair.com',
    phone: '610-555-0182',
    active: true
  },
  // Community Homes Vendors
  {
    id: 'ven-1',
    organizationId: 'org-1',
    name: 'FlowMaster Plumbing Services',
    specialty: 'Plumbing & Drainage',
    email: 'service@flowmaster.com',
    phone: '512-555-0199',
    active: true
  },
  {
    id: 'ven-2',
    organizationId: 'org-1',
    name: 'Sparky Electrical Contractors',
    specialty: 'Electrical Systems',
    email: 'contracting@sparkyelec.com',
    phone: '512-555-0144',
    active: true
  },
  {
    id: 'ven-3',
    organizationId: 'org-1',
    name: 'FreezeTemp HVAC & Refrigeration',
    specialty: 'HVAC / Heating & Cooling',
    email: 'support@freezetemp.com',
    phone: '512-555-0111',
    active: true
  },
  // Apex Commercial Vendors
  {
    id: 'ven-4',
    organizationId: 'org-2',
    name: 'Apex Elevator & Maintenance Co',
    specialty: 'Elevator & Lifts',
    email: 'maintenance@apexelevator.com',
    phone: '512-555-9988',
    active: true
  },
  {
    id: 'ven-5',
    organizationId: 'org-2',
    name: 'ProLink Security & Fire Protection',
    specialty: 'Fire Alarms & Access Control',
    email: 'alarms@prolinksec.com',
    phone: '512-555-7766',
    active: true
  },
  // Delta Senior Living Vendors
  {
    id: 'ven-6',
    organizationId: 'org-3',
    name: 'Evergreen Facility Landscaping',
    specialty: 'Landscaping & Tree Services',
    email: 'office@evergreenlandscapes.com',
    phone: '713-555-3300',
    active: true
  }
];

export const MOCK_USERS: User[] = [
  // Lehigh Valley Companion Care Homes Users
  {
    id: 'usr-8',
    organizationId: 'org-4',
    name: 'Prisca Amos',
    email: 'prisca.a@lvcchomes.org',
    role: 'manager'
  },
  {
    id: 'usr-9',
    organizationId: 'org-4',
    name: 'Cowboy Vazquez',
    email: 'cowboy.v@lvcchomes.org',
    role: 'manager'
  },
  {
    id: 'usr-11',
    organizationId: 'org-4',
    name: 'Mark Harris (Keystone Plumbing)',
    email: 'mark@keystoneplumbing.com',
    role: 'vendor',
    vendorId: 'ven-7'
  },
  {
    id: 'usr-12',
    organizationId: 'org-4',
    name: 'Tina Lopez (Keystone HVAC)',
    email: 'tina@lvheatingair.com',
    role: 'vendor',
    vendorId: 'ven-8'
  },
  {
    id: 'usr-10',
    organizationId: 'org-4',
    name: 'Lehigh Resident',
    email: 'resident.lv@lvcchomes.org',
    role: 'tenant'
  },

  // Community Homes Users
  {
    id: 'usr-1',
    organizationId: 'org-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@communityhomes.org',
    role: 'manager'
  },
  {
    id: 'usr-2',
    organizationId: 'org-1',
    name: 'John Miller (FlowMaster)',
    email: 'john@flowmaster.com',
    role: 'vendor',
    vendorId: 'ven-1'
  },
  {
    id: 'usr-3',
    organizationId: 'org-1',
    name: 'Robert Vance (Sparky)',
    email: 'robert@sparkyelec.com',
    role: 'vendor',
    vendorId: 'ven-2'
  },
  {
    id: 'usr-4',
    organizationId: 'org-1',
    name: 'Alice Cooper',
    email: 'alice.c@resident.org',
    role: 'tenant'
  },
  // Apex Commercial Users
  {
    id: 'usr-5',
    organizationId: 'org-2',
    name: 'David Carter',
    email: 'd.carter@apexproperties.com',
    role: 'manager'
  },
  {
    id: 'usr-6',
    organizationId: 'org-2',
    name: 'Marcus Vance',
    email: 'm.vance@apexelevator.com',
    role: 'vendor',
    vendorId: 'ven-4'
  },
  // Global System Admin
  {
    id: 'usr-7',
    organizationId: 'org-4', // Default assigned org
    name: 'Alexander Sterling',
    email: 'admin@system.com',
    role: 'admin'
  }
];

export const MOCK_REPAIR_REQUESTS: RepairRequest[] = [
  // Lehigh Valley requests
  {
    id: 'req-5',
    organizationId: 'org-4',
    facilityId: 'fac-7',
    title: 'Water Heater Malfunction in Main Kitchen',
    description: 'Imani House kitchen water heater is completely shut down. The clinical team cannot sanitize dishes or prep meals. Needs urgent dispatch.',
    category: 'plumbing',
    urgency: 'emergency',
    status: 'assigned',
    reporterName: 'Prisca Amos',
    reporterContact: '610-555-0144',
    mediaUrls: [MOCK_MEDIA.leakImage],
    locationCoordinates: { latitude: 40.5982, longitude: -75.4789 },
    assignedVendorId: 'ven-7',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        note: 'Request logged by manager Prisca Amos.',
        updatedBy: 'Prisca Amos'
      },
      {
        status: 'assigned',
        timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        note: 'Assigned to Keystone Plumbing Solutions.',
        updatedBy: 'Cowboy Vazquez (Manager)'
      }
    ]
  },
  {
    id: 'req-6',
    organizationId: 'org-4',
    facilityId: 'fac-8',
    title: 'Thermostat in Living Area unresponsive',
    description: 'Pendo House living room thermostat is stuck showing a blank screen. The room is hot and the AC fan remains running continuously.',
    category: 'hvac',
    urgency: 'high',
    status: 'pending',
    reporterName: 'Cowboy Vazquez',
    reporterContact: 'cowboy.v@lvcchomes.org',
    mediaUrls: [],
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        note: 'Request submitted via mobile QR code scan at Pendo House foyer.',
        updatedBy: 'Cowboy Vazquez'
      }
    ]
  },

  // Community Homes requests
  {
    id: 'req-1',
    organizationId: 'org-1',
    facilityId: 'fac-1',
    title: 'Severe Pipe Leak Under Laundry Room Sinks',
    description: 'Water is gushing out from behind the plaster wall under the main laundry room sinks. It has started pooling on the floor and is leaking towards the hallway. Needs urgent dispatch.',
    category: 'plumbing',
    urgency: 'emergency',
    status: 'assigned',
    reporterName: 'Alice Resident',
    reporterContact: '512-555-0101',
    mediaUrls: [MOCK_MEDIA.leakImage],
    locationCoordinates: { latitude: 30.2672, longitude: -97.7431 },
    assignedVendorId: 'ven-1',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        note: 'Request logged via QR Code Scan at Laundry Room (Greenwood Villa).',
        updatedBy: 'Anonymous Resident'
      },
      {
        status: 'assigned',
        timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        note: 'Request reviewed. Urgency confirmed. FlowMaster Plumbing assigned and dispatch request sent.',
        updatedBy: 'Sarah Jenkins (Manager)'
      }
    ]
  },
  {
    id: 'req-2',
    organizationId: 'org-1',
    facilityId: 'fac-2',
    title: 'AC unit in Room 104 blowing hot air',
    description: 'The wall-mounted AC unit in resident Room 104 is operational, but the fan only blows warm air. Mr. Henderson is feeling uncomfortable.',
    category: 'hvac',
    urgency: 'high',
    status: 'pending',
    reporterName: 'Nurse Evelyn',
    reporterContact: 'evelyn.nurse@sunsetcare.org',
    mediaUrls: [MOCK_MEDIA.brokenAClarge],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        note: 'Request logged via QR Scan at Room 104.',
        updatedBy: 'Nurse Evelyn'
      }
    ]
  },
  {
    id: 'req-3',
    organizationId: 'org-1',
    facilityId: 'fac-1',
    title: 'Leaky Pipe in Greenwood Unit 4 Kitchen',
    description: 'The kitchen sink drain pipe has a minor leak at the joint. Water drips slowly into a bucket placed underneath.',
    category: 'plumbing',
    urgency: 'low',
    status: 'paid',
    reporterName: 'John Tenant',
    reporterContact: 'john.t@gmail.com',
    mediaUrls: [MOCK_MEDIA.leakImage],
    assignedVendorId: 'ven-1',
    completionPhotoUrl: MOCK_MEDIA.completedPlumbing,
    receiptUrl: MOCK_MEDIA.receiptPdfMock,
    cost: 250,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        note: 'Request submitted via Greenwood Villa QR code.',
        updatedBy: 'John Tenant'
      },
      {
        status: 'assigned',
        timestamp: new Date(Date.now() - 3600000 * 44).toISOString(),
        note: 'Assigned to FlowMaster Plumbing.',
        updatedBy: 'Sarah Jenkins (Manager)'
      },
      {
        status: 'in-progress',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        note: 'Technician on-site. Began disassembling joint.',
        updatedBy: 'John Miller (FlowMaster)'
      },
      {
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000 * 22).toISOString(),
        note: 'Replaced pipe trap and verified seals. Uploaded completion photo and invoice.',
        updatedBy: 'John Miller (FlowMaster)'
      },
      {
        status: 'paid',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
        note: 'Invoice reviewed. Payment approved and processed.',
        updatedBy: 'Sarah Jenkins (Manager)'
      }
    ]
  },
  {
    id: 'req-4',
    organizationId: 'org-2',
    facilityId: 'fac-4',
    title: 'Elevator B jerking and making scraping noise',
    description: 'Elevator B in Apex Tower A has a distinct metallic scraping sound when traveling between floors 10 and 12.',
    category: 'safety',
    urgency: 'high',
    status: 'in-progress',
    reporterName: 'Lobby Receptionist',
    reporterContact: 'lobby.reception@apextower.com',
    mediaUrls: [],
    assignedVendorId: 'ven-4',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), // 8 hours ago
    progressLog: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        note: 'Elevator safety report submitted.',
        updatedBy: 'Lobby Receptionist'
      },
      {
        status: 'assigned',
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        note: 'Assigned to Apex Elevator Maintenance Co.',
        updatedBy: 'David Carter (Manager)'
      },
      {
        status: 'in-progress',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        note: 'Elevator B shut down. Technicians inspecting guides.',
        updatedBy: 'Marcus Vance (Elevator Co)'
      }
    ]
  }
];

// Helper to load or initialize from localStorage (using v3 to force database migration for Lehigh organization)
export const getStoredData = () => {
  const requests = localStorage.getItem('fm_v3_requests');
  const orgs = localStorage.getItem('fm_v3_orgs');
  const facilities = localStorage.getItem('fm_v3_facilities');
  const vendors = localStorage.getItem('fm_v3_vendors');
  const users = localStorage.getItem('fm_v3_users');

  if (!requests) {
    localStorage.setItem('fm_v3_requests', JSON.stringify(MOCK_REPAIR_REQUESTS));
    localStorage.setItem('fm_v3_orgs', JSON.stringify(MOCK_ORGANIZATIONS));
    localStorage.setItem('fm_v3_facilities', JSON.stringify(MOCK_FACILITIES));
    localStorage.setItem('fm_v3_vendors', JSON.stringify(MOCK_VENDORS));
    localStorage.setItem('fm_v3_users', JSON.stringify(MOCK_USERS));

    return {
      requests: MOCK_REPAIR_REQUESTS,
      orgs: MOCK_ORGANIZATIONS,
      facilities: MOCK_FACILITIES,
      vendors: MOCK_VENDORS,
      users: MOCK_USERS
    };
  }

  return {
    requests: JSON.parse(requests),
    orgs: JSON.parse(orgs || JSON.stringify(MOCK_ORGANIZATIONS)),
    facilities: JSON.parse(facilities || JSON.stringify(MOCK_FACILITIES)),
    vendors: JSON.parse(vendors || JSON.stringify(MOCK_VENDORS)),
    users: JSON.parse(users || JSON.stringify(MOCK_USERS))
  };
};

export const saveRequestsToStore = (requests: RepairRequest[]) => {
  const prevRaw = localStorage.getItem('fm_v3_requests');
  const prevRequests: RepairRequest[] = prevRaw ? JSON.parse(prevRaw) : [];
  
  try {
    localStorage.setItem('fm_v3_requests', JSON.stringify(requests));
  } catch (err) {
    console.warn('Could not write requests to localStorage (likely quota exceeded due to large attachments):', err);
  }

  if (isSupabaseConfigured) {
    requests.forEach(req => {
      const prev = prevRequests.find(r => r.id === req.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(req)) {
        syncRequestToDb(req);
      }
    });
  }
};

export const saveFacilitiesToStore = (facilities: Facility[]) => {
  const prevRaw = localStorage.getItem('fm_v3_facilities');
  const prevFacilities: Facility[] = prevRaw ? JSON.parse(prevRaw) : [];

  localStorage.setItem('fm_v3_facilities', JSON.stringify(facilities));

  if (isSupabaseConfigured) {
    facilities.forEach(fac => {
      const prev = prevFacilities.find(f => f.id === fac.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(fac)) {
        syncFacilityToDb(fac);
      }
    });
  }
};

export const saveVendorsToStore = (vendors: Vendor[]) => {
  const prevRaw = localStorage.getItem('fm_v3_vendors');
  const prevVendors: Vendor[] = prevRaw ? JSON.parse(prevRaw) : [];

  localStorage.setItem('fm_v3_vendors', JSON.stringify(vendors));

  if (isSupabaseConfigured) {
    vendors.forEach(ven => {
      const prev = prevVendors.find(v => v.id === ven.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(ven)) {
        syncVendorToDb(ven);
      }
    });
  }
};
