import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { Shield, Trash2, Ban, CheckCircle, UserX, ArrowLeft, Search, Users, Lock, Unlock, RefreshCw, LogOut } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';
import PageTransition from '@/components/apas/PageTransition';
import { toast } from 'sonner';

export default function AdminPanel() {
  const navigate = useNavigate();
  const {
    isAdmin, profile, allProfiles, fetchAllProfiles,
    deleteUser, kickUser, restrictUser, approveUser,
    deactivateDevPrivileges,
  } = useAuth();

  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; name: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home', { replace: true });
      return;
    }
    fetchAllProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = allProfiles.filter(p => {
    const q = search.toLowerCase();
    return p.email.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q);
  });

  const isOwnAccount = (userId: string) => profile?.id === userId;
  const isAdminAccount = (p: UserProfile) => p.role === 'admin';

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, userId, name } = confirmAction;

    switch (type) {
      case 'delete':
        await deleteUser(userId);
        toast.success(`User "${name}" has been deleted.`);
        break;
      case 'kick':
        await kickUser(userId);
        toast.success(`User "${name}" has been kicked. They must re-login.`);
        break;
      case 'restrict':
        await restrictUser(userId, true);
        toast.success(`User "${name}" has been restricted.`);
        break;
      case 'unrestrict':
        await restrictUser(userId, false);
        toast.success(`User "${name}" restrictions have been removed.`);
        break;
      case 'approve':
        await approveUser(userId);
        toast.success(`User "${name}" has been approved for full access.`);
        break;
    }
    setConfirmAction(null);
    await fetchAllProfiles();
  };

  if (!isAdmin) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/60 bg-background/95 backdrop-blur-xl sticky top-0 z-40 shadow-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <ApasLogo size={24} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  deactivateDevPrivileges();
                  navigate('/home');
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                title="Exit Admin Mode"
              >
                <LogOut className="w-4 h-4" />
                Exit Admin
              </button>
              <button
                onClick={() => fetchAllProfiles()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{allProfiles.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Approved</span>
              </div>
              <p className="text-2xl font-bold">{allProfiles.filter(p => p.is_approved).length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-500 mb-1">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold">{allProfiles.filter(p => !p.is_approved).length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <Ban className="w-4 h-4" />
                <span className="text-xs font-medium">Restricted</span>
              </div>
              <p className="text-2xl font-bold">{allProfiles.filter(p => p.is_restricted).length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <label htmlFor="admin-search" className="sr-only">Search users</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="admin-search"
              name="search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users by email or name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Users Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.avatar_url && /^https:\/\/.+/i.test(p.avatar_url) ? (
                              <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {p.display_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">{p.display_name}</span>
                            {isOwnAccount(p.id) && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {p.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.is_restricted ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Restricted</span>
                          ) : p.is_approved ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Approved</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Cannot act on own admin account or other admin accounts */}
                            {!isOwnAccount(p.id) && !isAdminAccount(p) && (
                              <>
                                {!p.is_approved && (
                                  <button
                                    onClick={() => setConfirmAction({ type: 'approve', userId: p.id, name: p.display_name })}
                                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500 transition-colors"
                                    title="Approve user"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {p.is_restricted ? (
                                  <button
                                    onClick={() => setConfirmAction({ type: 'unrestrict', userId: p.id, name: p.display_name })}
                                    className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                                    title="Remove restrictions"
                                  >
                                    <Unlock className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmAction({ type: 'restrict', userId: p.id, name: p.display_name })}
                                    className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition-colors"
                                    title="Restrict user"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirmAction({ type: 'kick', userId: p.id, name: p.display_name })}
                                  className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500 transition-colors"
                                  title="Kick user (force re-login)"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ type: 'delete', userId: p.id, name: p.display_name })}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(isOwnAccount(p.id) || isAdminAccount(p)) && (
                              <span className="text-[10px] text-muted-foreground italic">Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to <strong>{confirmAction.type}</strong> user <strong>{confirmAction.name}</strong>?
                {confirmAction.type === 'delete' && ' This action cannot be undone.'}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  className={`px-4 py-2 rounded-lg text-sm text-white transition-colors ${
                    confirmAction.type === 'delete' ? 'bg-red-500 hover:bg-red-600' :
                    confirmAction.type === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                    'bg-primary hover:bg-primary/90'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
