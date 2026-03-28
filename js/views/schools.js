import { supabase } from '../supabase.js';

export async function renderSchools(container) {
    container.innerHTML = `
        <div>
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Registered Schools</h1>
                    <p style="color: var(--text-muted);">Select a school below to continue, or add a new one.</p>
                </div>
                <button class="btn btn-primary" id="add-school-btn"><i class="ph ph-buildings"></i> Add New School</button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>School Name</th>
                            <th>Address</th>
                            <th>Contact</th>
                            <th style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="schools-tbody">
                        <tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading schools...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal for Adding School -->
            <div id="add-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 500px; padding: 32px; box-shadow: var(--shadow-lg);">
                    <h2 style="margin-bottom: 24px;">Register New School</h2>
                    <form id="add-school-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">School Name</label>
                            <input type="text" id="add-name" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Address</label>
                            <input type="text" id="add-address" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Contact Number</label>
                            <input type="text" id="add-contact" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                            <button type="button" class="btn btn-ghost" id="close-modal-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-btn">Save School</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    await loadSchools();

    const modal = document.getElementById('add-modal');
    document.getElementById('add-school-btn').addEventListener('click', () => modal.style.display = 'flex');
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
            await loadSchools();
        }
        btn.innerHTML = 'Save School';
        btn.disabled = false;
    });
}

async function loadSchools() {
    const tbody = document.getElementById('schools-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>`;

    // Wrapped in try catch gracefully incase of networking disruption
    try {
        const { data: schools, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #EF4444;"><b>Database Error:</b> ${error.message}<br><small>Did you run supabase_schema_v2.sql?</small></td></tr>`;
            return;
        }

        if (!schools || schools.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 48px; color: var(--text-muted);">No schools registered yet. Please add your first school!</td></tr>`;
            return;
        }

        tbody.innerHTML = schools.map(s => `
            <tr>
                <td style="font-weight: 600;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #EEF2FF; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${s.school_name.charAt(0).toUpperCase()}
                        </div>
                        ${s.school_name}
                    </div>
                </td>
                <td style="color: var(--text-muted);">${s.address || 'N/A'}</td>
                <td>${s.contact_number || 'N/A'}</td>
                <td style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm select-school-btn" data-id="${s.id}" data-name="${s.school_name}" style="padding: 4px 12px; font-size: 0.85rem;">Select</button>
                    <button class="icon-btn delete-school-btn" data-id="${s.id}" style="width: 32px; height: 32px; color: #EF4444; border: none; background: transparent;" title="Delete School"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-school-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Are you sure you want to completely delete this school AND all associated students?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                    const { error } = await supabase.from('schools').delete().eq('id', id);
                    if (error) alert('Error: ' + error.message);
                    await loadSchools();
                }
            });
        });

        document.querySelectorAll('.select-school-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const name = e.currentTarget.getAttribute('data-name');
                localStorage.setItem('selected_school_id', id);
                localStorage.setItem('selected_school_name', name);
                
                // Force a full location replace to dashboard hash
                window.location.hash = '#/';
                // Trigger an explicit hashchange event for immediate UI update just in case
                window.dispatchEvent(new HashChangeEvent("hashchange"));
            });
        });
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #EF4444;"><b>Database Crash:</b> Could not find schools table. Please run the SQL file!</td></tr>`;
    }
}
