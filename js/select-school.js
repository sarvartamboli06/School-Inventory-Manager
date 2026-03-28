import { supabase } from './supabase.js';

// Global Notification Engine initialized at Boot
if (!document.getElementById('toast-container')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; pointer-events: none;"></div>
    `);
}

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth (Allow Admin bypass)
    const isAdmin = localStorage.getItem('admin_session') === 'true';
    if (!isAdmin) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
    }

    const schoolsList = document.getElementById('schools-list');
    const modal = document.getElementById('add-modal');
    let allSchools = [];

    // Load Schools
    async function fetchSchools() {
        schoolsList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i><br>Loading schools...</div>`;
        try {
            const { data: schools, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
            
            if (error) throw error;
            
            allSchools = schools || [];
            renderSchoolsList(allSchools);

        } catch (err) {
            schoolsList.innerHTML = `<div style="text-align:center; padding: 40px; color: #EF4444;">Error loading schools: ${err.message}</div>`;
        }
    }

    function renderSchoolsList(schoolsArray) {
        if (!schoolsArray || schoolsArray.length === 0) {
            schoolsList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); background: #F8FAFC; border-radius: var(--radius-md);">No schools found matching your search.</div>`;
            return;
        }

        schoolsList.innerHTML = schoolsArray.map(s => `
            <div class="school-card" data-id="${s.id}" data-name="${s.school_name}">
                <div style="display: flex; align-items: center;">
                    <div class="school-card-icon">
                        ${s.school_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${s.school_name}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">${s.address || 'Address not provided'}</p>
                    </div>
                </div>
                <i class="ph ph-arrow-right" style="font-size: 1.5rem; color: var(--border);"></i>
            </div>
        `).join('');

        // Bind selection
        document.querySelectorAll('.school-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const name = card.getAttribute('data-name');
                localStorage.setItem('selected_school_id', id);
                localStorage.setItem('selected_school_name', name);
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            });
        });
    }

    // Search Filtering
    const searchInput = document.getElementById('school-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderSchoolsList(allSchools);
                return;
            }
            const filtered = allSchools.filter(s => 
                s.school_name.toLowerCase().includes(query) || 
                (s.address && s.address.toLowerCase().includes(query))
            );
            renderSchoolsList(filtered);
        });
    }

    await fetchSchools();

    // Add School Logic
    document.getElementById('open-add-modal').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.style.display = 'none'; document.getElementById('add-school-form').reset(); });

    document.getElementById('add-school-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        const payload = {
            school_name: document.getElementById('add-name').value,
            address: document.getElementById('add-address').value,
            contact_number: document.getElementById('add-contact').value
        };

        const { error } = await supabase.from('schools').insert([payload]);
        if (error) {
            alert('Error saving school: ' + error.message);
        } else {
            modal.style.display = 'none';
            document.getElementById('add-school-form').reset();
            await fetchSchools();
        }
        btn.innerHTML = 'Save School';
        btn.disabled = false;
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('selected_school_id');
        localStorage.removeItem('selected_school_name');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
});
