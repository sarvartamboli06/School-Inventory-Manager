import { supabase } from '../supabase.js';

export async function renderInvoices(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Invoices & Payments</h1>
                    <p style="color: var(--text-muted);">Track generated bills, manage unpaid entries, and filter transaction statuses.</p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <label style="font-size: 0.9rem; font-weight: 600;">Status Filter:</label>
                    <select id="status-filter" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none; background: white; font-weight: bold; color: var(--primary);">
                        <option value="ALL">All Invoices</option>
                        <option value="PAID">💵 PAID Only</option>
                        <option value="PENDING">⏳ UNPAID / PENDING</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div class="card" style="flex: 1;">
                    <h3 style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 8px;">Total Processed Revenue</h3>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #10B981;" id="metric-paid">$0.00</div>
                </div>
                <div class="card" style="flex: 1;">
                    <h3 style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 8px;">Pending Accounts Receivable</h3>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #F59E0B;" id="metric-pending">$0.00</div>
                </div>
            </div>

            <div class="table-container">
                <table style="min-width: 900px;">
                    <thead>
                        <tr>
                            <th>Inv. No</th>
                            <th>Date Generated</th>
                            <th>Student Ref</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th style="width: 150px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="invoices-tbody">
                        <tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">Loading system invoices...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal for Viewing Details (Optional feature framework) -->
            <div id="view-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 500px; padding: 32px; box-shadow: var(--shadow-lg);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <h2 style="margin-bottom: 4px;">Invoice #<span id="view-inv-id"></span></h2>
                        <button class="icon-btn" id="close-view-btn" style="border:none; background:transparent; font-size:1.5rem;"><i class="ph ph-x"></i></button>
                    </div>
                    <ul id="view-items-list" style="list-style: none; padding: 0; margin-bottom: 24px;">
                        <li style="text-align:center; padding: 12px; color: var(--text-muted);">Loading items...</li>
                    </ul>
                    <div style="display: flex; justify-content: flex-end; align-items: center; border-top: 1px dashed var(--border); padding-top: 16px;">
                        <span style="font-size: 1.2rem; font-weight: 700; color: var(--primary);" id="view-total"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    let allInvoices = [];

    const loadInvoices = async () => {
        const tbody = document.getElementById('invoices-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>';

        const { data: invoices, error } = await supabase.from('invoices').select('*, students(first_name, last_name, grade_section)').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #EF4444;"><b>Error:</b> ${error.message}</td></tr>`;
            return;
        }

        allInvoices = invoices || [];
        renderTable();
    };

    const renderTable = () => {
        const tbody = document.getElementById('invoices-tbody');
        const filterStr = document.getElementById('status-filter').value;

        // Metric Math
        const totalPaid = allInvoices.filter(i => i.status === 'PAID').reduce((sum, item) => sum + Number(item.total_amount), 0);
        const totalPending = allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID').reduce((sum, item) => sum + Number(item.total_amount), 0);
        document.getElementById('metric-paid').innerText = '$' + totalPaid.toFixed(2);
        document.getElementById('metric-pending').innerText = '$' + totalPending.toFixed(2);

        const filtered = filterStr === 'ALL' ? allInvoices : 
                         (filterStr === 'PENDING' ? allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID') : 
                         allInvoices.filter(i => i.status === filterStr));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">No invoices found matching currently selected filter (${filterStr}).</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(inv => `
            <tr>
                <td style="font-family: monospace; color: var(--text-muted); font-size: 0.9rem;">${inv.id.split('-')[0].toUpperCase()}</td>
                <td>${new Date(inv.created_at).toLocaleDateString()} <span style="color:var(--text-muted); font-size:0.8rem;">${new Date(inv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                <td style="font-weight: 500;">
                    ${inv.students ? inv.students.first_name + ' ' + inv.students.last_name : 'Unknown Student'}<br>
                    <small style="color: var(--primary);">Class: ${inv.students ? inv.students.grade_section : 'N/A'}</small>
                </td>
                <td>
                    <span class="status-badge ${inv.status === 'PAID' ? 'status-success' : 'status-warning'}">
                        ${inv.status === 'PAID' ? '💵 PAID' : '⏳ PENDING'}
                    </span>
                </td>
                <td style="font-weight: 700;">$${Number(inv.total_amount).toFixed(2)}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary view-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem;"><i class="ph ph-eye"></i></button>
                        ${(inv.status === 'PENDING' || inv.status === 'UNPAID') ? `<button class="btn btn-primary mark-paid-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem; background:#10B981; border:none;" title="Mark Paid & Deduct Stock"><i class="ph ph-check-circle"></i> Paid</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // View Items Modal Logic
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                document.getElementById('view-inv-id').innerText = id.split('-')[0].toUpperCase();
                document.getElementById('view-modal').style.display = 'flex';
                const ul = document.getElementById('view-items-list');
                ul.innerHTML = '<li style="text-align:center; padding: 12px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin"></i> Retrieving receipt line items...</li>';
                
                const { data: lines } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
                if(lines) {
                    ul.innerHTML = lines.map(l => `
                        <li style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 8px 0; font-size: 0.95rem;">
                            <span>${l.quantity}x <span style="color: var(--text-muted);">[ID:${String(l.product_id).substring(0,6)}]</span></span>
                            <span style="font-weight: 500;">$${Number(l.subtotal).toFixed(2)}</span>
                        </li>
                    `).join('');
                }
                const invData = allInvoices.find(i => i.id === id);
                document.getElementById('view-total').innerText = 'Total: $' + Number(invData.total_amount).toFixed(2);
            });
        });

        // Mark as Paid Logic
        document.querySelectorAll('.mark-paid-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                e.currentTarget.disabled = true;

                try {
                    // 1. Mark Invoice as PAID
                    const { error: invErr } = await supabase.from('invoices').update({ status: 'PAID' }).eq('id', id);
                    if (invErr) throw invErr;

                    // 2. Identify the target student's class to reliably deduct the correct Inventory Set
                    const targetInv = allInvoices.find(i => i.id === id);
                    if (targetInv && targetInv.students) {
                        const grade = String(targetInv.students.grade_section).trim().toUpperCase();
                        
                        // 3. Find physical stock tracker
                        const { data: inventoryItems } = await supabase.from('inventory_items').select('*');
                        if (inventoryItems) {
                            // Match flexibly: if class is 'UKG', matches 'UKG' or 'UKG Book Set'
                            const tracker = inventoryItems.find(i => 
                                String(i.item_name).trim().toUpperCase() === grade || 
                                String(i.item_name).toUpperCase().includes(grade + ' ')
                            );
                            
                            if (tracker) {
                                // 4. Force frontend stock decrement!
                                await supabase.from('inventory_items')
                                    .update({ stock_count: tracker.stock_count - 1 })
                                    .eq('id', tracker.id);
                            }
                        }
                    }
                    
                    // Success! Refresh UI cleanly
                    await loadInvoices(); 
                    
                } catch (err) {
                    alert('System Error updating Invoice: ' + err.message);
                    e.currentTarget.innerHTML = '<i class="ph ph-check-circle"></i> Paid';
                    e.currentTarget.disabled = false;
                }
            });
        });
    };

    document.getElementById('status-filter').addEventListener('change', renderTable);
    document.getElementById('close-view-btn').addEventListener('click', () => document.getElementById('view-modal').style.display = 'none');

    await loadInvoices();
}
