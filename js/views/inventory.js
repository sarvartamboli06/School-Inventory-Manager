import { supabase } from '../supabase.js';

export async function renderInventory(container) {
    container.innerHTML = `
        <div class="fade-in" style="position: relative;">
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Book Sets Inventory</h1>
                    <p style="color: var(--text-muted);">Track total physical book sets available per class.</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary" id="add-set-btn"><i class="ph ph-stack"></i> Add Class Set Stock</button>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Total Sets Originally Stocked</th>
                            <th>Remaining Sets Available</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-tbody">
                        <tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading sets...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal for Adding Set -->
            <div id="add-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 400px; padding: 32px; box-shadow: var(--shadow-lg);">
                    <h2 style="margin-bottom: 24px;">Register Class Sets</h2>
                    <form id="add-set-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Class Name (Exact Match)</label>
                            <input type="text" id="add-class" placeholder="e.g. NURSERY or 9th" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Total Units Stocked</label>
                            <input type="number" id="add-total" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                            <button type="button" class="btn btn-ghost" id="close-modal-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-set-btn">Save Stock</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    await loadInventory();

    const modal = document.getElementById('add-modal');
    document.getElementById('add-set-btn').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.style.display = 'none'; document.getElementById('add-set-form').reset();});

    document.getElementById('add-set-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-set-btn');
        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        const total = parseInt(document.getElementById('add-total').value, 10);
        
        // We inject dummy values for category, price so it doesn't break schema
        const payload = {
            item_name: document.getElementById('add-class').value.toUpperCase(),
            category: 'Class Book Set',
            price: 0,
            stock_count: total,
            total_stock: total // Requires SQL patch to add this column!
        };

        const { error } = await supabase.from('inventory_items').insert([payload]);
        if (error) {
            alert('Error saving set stock: ' + error.message);
        } else {
            modal.style.display = 'none';
            document.getElementById('add-set-form').reset();
            await loadInventory();
        }
        btn.innerHTML = 'Save Stock';
        btn.disabled = false;
    });
}

async function loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading sets...</td></tr>';

    const { data: items, error } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false });

    if (error) {
        // If SQL patch hasn't been run, it will fail fetching total_stock if we strictly map it. Actually supabase pulls all existing columns safely. 
        // Wait, if total_stock doesn't exist, it just returns undefined. No crash.
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: #EF4444;"><b>Error connecting:</b> ' + error.message + '</td></tr>';
        return;
    }

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">No Book Sets found. Click Add Stock!</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td style="font-weight: 700; color: var(--primary); font-size: 1.1rem;"><i class="ph ph-books"></i> ${item.item_name}</td>
            <td style="font-weight: 600;">${item.total_stock || '-'} Sets Configured</td>
            <td>
                <span class="status-badge ${item.stock_count > 10 ? 'status-success' : (item.stock_count > 0 ? 'status-warning' : 'status-danger')}">
                    ${item.stock_count} Sets Remaining
                </span>
            </td>
            <td>
                <button class="icon-btn delete-btn" data-id="${item.id}" style="width: 32px; height: 32px; color: #EF4444;" title="Delete"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            const { error } = await supabase.from('inventory_items').delete().eq('id', id);
            if (error) {
                alert('Error: ' + error.message);
                e.currentTarget.innerHTML = '<i class="ph ph-trash"></i>';
            }
            await loadInventory();
        });
    });
}
