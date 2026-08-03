import axios from 'axios';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Deliberately NOT setting a static X-CSRF-TOKEN header here. Laravel's CSRF
// check looks at X-CSRF-TOKEN first and only falls back to the XSRF-TOKEN
// cookie (sent as X-XSRF-TOKEN) if that header is absent — so a static token
// baked into the page at initial load would always win and never let the
// fresher, auto-refreshed cookie be used. In a long-lived Inertia SPA session
// (no full page reload between visits) the session's real CSRF token can
// rotate underneath that stale meta-tag value, causing "CSRF token mismatch"
// on actions performed a while after the page first loaded. axios already
// reads the XSRF-TOKEN cookie and attaches X-XSRF-TOKEN automatically for
// same-origin requests, so no header needs to be set manually at all.

import './echo';
