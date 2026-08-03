import Dropdown from '@/Components/Dropdown';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { InertiaProgress } from '@inertiajs/progress';
import { useState } from 'react';

const navItems = [
    { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Budgets', icon: 'account_balance_wallet', href: '/budgets' },
    { label: 'Reports', icon: 'analytics' },
    { label: 'Settings', icon: 'settings' },
];

function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

export default function AuthenticatedLayout({ header, children }) {
    InertiaProgress.init({
        color: '#006360',
        showSpinner: true,
    });

    const { auth } = usePage().props;
    const user = auth.user;
    const currentPath = usePage().url;
    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className="min-h-screen bg-background text-on-surface font-sans">
            {/* Sidebar Navigation */}
            <aside
                className={`fixed left-0 top-0 h-full ${
                    collapsed ? 'w-20' : 'w-64'
                } bg-surface-container-low border-r border-outline-variant flex flex-col py-container-padding gap-stack-md z-50 transition-all duration-200`}
            >
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand menu' : 'Collapse menu'}
                    className="absolute -right-3 top-8 w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-primary shadow-sm"
                >
                    <span className="material-symbols-outlined text-[16px]">
                        {collapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                <div className={`px-6 mb-8 flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3'}`}>
                    <ApplicationLogo iconOnly={collapsed} className="h-10 w-auto shrink-0 fill-current text-primary" />
                    {!collapsed && (
                        <p className="font-label-caps text-label-caps text-on-surface-variant opacity-70">Budget System</p>
                    )}
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const active = item.href && currentPath.startsWith(item.href);

                        if (!item.href) {
                            return (
                                <span
                                    key={item.label}
                                    className={`flex items-center gap-3 px-4 py-3 text-on-surface-variant/40 rounded-lg cursor-not-allowed ${
                                        collapsed ? 'justify-center px-0' : ''
                                    }`}
                                    title="Coming soon"
                                >
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                    {!collapsed && <span className="font-label-caps text-label-caps">{item.label}</span>}
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                                    collapsed ? 'justify-center px-0' : ''
                                } ${
                                    active
                                        ? 'bg-primary-container text-on-primary-container translate-x-1'
                                        : 'text-on-surface-variant hover:bg-surface-container-high hover:translate-x-1'
                                }`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {!collapsed && <span className="font-label-caps text-label-caps">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>
                <div className="px-4 mt-auto space-y-2">
                    <Link
                        href="/budgets"
                        title={collapsed ? 'Create New Budget Cycle' : undefined}
                        className={`w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:brightness-110 transition-all text-xs uppercase tracking-wider mb-4`}
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        {!collapsed && 'Create New Budget Cycle'}
                    </Link>
                    <Link
                        href={route('profile.edit')}
                        title={collapsed ? 'Help Center' : undefined}
                        className={`flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors ${
                            collapsed ? 'justify-center px-0' : ''
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">help</span>
                        {!collapsed && <span className="font-label-caps text-label-caps">Help Center</span>}
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        title={collapsed ? 'Logout' : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error transition-colors ${
                            collapsed ? 'justify-center px-0' : ''
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        {!collapsed && <span className="font-label-caps text-label-caps">Logout</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`${collapsed ? 'ml-20' : 'ml-64'} min-h-screen flex flex-col transition-all duration-200`}>
                <header className="sticky top-0 z-40 w-full bg-surface-container-lowest border-b border-outline-variant px-container-padding py-stack-sm flex justify-end items-center shadow-sm">
                    <div className="flex items-center gap-6">
                        <button className="relative text-on-surface-variant hover:text-primary transition-colors" type="button">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest"></span>
                        </button>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <div className="flex items-center gap-3 pl-4 border-l border-outline-variant cursor-pointer">
                                    <div className="text-right">
                                        <p className="font-label-caps text-label-caps text-on-surface leading-none mb-1">{user.name}</p>
                                        <p className="font-body-sm text-[10px] text-outline uppercase tracking-widest">{user.email}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center border-2 border-white shadow-sm text-on-primary-container font-bold text-sm">
                                        {getInitials(user.name)}
                                    </div>
                                </div>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {header && (
                    <div className="px-container-padding py-4 bg-surface-container-lowest border-b border-outline-variant">
                        {header}
                    </div>
                )}

                <main className="flex-1 p-container-padding max-w-[1600px] w-full mx-auto">{children}</main>
            </div>
        </div>
    );
}
