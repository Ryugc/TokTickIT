import React, { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMIN';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  department: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface UserResponse {
  data: ManagedUser[];
  pagination?: { totalItems: number; totalPages: number; currentPage: number; limit: number };
}

const roles: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMIN'];

const emptyForm = {
  name: '',
  email: '',
  department: '',
  role: 'REQUESTER' as Role,
  password: '',
  isActive: true,
};

function RoleBadge({ role }: { role: Role }) {
  return <span style={{ ...badgeStyle, background: role === 'ADMIN' ? '#FDECEC' : role === 'IT_STAFF' ? '#EBF8FF' : '#EAF6EF', color: role === 'ADMIN' ? '#9B2C2C' : role === 'IT_STAFF' ? '#2B6CB0' : '#276749' }}>{role}</span>;
}

function ActiveBadge({ active }: { active: boolean }) {
  return <span style={{ ...badgeStyle, background: active ? '#F0FFF4' : '#EDF2F7', color: active ? '#276749' : '#718096' }}>{active ? 'Active' : 'Inactive'}</span>;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if (search.trim()) params.set('search', search.trim());
    if (role) params.set('role', role);
    if (department.trim()) params.set('department', department.trim());
    if (activeFilter) params.set('isActive', activeFilter);

    setLoading(true);
    setError('');
    fetch(`/api/admin/users?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load users.');
        return data as UserResponse | ManagedUser[];
      })
      .then((data) => setUsers(Array.isArray(data) ? data : data.data || []))
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [user, search, role, department, activeFilter]);

  if (user?.role !== 'ADMIN') return null;

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setForm({ name: managedUser.name, email: managedUser.email, department: managedUser.department, role: managedUser.role, password: '', isActive: managedUser.isActive });
    setError('');
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department.trim() || (!editingUser && !form.password)) {
      setError('Name, email, department, and an initial password are required.');
      return;
    }
    if (editingUser && editingUser.id === user.id && !form.isActive) {
      setError('You cannot deactivate your own Admin account.');
      return;
    }
    if (editingUser && editingUser.id === user.id && form.role !== 'ADMIN') {
      setError('You cannot remove your own ADMIN role.');
      return;
    }

    setSaving(true);
    setError('');
    const body: Record<string, unknown> = { name: form.name.trim(), email: form.email.trim(), department: form.department.trim(), role: form.role, isActive: form.isActive };
    if (!editingUser) body.password = form.password;
    try {
      const response = await fetch(editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users', {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save user.');
      setModalOpen(false);
      const savedUser = (data.data || data.user || data) as ManagedUser;
      setUsers((current) => editingUser ? current.map((item) => item.id === savedUser.id ? savedUser : item) : [...current, savedUser]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="user-management-title" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 id="user-management-title" style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>User Management</h2>
          <p style={{ color: '#4A5568', margin: 0 }}>Manage accounts, access roles, and active status.</p>
        </div>
        <button type="button" className="btn-zen-primary" onClick={openCreate}><Plus size={17} aria-hidden="true" /> Add User</button>
      </div>

      <div className="zen-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(130px, 1fr))', gap: '0.75rem' }}>
        <label style={controlLabel}><span>Search</span><div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.7rem', color: '#718096' }} aria-hidden="true" /><input aria-label="Search users" className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></div></label>
        <label style={controlLabel}><span>Role</span><select aria-label="Filter by role" className="form-select" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label style={controlLabel}><span>Department</span><input aria-label="Department filter" className="form-input" value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
        <label style={controlLabel}><span>Status</span><select aria-label="Filter by status" className="form-select" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
      </div>

      {error && <div role="alert" className="text-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="zen-card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</p> : users.length === 0 ? <p style={{ padding: '2rem', textAlign: 'center' }}>No users found.</p> : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}><thead><tr>{['Name', 'Email', 'Department', 'Role', 'Status', 'Actions'].map((heading) => <th key={heading} scope="col" style={tableHeading}>{heading}</th>)}</tr></thead><tbody>{users.map((managedUser) => <tr key={managedUser.id}><td style={tableCell}><strong>{managedUser.name}</strong></td><td style={tableCell}>{managedUser.email}</td><td style={tableCell}>{managedUser.department}</td><td style={tableCell}><RoleBadge role={managedUser.role} /></td><td style={tableCell}><ActiveBadge active={managedUser.isActive} /></td><td style={tableCell}><button type="button" aria-label={`Edit ${managedUser.name}`} className="btn-zen-outline" style={{ color: 'var(--primary-green)', borderColor: 'var(--primary-green)', padding: '0.4rem 0.65rem' }} onClick={() => openEdit(managedUser)}><Pencil size={15} aria-hidden="true" /> Edit</button></td></tr>)}</tbody></table>}
      </div>

      {modalOpen && <div className="modal-overlay" role="presentation"><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}><h3 id="user-modal-title" className="modal-title" style={{ margin: 0 }}>{editingUser ? 'Edit User' : 'Add User'}</h3><button type="button" aria-label="Close user modal" onClick={() => setModalOpen(false)} style={iconButton}><X size={19} /></button></div><form onSubmit={submit}><label className="form-group"><span className="form-label">Name</span><input className="form-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="form-group"><span className="form-label">Email</span><input className="form-input" type="email" disabled={Boolean(editingUser)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="form-group"><span className="form-label">Department</span><input className="form-input" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label><label className="form-group"><span className="form-label">Role</span><select className="form-select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{!editingUser && <label className="form-group"><span className="form-label">Initial Password</span><input className="form-input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}<label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}><input aria-label="Active" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn-zen-outline" style={{ color: '#4A5568', borderColor: '#CBD5E0' }} onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-zen-primary" disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}</button></div></form></div></div>}
    </section>
  );
}

const badgeStyle: React.CSSProperties = { display: 'inline-block', borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 };
const tableHeading: React.CSSProperties = { textAlign: 'left', padding: '0.85rem 1rem', color: '#4A5568', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' };
const tableCell: React.CSSProperties = { padding: '0.9rem 1rem', borderBottom: '1px solid #EDF2F7', color: '#1A202C', fontSize: '0.9rem' };
const controlLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#4A5568', fontSize: '0.8rem', fontWeight: 600 };
const iconButton: React.CSSProperties = { border: 0, background: 'transparent', color: '#4A5568', cursor: 'pointer', padding: '0.25rem' };