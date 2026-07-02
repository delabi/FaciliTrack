import React, { useState } from 'react';
import { Facility, Organization } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Download, Printer, ExternalLink, MapPin, Building, Eye } from 'lucide-react';

interface QrCodeManagerProps {
  facilities: Facility[];
  organizations: Organization[];
  selectedOrgId: string;
  onAddFacility: (newFac: Facility) => void;
  onSimulateQrClick: (facilityId: string) => void;
}

export const QrCodeManager: React.FC<QrCodeManagerProps> = ({
  facilities,
  organizations,
  selectedOrgId,
  onAddFacility,
  onSimulateQrClick
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);
  const orgFacilities = facilities.filter((f) => f.organizationId === selectedOrgId);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const newId = `fac-${Math.floor(100 + Math.random() * 900)}`;
    const qrUrl = `/report?facilityId=${newId}&orgId=${selectedOrgId}`;
    
    const newFacility: Facility = {
      id: newId,
      organizationId: selectedOrgId,
      name,
      address,
      description,
      qrCodeUrl: qrUrl
    };

    onAddFacility(newFacility);
    
    // Reset form
    setName('');
    setAddress('');
    setDescription('');
    setShowAddForm(false);
  };

  const downloadQrCode = (facilityId: string, facilityName: string) => {
    const svgEl = document.getElementById(`qr-svg-${facilityId}`);
    if (!svgEl) return;
    
    const svgXml = new XMLSerializer().serializeToString(svgEl);
    const svgBase64 = window.btoa(svgXml);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const image = new Image();
    image.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 25, 25, 250, 250);
      }
      
      const link = document.createElement('a');
      link.download = `QR_Code_${facilityName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    image.src = `data:image/svg+xml;base64,${svgBase64}`;
  };

  const printQrCode = (facilityId: string, facilityName: string) => {
    const svgEl = document.getElementById(`qr-svg-${facilityId}`);
    if (!svgEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${facilityName}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .qr-container { display: inline-block; border: 1px solid #ccc; padding: 30px; border-radius: 12px; }
            h1 { margin-bottom: 5px; font-size: 24px; }
            p { color: #555; margin-bottom: 20px; font-size: 14px; }
            .footer { margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${facilityName}</h1>
            <p>Scan to request a repair / report an issue</p>
            <div>${svgEl.outerHTML}</div>
            <div class="footer">
              Managed via Antigravity Facility Portal
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="animate-[fadeIn_0.4s_ease]">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[22px]">QR Code Generator & Facilities</h2>
          <p className="text-[13px] text-app-subtle">
            Generate, download, and print QR codes. Place them in kitchens, utility rooms, or corridors.
          </p>
        </div>
        <button className="glow-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} /> Add Facility
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel mb-7 animate-[slideDown_0.3s_ease] border-app-primary">
          <h3 className="mb-3.5 flex items-center gap-2 text-base">
            <Building size={18} className="text-app-primary" /> Register New Facility for {currentOrg?.name}
          </h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label">Facility Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Westwood House, Rec Center Floor 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Physical Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 500 Greenwood St, Austin TX"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Internal Notes</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Describe this facility (e.g. numbers of rooms, heating specifics)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-[18px] flex flex-col justify-end gap-2.5 sm:flex-row">
              <button
                type="button"
                className="glow-btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="glow-btn">
                Create & Generate QR Code
              </button>
            </div>
          </form>
        </div>
      )}

      {orgFacilities.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Building size={48} className="mx-auto mb-3 text-app-muted" />
          <h3 className="mb-1.5 text-lg">No Facilities Registered</h3>
          <p className="mb-[18px] text-[13px] text-app-subtle">
            Onboard facilities to generate physical QR codes for repair dispatch.
          </p>
          <button className="glow-btn" onClick={() => setShowAddForm(true)}>
            Add Your First Facility
          </button>
        </div>
      ) : (
        <div className="facility-qr-grid">
          {orgFacilities.map((facility) => {
            // Absolute representation URL
            const absoluteUrl = `${window.location.origin}/report?facilityId=${facility.id}&orgId=${selectedOrgId}`;
            return (
              <div key={facility.id} className="facility-qr-card">
                <div className="mb-2 flex w-full items-center gap-2">
                  <Building size={20} className="shrink-0 text-app-primary" />
                  <div className="min-w-0 text-left">
                    <h3 className="truncate text-[15px]" title={facility.name}>
                      {facility.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-app-muted">
                      <MapPin size={10} />
                      <span className="truncate">{facility.address}</span>
                    </div>
                  </div>
                </div>

                <div className="qr-wrapper">
                  <QRCodeSVG
                    id={`qr-svg-${facility.id}`}
                    value={absoluteUrl}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="mb-4 w-full break-all rounded bg-app-raised p-1.5 font-mono text-[11px] text-app-muted">
                  {facility.id}
                </div>

                <div className="mb-2 grid w-full grid-cols-2 gap-2">
                  <button
                    className="glow-btn btn-secondary gap-1 p-1.5 text-[11px]"
                    onClick={() => downloadQrCode(facility.id, facility.name)}
                    title="Download PNG QR Code"
                  >
                    <Download size={12} /> Download
                  </button>
                  <button
                    className="glow-btn btn-secondary gap-1 p-1.5 text-[11px]"
                    onClick={() => printQrCode(facility.id, facility.name)}
                    title="Print QR flyer"
                  >
                    <Printer size={12} /> Print
                  </button>
                </div>

                <button
                  className="glow-btn w-full gap-1 p-2 text-xs"
                  onClick={() => onSimulateQrClick(facility.id)}
                >
                  <Eye size={13} /> Test Report Form <ExternalLink size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
