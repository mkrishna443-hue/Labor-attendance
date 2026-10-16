import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  Shield,
  Check,
  Plus,
  Edit3,
  User,
  Phone,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../common/Modal';

interface HeaderProps {
  onOpenSiteManagement: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSiteManagement }) => {
  const { sites, currentSite, setCurrentSite, isOnline, isSyncing, pendingQueue, syncNow } = useSite();
  const { user, profile, isAdmin, signOut, updateProfile } = useAuth();
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Profile Edit Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileRole, setProfileRole] = useState<'admin' | 'supervisor'>('supervisor');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || '');
      setProfilePhone(profile.phone || '');
      setProfileRole(profile.role === 'admin' ? 'admin' : 'supervisor');
    }
  }, [profile, isProfileModalOpen]);

  const handleSyncClick = async () => {
    if (!isOnline || isSyncing) return;
    await syncNow();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    setIsSavingProfile(true);
    setProfileMsg(null);

    const res = await updateProfile({
      name: profileName,
      phone: profilePhone,
      role: profileRole,
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileMsg(null);
      }, 1200);
    } else {
      setProfileMsg({ type: 'error', text: res.error || 'Failed to update profile' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Site Selector Trigger */}
          <button
            type="button"
            onClick={() => setIsSitePickerOpen(true)}
            className="flex items-center gap-2 min-w-0 py-1 px-2 -ml-2 rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-white truncate max-w-[170px] sm:max-w-[220px]">
                  {currentSite?.name || 'Select Construction Site'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-[220px]">
                {currentSite?.address || 'No active site selected'}
              </p>
            </div>
          </button>

          {/* Right Action Icons: Sync Pill & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sync / Offline Pill */}
            {pendingQueue.length > 0 ? (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={!isOnline || isSyncing}
                title={isOnline ? 'Tap to sync records now' : 'Device is offline'}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 active:bg-amber-600 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingQueue.length} Pending</span>
              </button>
            ) : !isOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-rose-400 border border-slate-700">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Online & Synced" />
            )}

            {/* Profile Avatar / Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsEditingProfile(false);
                setIsProfileModalOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold hover:border-slate-500 transition-colors"
              title="Profile & Options"
            >
              {profile?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* Site Picker Modal */}
      <Modal
        isOpen={isSitePickerOpen}
        onClose={() => setIsSitePickerOpen(false)}
        title="Switch Construction Site"
        subtitle="Select the site to record or view attendance"
      >
        <div className="space-y-2">
          {sites.map((s) => {
            const isSelected = currentSite?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSite(s);
                  setIsSitePickerOpen(false);
                }}
                className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="font-bold text-sm truncate">{s.name}</span>
                  </div>
                  {s.address && (
                    <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {s.address}
                    </p>
                  )}
                </div>
                {isSelected && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}

          {sites.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-sm">
              <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>No construction sites available.</p>
              <p className="text-xs text-slate-400 mt-1">Create your first site below.</p>
            </div>
          )}

          <button
            onClick={() => {
              setIsSitePickerOpen(false);
              onOpenSiteManagement();
            }}
            className="w-full mt-3 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create / Manage Construction Sites</span>
          </button>
        </div>
      </Modal>

      {/* User Profile & Edit Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setIsEditingProfile(false);
        }}
        title={isEditingProfile ? 'Edit Profile & Role' : 'Supervisor Account'}
        subtitle={isEditingProfile ? 'Update your personal details & permissions' : 'Account information and settings'}
      >
        <div className="space-y-4">
          {profileMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {isEditingProfile ? (
            /* PROFILE EDIT FORM */
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Sai Krishna"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Account Permissions / Role
                </label>
                <select
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value as 'admin' | 'supervisor')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                >
                  <option value="admin">Administrator (Full site creation &amp; management)</option>
                  <option value="supervisor">Site Supervisor (Labor attendance &amp; reporting)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting <strong>Administrator</strong> unlocks full access to all sites, settings, and team controls.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* PROFILE DETAILS VIEW */
            <>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 font-bold text-lg flex items-center justify-center shrink-0">
                    {profile?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-base truncate">
                      {profile?.name || user?.email?.split('@')[0] || 'Site Supervisor'}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email || profile?.email || 'No email'}
                    </p>
                    {profile?.phone && (
                      <p className="text-[11px] text-slate-500">{profile.phone}</p>
                    )}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-800">
                        <Shield className="w-3 h-3 text-slate-600" />
                        {isAdmin ? 'System Administrator' : 'Site Supervisor'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                  title="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Site:</span>
                  <span className="font-semibold text-slate-900">{currentSite?.name || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Network State:</span>
                  <span className={`font-semibold ${isOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isOnline ? 'Connected' : 'Offline Mode'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending Sync:</span>
                  <span className="font-semibold text-slate-900">{pendingQueue.length} record(s)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onOpenSiteManagement();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-700" />
                <span>Manage Construction Sites</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  signOut();
                }}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
