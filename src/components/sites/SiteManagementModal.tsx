import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, Check, AlertCircle, Trash2, MapPin, Shield } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ConstructionSite, Profile, SiteMember } from '../../types';

interface SiteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SiteManagementModal: React.FC<SiteManagementModalProps> = ({ isOpen, onClose }) => {
  const { sites, currentSite, setCurrentSite, refreshData } = useSite();
  const { isAdmin } = useAuth();

  // Create site form state
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Selected site for member management
  const [activeSiteForMembers, setActiveSiteForMembers] = useState<ConstructionSite | null>(null);
  const [siteMembers, setSiteMembers] = useState<SiteMember[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all profiles and site members when modal is opened
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    supabase
      .from('profiles')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setAllProfiles(data as Profile[]);
      });
  }, [isOpen, isAdmin]);

  // Fetch members when activeSiteForMembers is set
  useEffect(() => {
    if (!activeSiteForMembers) {
      setSiteMembers([]);
      return;
    }

    setMemberLoading(true);
    supabase
      .from('site_members')
      .select('*, profile:user_id(id, name, phone, role)')
      .eq('site_id', activeSiteForMembers.id)
      .then(({ data, error }) => {
        setMemberLoading(false);
        if (error) {
          console.warn('Error fetching site members:', error.message);
          return;
        }
        setSiteMembers((data || []) as SiteMember[]);
      });
  }, [activeSiteForMembers]);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    setIsCreating(true);
    setFeedbackMsg(null);

    try {
      const { data, error } = await supabase
        .from('construction_sites')
        .insert({
          name: siteName.trim(),
          address: siteAddress.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newSite = data as ConstructionSite;
      setSiteName('');
      setSiteAddress('');
      setShowCreateForm(false);
      setFeedbackMsg({ type: 'success', text: `Site "${newSite.name}" created successfully!` });
      await refreshData();
      setCurrentSite(newSite);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create site';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMember = async () => {
    if (!activeSiteForMembers || !selectedUserToAdd) return;

    try {
      const { error } = await supabase.from('site_members').insert({
        site_id: activeSiteForMembers.id,
        user_id: selectedUserToAdd,
        role: 'supervisor',
      });

      if (error) throw error;

      // Refresh members
      const { data } = await supabase
        .from('site_members')
        .select('*, profile:user_id(id, name, phone, role)')
        .eq('site_id', activeSiteForMembers.id);

      setSiteMembers((data || []) as SiteMember[]);
      setSelectedUserToAdd('');
      setFeedbackMsg({ type: 'success', text: 'Supervisor assigned to site!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign supervisor';
      setFeedbackMsg({ type: 'error', text: msg });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this supervisor from the site?')) return;

    try {
      const { error } = await supabase.from('site_members').delete().eq('id', memberId);
      if (error) throw error;

      setSiteMembers((prev) => prev.filter((m) => m.id !== memberId));
      setFeedbackMsg({ type: 'success', text: 'Supervisor unassigned from site.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove supervisor';
      setFeedbackMsg({ type: 'error', text: msg });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Site Management"
      subtitle="Create sites and assign authorized supervisors"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {feedbackMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-500 font-bold ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Top Action: Add New Site Button */}
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Construction Site</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSite} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">New Construction Site Details</h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Site Name *</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Metro Heights Phase 2"
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address / Location</label>
              <input
                type="text"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="e.g. Sector 42, Gurugram"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Save Site'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Sites List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Sites ({sites.length})
          </h4>

          {sites.map((site) => {
            const isCurrent = currentSite?.id === site.id;
            const isManagingMembers = activeSiteForMembers?.id === site.id;

            return (
              <div
                key={site.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent ? 'bg-slate-50 border-slate-900' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-700 shrink-0" />
                      <h5 className="font-bold text-sm text-slate-900 truncate">{site.name}</h5>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-white">
                          Active Site
                        </span>
                      )}
                    </div>
                    {site.address && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{site.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveSiteForMembers(isManagingMembers ? null : site)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                        isManagingMembers
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Supervisors</span>
                    </button>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => setCurrentSite(site)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                </div>

                {/* Supervisor Assignment Drawer for this site */}
                {isManagingMembers && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 bg-slate-100/70 p-3 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-600" />
                        Assigned Supervisors ({siteMembers.length})
                      </span>
                    </div>

                    {/* Add Supervisor Selector */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedUserToAdd}
                        onChange={(e) => setSelectedUserToAdd(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="">Select supervisor to assign...</option>
                        {allProfiles
                          .filter((p) => !siteMembers.some((m) => m.user_id === p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.phone || 'No phone'}) - {p.role}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={!selectedUserToAdd}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>

                    {/* Member List */}
                    <div className="space-y-1.5 pt-1">
                      {siteMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{m.profile?.name || 'Supervisor'}</span>
                            <span className="text-slate-500 text-[11px] ml-2">({m.profile?.phone || 'No phone'})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-rose-600 hover:text-rose-800 p-1"
                            title="Remove supervisor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {siteMembers.length === 0 && (
                        <p className="text-slate-400 text-center py-2 text-[11px]">
                          No supervisors assigned. Only system administrators can access this site currently.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
