import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Shield, Key, Mail, User as UserIcon, Building2, Wrench, Phone } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUpType, setSignUpType] = useState<'organization' | 'vendor'>('organization');

  // Organization registration state
  const [newOrgName, setNewOrgName] = useState('');

  // Vendor registration state
  const [vendorName, setVendorName] = useState('');
  const [vendorSpecialty, setVendorSpecialty] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle invite links in the URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('inviteType');
    const emailParam = params.get('email');
    if (type === 'vendor') {
      setIsSignUp(true);
      setSignUpType('vendor');
      if (emailParam) {
        setEmail(emailParam);
      }
    } else if (type === 'member') {
      setIsSignUp(true);
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Check if this email has a pending member invitation (e.g. facility manager)
        const { data: memberInv, error: invError } = await supabase
          .from('member_invitations')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (memberInv) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                role: memberInv.role,
                organization_id: memberInv.organization_id
              }
            }
          });
          if (signUpError) throw signUpError;

          // Consume invitation
          await supabase.from('member_invitations').delete().eq('id', memberInv.id);

          if (data.user && data.session === null) {
            setError('Registration successful! Please check your email to verify your account.');
          } else if (data.session) {
            onAuthSuccess();
          }
          return;
        }

        if (signUpType === 'organization') {
          if (!newOrgName.trim()) {
            throw new Error('Organization name is required.');
          }

          // 1. Create Organization
          const generatedOrgId = `org-${Math.floor(Math.random() * 1000000)}`;
          const { error: orgError } = await supabase.from('organizations').insert({
            id: generatedOrgId,
            name: newOrgName,
            theme_color: '#4f46e5'
          });
          if (orgError) throw orgError;

          // 2. Sign Up User as Org Admin
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                role: 'admin',
                organization_id: generatedOrgId
              }
            }
          });
          if (signUpError) throw signUpError;

          if (data.user && data.session === null) {
            setError('Registration successful! Please check your email to verify your account.');
          } else if (data.session) {
            onAuthSuccess();
          }
        } else {
          // Register as Vendor
          let existingVendorId = '';

          // Check if a vendor profile was already created by a manager
          const { data: existingVendors, error: fetchErr } = await supabase
            .from('vendors')
            .select('id')
            .eq('email', email);

          if (fetchErr) throw fetchErr;

          if (existingVendors && existingVendors.length > 0) {
            existingVendorId = existingVendors[0].id;
          } else {
            // Create a brand new vendor profile
            if (!vendorName.trim() || !vendorSpecialty.trim()) {
              throw new Error('Company Name and Trade Specialty are required.');
            }
            existingVendorId = `ven-${Math.floor(100 + Math.random() * 900)}`;
            const { error: insertErr } = await supabase.from('vendors').insert({
              id: existingVendorId,
              name: vendorName,
              specialty: vendorSpecialty,
              email: email,
              phone: vendorPhone || null,
              active: true
            });
            if (insertErr) throw insertErr;
          }

          // Sign Up Auth User
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                role: 'vendor',
                vendor_id: existingVendorId
              }
            }
          });
          if (signUpError) throw signUpError;

          if (data.user && data.session === null) {
            setError('Registration successful! Please check your email to verify your account.');
          } else if (data.session) {
            onAuthSuccess();
          }
        }
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-[#1e1b4b] via-[#0f172a] to-black px-4 py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Shield size={28} />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            FaciliTrack Portal
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            {isSignUp ? 'Onboard a new organization or vendor profile' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {error && (
          <div className={`mt-6 rounded-lg border p-3.5 text-center text-xs font-semibold ${
            error.includes('successful') 
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
              : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Sign Up As</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSignUpType('organization')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    signUpType === 'organization'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white font-extrabold'
                      : 'border-white/10 bg-white/5 text-app-muted hover:bg-white/10'
                  }`}
                >
                  <Building2 size={14} /> Organization
                </button>
                <button
                  type="button"
                  onClick={() => setSignUpType('vendor')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    signUpType === 'vendor'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white font-extrabold'
                      : 'border-white/10 bg-white/5 text-app-muted hover:bg-white/10'
                  }`}
                >
                  <Wrench size={14} /> Repair Vendor
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="form-input pl-9"
                  style={{ paddingLeft: '2.5rem' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                placeholder="e.g. name@company.com"
                className="form-input pl-9"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                <Key size={16} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="form-input pl-9"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isSignUp && signUpType === 'organization' && (
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                  <Building2 size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Property Management"
                  className="form-input pl-9"
                  style={{ paddingLeft: '2.5rem' }}
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>
            </div>
          )}

          {isSignUp && signUpType === 'vendor' && (
            <>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                    <Building2 size={16} />
                  </span>
                  <input
                    type="text"
                    required={!email} // Optional if they signed up using invite link with prefilled profile
                    placeholder="e.g. Apex Electrical Services"
                    className="form-input pl-9"
                    style={{ paddingLeft: '2.5rem' }}
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Trade / Specialty *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                    <Wrench size={16} />
                  </span>
                  <input
                    type="text"
                    required={!email}
                    placeholder="e.g. HVAC, Plumbing, Electrical"
                    className="form-input pl-9"
                    style={{ paddingLeft: '2.5rem' }}
                    value={vendorSpecialty}
                    onChange={(e) => setVendorSpecialty(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                    <Phone size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 512-555-0199"
                    className="form-input pl-9"
                    style={{ paddingLeft: '2.5rem' }}
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glow-btn w-full justify-center py-2.5 text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <button
            type="button"
            className="font-semibold text-app-primary hover:underline cursor-pointer bg-transparent border-0"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
