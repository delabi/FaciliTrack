import React, { useState } from 'react';
import { X, Camera, Phone, User as UserIcon, Loader2 } from 'lucide-react';
import { User } from '../types';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: { name: string; phone?: string; avatarUrl?: string }) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-app-border bg-[#0d1321] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-4">
          <h2 className="text-lg font-bold text-white">Edit Your Profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-app-muted hover:bg-app-raised hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative group">
              <div 
                className="h-24 w-24 overflow-hidden rounded-full border-2 border-indigo-500/30 bg-app-raised flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!avatarUrl && (name ? name[0].toUpperCase() : 'U')}
              </div>
              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-2 text-white shadow-md hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Camera size={14} />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <span className="text-[10px] text-app-muted">Click the camera icon to upload a profile image</span>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app-muted flex items-center gap-1.5">
              <UserIcon size={14} /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alexander Pierce"
              className="w-full rounded-lg border border-app-border bg-app-raised px-3.5 py-2.5 text-sm text-white placeholder-app-muted focus:border-indigo-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-app-muted flex items-center gap-1.5">
              <Phone size={14} /> Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
              className="w-full rounded-lg border border-app-border bg-app-raised px-3.5 py-2.5 text-sm text-white placeholder-app-muted focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-app-border pt-4 mt-6 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-app-border bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-app-raised hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="glow-btn flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
