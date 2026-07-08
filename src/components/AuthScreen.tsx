import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Organization, Vendor } from '../types';
import { Shield, Key, Mail, User as UserIcon, Building2, Wrench } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manager' | 'vendor' | 'tenant'>('tenant');
  const [orgId, setOrgId] = useState('');
  const [vendorId, setVendorId] = useState('');
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load organizations and vendors list for sign-up dropdowns
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const { data: orgsData } = await supabase.from('organizations').select('*');
        if (orgsData) {
          setOrganizations(orgsData);
          if (orgsData.length > 0) setOrgId(orgsData[0].id);
        }

        const { data: vendorsData } = await supabase.from('vendors').select('*');
        if (vendorsData) {
          setVendors(vendorsData);
          if (vendorsData.length > 0) setVendorId(vendorsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching signup metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
              organization_id: orgId,
              vendor_id: role === 'vendor' ? vendorId : null
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
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-[#1e1b4b] via-[#0f172a] to-black px-4 py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow Effects */}
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
            {isSignUp ? 'Create a secure client/testing profile' : 'Sign in to access your dashboard'}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label className="form-label">Select Testing Role</label>
                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="tenant">Resident Tenant</option>
                  <option value="manager">Facility Manager</option>
                  <option value="vendor">Vendor / Contractor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Affiliated Organization</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                    <Building2 size={16} />
                  </span>
                  <select
                    className="form-input pl-9"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {role === 'vendor' && (
                <div className="form-group">
                  <label className="form-label">Linked Vendor Profile</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-app-muted">
                      <Wrench size={16} />
                    </span>
                    <select
                      className="form-input pl-9"
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                    >
                      {vendors
                        .filter(v => v.organizationId === orgId)
                        .map((ven) => (
                          <option key={ven.id} value={ven.id}>{ven.name} ({ven.specialty})</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
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
