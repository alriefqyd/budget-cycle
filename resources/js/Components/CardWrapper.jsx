import {usePage} from "@inertiajs/react";

export default function CardWrapper({ children, mb = 'mb-4', rounded = '' }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 ${mb}`}>
            <div className={`md:col-span-12 bg-white ${rounded} shadow-lg`}>
                {children}
            </div>
        </div>
    );
}
