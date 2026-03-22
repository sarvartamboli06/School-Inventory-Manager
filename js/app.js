import { router } from './router.js?v=999';
import { isSupabaseConfigured, supabase } from './supabase.js?v=999';

console.log("App initializing...");
if (!isSupabaseConfigured) {
    showConfigWarning();
}

async function initAuth() {
    try {
        // Check for hardcoded admin bypass first
        if (localStorage.getItem('admin_session') === 'true') {
            console.log("Offline Admin session verified, initializing router...");
            router.init();
            setupNavigation();
            
            const logoutBtn = document.querySelector('.sidebar-footer .btn');
            if(logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    localStorage.removeItem('admin_session');
                    await supabase.auth.signOut();
                    window.location.href = 'login.html';
                });
            }
            return;
        }

        const sessionResponse = await supabase.auth.getSession();
        
        if (sessionResponse.error || !sessionResponse.data || !sessionResponse.data.session) {
            console.log("No active session or network error, redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        console.log("Supabase Session verified, initializing router...");
        router.init();
        setupNavigation();
        
        const logoutBtn = document.querySelector('.sidebar-footer .btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                localStorage.removeItem('admin_session');
                await supabase.auth.signOut();
                window.location.href = 'login.html';
            });
        }
    } catch (e) {
        console.error("Auth check failed:", e);
        window.location.href = 'login.html'; // Force redirect on fatal crash
    }
}

initAuth();

function showConfigWarning() {
    const warning = document.createElement('div');
    warning.style = 'background: #EF4444; color: white; padding: 12px; text-align: center; font-weight: 500; z-index: 9999; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);';
    warning.innerHTML = '⚠️ <strong>Supabase is not configured!</strong> Please open <code>js/supabase.js</code> and add your Supabase URL and Anon Key to enable the live database functionality.';
    document.getElementById('app').prepend(warning);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all
            navItems.forEach(n => n.classList.remove('active'));
            // Add to clicked
            e.currentTarget.classList.add('active');
        });
    });

    // Update active nav based on current hash
    const currentHash = window.location.hash || '#/';
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentHash) {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        }
    });
}
