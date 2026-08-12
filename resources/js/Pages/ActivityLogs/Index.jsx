import { Fragment } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";

const ACTION_META = {
    'project.created': { label: 'Project Created', icon: 'add_circle', color: 'text-primary' },
    'project.updated': { label: 'Project Updated', icon: 'edit', color: 'text-tertiary' },
    'project.deleted': { label: 'Project Deleted', icon: 'delete', color: 'text-error' },
    'project.duplicated': { label: 'Project Duplicated', icon: 'content_copy', color: 'text-primary' },
    'project.imported': { label: 'Projects Imported', icon: 'upload_file', color: 'text-primary' },
    'budget.finalized': { label: 'Budget Finalized', icon: 'task_alt', color: 'text-tertiary' },
    'budget.locked': { label: 'Budget Locked', icon: 'lock', color: 'text-error' },
    'budget.version_deleted': { label: 'Version Deleted', icon: 'delete_sweep', color: 'text-error' },
    'user.created': { label: 'User Created', icon: 'person_add', color: 'text-primary' },
    'user.updated': { label: 'User Updated', icon: 'manage_accounts', color: 'text-tertiary' },
    'user.deleted': { label: 'User Deleted', icon: 'person_remove', color: 'text-error' },
};

function formatDateTime(value) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') return '(empty)';
    return String(value);
}

function formatDayHeading(value) {
    return new Date(value).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

// Rows arrive already ordered by created_at desc from the server, so a
// single pass groups same-day rows into contiguous buckets without
// re-sorting. Grouping happens per page (not across the whole filtered
// result set) — consistent with how the rest of this page is paginated.
function groupByDay(logs) {
    const groups = [];
    for (const log of logs) {
        const dayKey = new Date(log.created_at).toDateString();
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.key === dayKey) {
            lastGroup.logs.push(log);
        } else {
            groups.push({ key: dayKey, heading: formatDayHeading(log.created_at), logs: [log] });
        }
    }
    return groups;
}

export default function ActivityLogsIndex() {
    const { logs, users, actions, filters } = usePage().props;
    const dayGroups = groupByDay(logs.data);
    const hasActiveFilters = filters.user_id || filters.action || filters.date_from || filters.date_to;

    const applyFilter = (key, value) => {
        router.get(route('activity-logs.index'), { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Activity Log" />

            <div className="space-y-stack-md">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <nav className="flex text-outline mb-2">
                            <span className="text-[11px] font-label-caps uppercase">Admin</span>
                            <span className="mx-2 text-[11px]">/</span>
                            <span className="text-[11px] font-label-caps text-primary uppercase">Activity Log</span>
                        </nav>
                        <h2 className="font-headline-md text-headline-md text-on-surface">Activity Log</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            Every create, update, delete, import, finalize, and lock action taken by every user.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filters.user_id ?? ''}
                        onChange={(e) => applyFilter('user_id', e.target.value)}
                        className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest"
                    >
                        <option value="">All users</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <select
                        value={filters.action ?? ''}
                        onChange={(e) => applyFilter('action', e.target.value)}
                        className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest"
                    >
                        <option value="">All actions</option>
                        {actions.map(a => (
                            <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest">
                        <span className="text-xs text-on-surface-variant">From</span>
                        <input
                            type="date"
                            value={filters.date_from ?? ''}
                            onChange={(e) => applyFilter('date_from', e.target.value)}
                            className="border-none p-0 text-sm bg-transparent focus:ring-0"
                        />
                        <span className="text-xs text-on-surface-variant">to</span>
                        <input
                            type="date"
                            value={filters.date_to ?? ''}
                            onChange={(e) => applyFilter('date_to', e.target.value)}
                            className="border-none p-0 text-sm bg-transparent focus:ring-0"
                        />
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={() => router.get(route('activity-logs.index'), {}, { preserveState: true, preserveScroll: true, replace: true })}
                            className="text-sm text-on-surface-variant hover:text-primary underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-primary px-container-padding py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-white">history</span>
                        <h4 className="font-title-sm text-title-sm text-white font-bold">
                            {logs.total} Activit{logs.total !== 1 ? 'ies' : 'y'}
                        </h4>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant">
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Time</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">User</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Action</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/30">
                                {dayGroups.map(group => (
                                    <Fragment key={group.key}>
                                        <tr className="bg-surface-container-low">
                                            <td colSpan={4} className="px-6 py-2 text-xs font-label-caps uppercase tracking-wide text-on-surface-variant sticky top-0">
                                                {group.heading} <span className="text-on-surface-variant/60 normal-case">· {group.logs.length} activit{group.logs.length !== 1 ? 'ies' : 'y'}</span>
                                            </td>
                                        </tr>
                                        {group.logs.map(log => {
                                            const meta = ACTION_META[log.action] ?? { label: log.action, icon: 'info', color: 'text-on-surface-variant' };
                                            return (
                                                <tr key={log.id} className="hover:bg-primary-container/5">
                                                    <td className="px-6 py-4 text-on-surface-variant text-sm whitespace-nowrap">
                                                        {formatDateTime(log.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-on-surface whitespace-nowrap">
                                                        {log.user?.name ?? 'Unknown user'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${meta.color}`}>
                                                            <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-on-surface-variant text-sm">
                                                        {log.description}
                                                        {log.properties && Object.keys(log.properties).length > 0 && (
                                                            <ul className="mt-1.5 space-y-0.5 border-l-2 border-outline-variant pl-2.5">
                                                                {Object.entries(log.properties).map(([field, diff]) => (
                                                                    <li key={field} className="text-xs text-on-surface-variant/80">
                                                                        <span className="font-mono">{field}</span>:{' '}
                                                                        <span className="line-through decoration-error/60">{formatValue(diff.old)}</span>
                                                                        {' → '}
                                                                        <span className="font-medium text-on-surface">{formatValue(diff.new)}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant">
                                            No activity recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low">
                            <span className="text-sm text-on-surface-variant">
                                Page {logs.current_page} of {logs.last_page}
                            </span>
                            <div className="flex gap-2">
                                {logs.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll
                                        className={`px-3 py-1.5 rounded-lg text-sm ${
                                            link.active
                                                ? 'bg-primary text-on-primary font-bold'
                                                : link.url
                                                    ? 'text-on-surface-variant hover:bg-surface-container-high'
                                                    : 'text-on-surface-variant/30 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
