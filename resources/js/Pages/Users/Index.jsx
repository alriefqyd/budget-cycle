import { useState } from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";
import Modal from "@/Components/Modal.jsx";
import Swal from "sweetalert2";

const ROLE_LABELS = {
    editor: 'Editor — full access',
    viewer: 'Viewer — read-only',
};

function UserForm({ mode, user, roles, onClose }) {
    const isEdit = mode === 'edit';
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        role: user?.role ?? roles[0],
    });

    const submit = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        if (isEdit) {
            patch(route('users.update', user.id), { onSuccess, preserveScroll: true });
        } else {
            post(route('users.store'), { onSuccess, preserveScroll: true });
        }
    };

    return (
        <form onSubmit={submit} className="p-6 space-y-4">
            <h3 className="font-title-sm text-title-sm text-on-surface">{isEdit ? 'Edit User' : 'Add User'}</h3>

            <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Name</label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                    autoFocus
                />
                {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Email</label>
                <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                />
                {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
            </div>

            {!isEdit && (
                <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1">Password</label>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                        placeholder="Minimum 8 characters"
                    />
                    {errors.password && <p className="text-error text-xs mt-1">{errors.password}</p>}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Role</label>
                <select
                    value={data.role}
                    onChange={(e) => setData('role', e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                >
                    {roles.map(role => (
                        <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
                    ))}
                </select>
                {errors.role && <p className="text-error text-xs mt-1">{errors.role}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-high transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:brightness-110 transition-all disabled:opacity-50"
                >
                    {isEdit ? 'Save Changes' : 'Add User'}
                </button>
            </div>
        </form>
    );
}

export default function UsersIndex() {
    const { users, roles, auth } = usePage().props;
    const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', user? }

    const handleDelete = (user) => {
        Swal.fire({
            title: `Delete ${user.name}?`,
            text: 'This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#ba1a1a',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.delete(route('users.destroy', user.id), {
                preserveScroll: true,
                onError: (errors) => {
                    Swal.fire('Cannot delete', errors.delete || 'Something went wrong', 'error');
                },
            });
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Users" />

            <div className="space-y-stack-md">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <nav className="flex text-outline mb-2">
                            <span className="text-[11px] font-label-caps uppercase">Admin</span>
                            <span className="mx-2 text-[11px]">/</span>
                            <span className="text-[11px] font-label-caps text-primary uppercase">Users</span>
                        </nav>
                        <h2 className="font-headline-md text-headline-md text-on-surface">Users</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            Editors have full access (create, edit, delete, finalize). Viewers can see every page but can't change anything.
                        </p>
                    </div>
                    <button
                        onClick={() => setModal({ mode: 'create' })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:brightness-110 transition-all shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                        <span className="font-label-caps text-label-caps">Add User</span>
                    </button>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-primary px-container-padding py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-white">group</span>
                        <h4 className="font-title-sm text-title-sm text-white font-bold">{users.length} User{users.length !== 1 ? 's' : ''}</h4>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant">
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Name</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Email</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Role</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/30">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-primary-container/5">
                                        <td className="px-6 py-4 font-medium text-on-surface">
                                            {user.name}
                                            {user.id === auth.user.id && (
                                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">You</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm">{ROLE_LABELS[user.role] ?? user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setModal({ mode: 'edit', user })}
                                                title="Edit user"
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                disabled={user.id === auth.user.id}
                                                title={user.id === auth.user.id ? "You can't delete your own account" : "Delete user"}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-error/60 hover:bg-error/10 hover:text-error transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal show={!!modal} onClose={() => setModal(null)} maxWidth="md">
                {modal && (
                    <UserForm
                        mode={modal.mode}
                        user={modal.user}
                        roles={roles}
                        onClose={() => setModal(null)}
                    />
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
