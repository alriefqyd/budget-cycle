import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {Home, Folder, BarChart2, Settings, Menu} from 'lucide-react';
import { InertiaProgress } from '@inertiajs/progress';


export default function AuthenticatedLayout({ header, children }) {
    InertiaProgress.init({
        color: '#007e7a', // Use your custom teal color here
        showSpinner: true, // Optional: disables the spinner
    });

    const user = usePage().props.auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [sideBarOpacity, setSidebarOpacity] = useState('opacity-30');

    return (
        <div className="relative h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Floating Menu Button */}
            <button
                onMouseEnter={() => {
                    setTimeout(function (){
                        setSidebarVisible(true);
                    },100)
                    setSidebarOpacity('opacity-100')}}

                onMouseLeave={() => {
                    setSidebarVisible(false)
                    setSidebarOpacity('opacity-30');}
                    }
                className={`fixed ${sidebarVisible ? 'opacity-0' : sideBarOpacity} top-1/2 left-2 z-50 w-12 h-12 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-lg flex items-center justify-center transition`}
            >
                <Menu className="text-white" size={18}/>
            </button>

            {/* Sidebar */}
            <aside
                onMouseEnter={() => setSidebarVisible(true)}
                onMouseLeave={() => setSidebarVisible(false)}
                className={`fixed top-0 left-0 h-full w-64 bg-teal-600 text-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
                    sidebarVisible ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-4 text-2xl font-bold tracking-wide border-b-2 border-b-yellow-300"><h1
                    className="text-xl font-semibold ml-10 text-white">Budget Cycle</h1></div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                <NavLink icon={<Home size={18}/>} label="Dashboard" href="/dashboard"/>
                    <NavLink icon={<Folder size={18}/>} label="Projects" href="/budgets"/>
                    <NavLink icon={<BarChart2 size={18}/>} label="Reports" href="/reports"/>
                    <NavLink icon={<Settings size={18}/>} label="Settings" href="/settings"/>
                </nav>
                <div className="p-4 text-sm text-center text-purple-200">© 2025 Vale Inc.</div>
            </aside>

            {/* Main content */}
            <div className="h-full flex flex-col">
                {/* Header */}
                <header className="h-16 w-full bg-white shadow flex items-center justify-between border-b-2 border-b-yellow-300 px-6 z-10">
                    <ApplicationLogo className="block h-9 w-auto fill-current text-yellow-400" />
                         <div className="hidden sm:ms-6 sm:flex sm:items-center">
                             <div className="relative ms-3">
                                 <Dropdown>
                                    <Dropdown.Trigger>
                                         <span className="inline-flex rounded-md">
                                             <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-teal-700 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                                >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
            </div>
        </div>
    );

    function NavLink({icon, label, href}) {
        return (
            <Link
                href={href}
                className="flex items-center px-3 py-2 rounded-lg hover:bg-white/10 transition duration-150"
            >
                {icon}
                <span className="ml-3 text-sm font-medium">{label}</span>
            </Link>
        );
    }
}
