import { router } from './router.js?v=1000';
import { isSupabaseConfigured, supabase } from './supabase.js?v=1000';

// Global Notification Engine initialized at Boot
if (!document.getElementById('toast-container')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; pointer-events: none;"></div>
    `);
}

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Auto-detect error states for unformatted inputs
    if (type === 'success' && (message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') || message.toLowerCase().includes('could not'))) {
        type = 'error';
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#10B981' : '#EF4444';
    const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
    
    toast.style = `pointer-events: auto; background: ${bgColor}; color: white; padding: 14px 20px; border-radius: 8px; box-shadow: var(--shadow-lg); font-weight: 500; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; transform: translateY(100%); opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); max-width: 400px;`;
    toast.innerHTML = `<i class="ph ${icon}" style="font-size: 1.25rem;"></i> ${message}`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });
    
    setTimeout(() => {
        toast.style.transform = 'translateY(10px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000); // Give 4 seconds before dismissing naturally
};

// Globally intercept all native browser alerts!
window.alert = function(message) {
    window.showToast(message);
};

console.log("App initializing...");
if (!isSupabaseConfigured) {
    showConfigWarning();
}

async function initAuth() {
    try {
        const sessionResponse = await supabase.auth.getSession();
        
        if (sessionResponse.error || !sessionResponse.data || !sessionResponse.data.session) {
            localStorage.removeItem('admin_session'); // Nuke legacy backdoor
            console.log("No active session or network error, redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        console.log("Supabase Session verified, initializing router...");
        
        // Multi-school check
        if (!localStorage.getItem('selected_school_id')) {
            window.location.href = 'select-school.html';
            return;
        }

        router.init();
        setupNavigation();
        setupNotifications();
        
        const sidebarSchoolDisplay = document.getElementById('sidebar-school-name');
        if (sidebarSchoolDisplay) sidebarSchoolDisplay.innerText = localStorage.getItem('selected_school_name') || 'Select School';
        
        const logoutBtn = document.getElementById('sidebar-logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                localStorage.removeItem('admin_session');
                localStorage.removeItem('selected_school_id');
                localStorage.removeItem('selected_school_name');
                try { await supabase.auth.signOut(); } catch(e) {}
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

async function setupNotifications() {
    const schoolId = localStorage.getItem('selected_school_id');
    if (!schoolId) return;

    const bellBtn = document.getElementById('notification-bell');
    const badge = document.getElementById('notification-badge');
    const dropdown = document.getElementById('notification-dropdown');
    const list = document.getElementById('notification-list');
    
    if (!bellBtn || !badge || !dropdown || !list) return;

    // Cache to prevent endless polling alerts
    let notifiedLowStock = new Set();

    // Toggle dropdown
    bellBtn.addEventListener('click', () => {
        const isHidden = dropdown.style.display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Fetch Low Stock
    async function fetchLowStock() {
        try {
            const [ {data: books}, {data: inventory} ] = await Promise.all([
                supabase.from('Stationery Details').select('*').eq('school_id', schoolId).lt('remaining_stock', 15),
                supabase.from('inventory_items').select('*').eq('school_id', schoolId).lt('stock_count', 15)
            ]);

            const alerts = [];
            if (books) {
                books.forEach(b => alerts.push({ id: b.id, name: `Class ${b.Class} - ${b['Book Name']}`, count: b.remaining_stock, type: 'book' }));
            }
            if (inventory) {
                inventory.forEach(i => alerts.push({ id: i.id, name: i.item_name, count: i.stock_count, type: 'item' }));
            }

            if (alerts.length > 0) {
                badge.style.display = 'flex';
                badge.innerText = alerts.length > 9 ? '9+' : alerts.length;
                
                // Trigger Smart Active Popups for unnotified unique states
                alerts.forEach(a => {
                    const uniqueSig = `${a.type}_${a.id}_${a.count}`;
                    if (!notifiedLowStock.has(uniqueSig)) {
                        notifiedLowStock.add(uniqueSig);
                        if (window.showToast) {
                            window.showToast(`Critically Low Stock: ${a.name} (Only ${a.count} left!)`, 'error');
                        }
                    }
                });

                list.innerHTML = alerts.map(a => `
                    <li style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; transition: 0.2s; cursor: pointer;" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='white'">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${a.name}</span>
                            <span style="font-size: 0.75rem; color: #EF4444; font-weight: 600;">Only ${a.count} left in stock!</span>
                        </div>
                        <i class="ph ${a.type === 'book' ? 'ph-books' : 'ph-package'}" style="color: var(--text-muted); font-size: 1.2rem;"></i>
                    </li>
                `).join('');
            } else {
                badge.style.display = 'none';
                list.innerHTML = `<li style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;"><i class="ph ph-check-circle" style="color: #10B981; font-size: 1.25rem; vertical-align: text-bottom; margin-right: 4px;"></i> You're all caught up!</li>`;
            }
        } catch (err) {
            console.error("Notification load failed:", err);
        }
    }

    // Initial Fetch
    await fetchLowStock();
    
    // Auto-refresh every 60 seconds
    setInterval(fetchLowStock, 60000);
}
