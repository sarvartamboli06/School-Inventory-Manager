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
                    <button id="export-csv-btn" class="btn btn-secondary" style="padding: 10px 16px; border-radius: var(--radius-md); font-weight: 600; display: flex; align-items: center; gap: 8px;" title="Export currently filtered invoices to Excel Pivot Table">
                        <i class="ph ph-file-xls"></i> Export Excel
                    </button>
                    <label style="font-size: 0.9rem; font-weight: 600;">Status Filter:</label>
                    <select id="status-filter" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none; background: white; font-weight: bold; color: var(--primary);">
                        <option value="ALL">All Invoices</option>
                        <option value="PAID">💵 PAID Only</option>
                        <option value="PENDING">⏳ UNPAID / PENDING</option>
                        <option value="RETURNED">🔄 RETURNED</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div class="card" style="flex: 1;">
                    <h3 style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 8px;">Total Processed Revenue</h3>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #10B981;" id="metric-paid">₹0.00</div>
                </div>
                <div class="card" style="flex: 1;">
                    <h3 style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 8px;">Pending Accounts Receivable</h3>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #F59E0B;" id="metric-pending">₹0.00</div>
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
                            <th>Remarks</th>
                            <th style="width: 150px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="invoices-tbody">
                        <tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Loading system invoices...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Container -->
            <div id="pagination-container" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; padding-bottom: 24px;"></div>

        </div>
    `;

    // Purge old modal to prevent duplicates when navigating router
    const oldModal = document.getElementById('view-modal');
    if (oldModal) oldModal.remove();

    // Inject beautifully centered Popup Modal at body level
    document.body.insertAdjacentHTML('beforeend', `
        <div id="view-modal" class="fade-in" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px;">
            
            <div class="card" style="width: 100%; max-width: 850px; max-height: 90vh; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; overflow: hidden; position: relative; padding: 0;">
                
                <!-- Fixed Header -->
                <div style="padding: 24px 32px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
                    <div>
                        <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-receipt" style="color: var(--primary);"></i> Invoice Details
                        </h2>
                        <div id="view-student-details" style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; display: flex; flex-direction: column; gap: 4px;"></div>
                    </div>
                    <button class="icon-btn" id="close-view-btn" style="border:none; background: #E2E8F0; color: var(--text-main); width: 40px; height: 40px; border-radius: 50%; font-size: 1.25rem; cursor:pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;"><i class="ph ph-x"></i></button>
                </div>

                <!-- Scrollable Body -->
                <div style="padding: 32px; overflow-y: auto; flex-grow: 1; background: white;">
                    <div style="display: grid; grid-template-columns: 60px 1fr 120px 120px; font-weight: 700; color: var(--text-muted); padding-bottom: 12px; border-bottom: 2px solid #E2E8F0; margin-bottom: 8px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                        <div>QTY</div>
                        <div>ITEM DESCRIPTION</div>
                        <div style="text-align: right;">AMOUNT</div>
                        <div style="text-align: right;">ACTION</div>
                    </div>

                    <ul id="view-items-list" style="list-style: none; padding: 0; margin: 0;">
                        <li style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i> Loading items...</li>
                    </ul>
                </div>

                <!-- Fixed Footer -->
                <div style="padding: 24px 32px; background: white; border-top: 2px dashed #CBD5E1; display: flex; flex-direction: column; flex-shrink: 0; border-radius: 0 0 16px 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
                        <div id="view-invoice-notes" style="font-size: 0.85rem; color: #64748B; max-width: 65%; white-space: pre-line; padding-right: 20px; text-align: left;"></div>
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 1.1rem; font-weight: 600; color: var(--text-muted); margin-right: 20px;">Grand Total</span>
                            <span style="font-size: 2.2rem; font-weight: 800; color: var(--primary);" id="view-total"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Purge old toasts and confirms to prevent duplicates when navigating router
    const oldToastMenu = document.getElementById('toast-container');
    if (oldToastMenu) oldToastMenu.remove();
    const oldConfirm = document.getElementById('confirm-modal');
    if (oldConfirm) oldConfirm.remove();

    // Inject App-level Toasts & Confirm Modals
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 12px; z-index: 10000;"></div>
        
        <div id="confirm-modal" class="fade-in" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 10000; backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px;">
            <div class="card" style="width: 100%; max-width: 400px; background: white; border-radius: 12px; box-shadow: var(--shadow-xl); padding: 24px; text-align: center;">
                <div id="confirm-icon" style="font-size: 3rem; color: #EF4444; margin-bottom: 16px;"><i class="ph ph-warning-circle"></i></div>
                <h3 id="confirm-title" style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Are you sure?</h3>
                <p id="confirm-msg" style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;"></p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="confirm-cancel-btn" class="btn btn-secondary" style="flex: 1; padding: 10px;">Cancel</button>
                    <button id="confirm-ok-btn" class="btn btn-primary" style="flex: 1; padding: 10px; background: #EF4444; border: none;">Proceed</button>
                </div>
            </div>
        </div>
    `);

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10B981' : '#EF4444';
        const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
        
        toast.style = `background: ${bgColor}; color: white; padding: 14px 20px; border-radius: 8px; box-shadow: var(--shadow-lg); font-weight: 500; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; transform: translateY(100%); opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`;
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
        }, 3000);
    }

    function showConfirm(title, message, btnText, btnColor, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerHTML = message;
        
        const okBtn = document.getElementById('confirm-ok-btn');
        okBtn.innerText = btnText;
        okBtn.style.background = btnColor;
        
        const handleConfirm = () => { cleanup(); onConfirm(); };
        const handleCancel = () => cleanup();
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleConfirm);
            document.getElementById('confirm-cancel-btn').removeEventListener('click', handleCancel);
        };
        
        okBtn.addEventListener('click', handleConfirm);
        document.getElementById('confirm-cancel-btn').addEventListener('click', handleCancel);
        
        modal.style.display = 'flex';
    }

    let allInvoices = [];
    let products = [];
    let productsLoaded = false;
    let currentPage = 1;
    const rowsPerPage = 20;

    const renderPaginationControls = (totalPages) => {
        const container = document.getElementById('pagination-container');
        if (!container) return;
        
        // Always render to show UI
        let html = '';
        const btnStyle = "display: flex; align-items: center; justify-content: center; font-weight: bold; border: none; background: transparent; color: var(--primary); cursor: pointer; transition: 0.2s;";
        
        html += `<button class="paginate-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? `disabled style="opacity: 0.5; cursor: not-allowed; ${btnStyle}"` : `style="${btnStyle}"`}><i class="ph ph-caret-left" style="margin-right: 4px;"></i> Prev</button>`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            html += `<button class="paginate-btn" data-page="1" style="width: 36px; height: 36px; border-radius: 50%; ${btnStyle}">1</button>`;
            if (startPage > 2) html += `<span style="color: var(--primary); font-weight: bold; padding: 0 4px;">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `<button style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 50%; background: #2DD4BF; color: white; border: none; pointer-events: none; box-shadow: 0 4px 6px -1px rgba(45,212,191,0.5);">${i}</button>`;
            } else {
                html += `<button class="paginate-btn" data-page="${i}" style="width: 36px; height: 36px; border-radius: 50%; ${btnStyle}">${i}</button>`;
            }
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="color: var(--primary); font-weight: bold; padding: 0 4px;">...</span>`;
            html += `<button class="paginate-btn" data-page="${totalPages}" style="width: 36px; height: 36px; border-radius: 50%; ${btnStyle}">${totalPages}</button>`;
        }

        html += `<button class="paginate-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? `disabled style="opacity: 0.5; cursor: not-allowed; ${btnStyle}"` : `style="${btnStyle}"`}>Next <i class="ph ph-caret-right" style="margin-left: 4px;"></i></button>`;

        container.innerHTML = `<div style="background: white; padding: 8px 20px; border-radius: 50px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 8px;">${html}</div>`;

        container.querySelectorAll('.paginate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.hasAttribute('disabled')) return;
                const newPage = parseInt(e.currentTarget.getAttribute('data-page'));
                if (newPage >= 1 && newPage <= totalPages) {
                    currentPage = newPage;
                    renderTable();
                }
            });
        });
    };

    const loadInvoices = async () => {
        const tbody = document.getElementById('invoices-tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>';

        const schoolId = localStorage.getItem('selected_school_id');

        let invoices, invErr;

        if (!productsLoaded) {
            let inventory, books;
            [ 
                { data: invoices, error: invErr },
                { data: inventory },
                { data: books }
            ] = await Promise.all([
                supabase.from('invoices').select('*, students(first_name, last_name, grade_section, school_name, parent_contact)').eq('school_id', schoolId).order('created_at', { ascending: false }),
                supabase.from('inventory_items').select('*').eq('school_id', schoolId),
                supabase.from('Stationery Details').select('*').eq('school_id', schoolId)
            ]);

            products = [];
            if (inventory) products.push(...inventory.map(i => ({ id: String(i.id), name: i.item_name || 'Unknown' })));
            if (books) products.push(...books.map(b => ({ id: String(b.id), name: b['Book Name'] || 'Unknown Book' })));
            productsLoaded = true;
        } else {
            const res = await supabase.from('invoices').select('*, students(first_name, last_name, grade_section, school_name, parent_contact)').eq('school_id', schoolId).order('created_at', { ascending: false });
            invoices = res.data;
            invErr = res.error;
        }

        if (invErr) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #EF4444;"><b>Error:</b> ${invErr.message}</td></tr>`;
            return;
        }

        allInvoices = invoices || [];
        allInvoices.forEach((inv, idx) => inv.seq_no = allInvoices.length - idx);
        renderTable();
    };

    const renderTable = () => {
        const tbody = document.getElementById('invoices-tbody');
        const filterStr = document.getElementById('status-filter').value;

        // Metric Math
        const totalPaid = allInvoices.filter(i => i.status === 'PAID').reduce((sum, item) => sum + Number(item.total_amount), 0);
        const totalPending = allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID').reduce((sum, item) => sum + Number(item.total_amount), 0);
        document.getElementById('metric-paid').innerText = '₹' + totalPaid.toFixed(2);
        document.getElementById('metric-pending').innerText = '₹' + totalPending.toFixed(2);

        const filtered = filterStr === 'ALL' ? allInvoices : 
                         (filterStr === 'PENDING' ? allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID') : 
                         (filterStr === 'RETURNED' ? allInvoices.filter(i => i.status === 'RETURNED' || (i.notes && i.notes.includes('Refund'))) :
                         allInvoices.filter(i => i.status === filterStr)));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No invoices found matching currently selected filter (${filterStr}).</td></tr>`;
            return;
        }

        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        tbody.innerHTML = paginated.map(inv => `
            <tr>
                <td style="font-family: monospace; font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${inv.seq_no}</td>
                <td>${new Date(inv.created_at).toLocaleDateString()} <span style="color:var(--text-muted); font-size:0.8rem;">${new Date(inv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                <td style="font-weight: 500;">
                    ${inv.students ? inv.students.first_name + ' ' + inv.students.last_name : 'Unknown Student'}<br>
                    <small style="color: var(--primary);">Class: ${inv.students ? inv.students.grade_section : 'N/A'}</small>
                </td>
                <td>
                    <span class="status-badge ${inv.status === 'PAID' ? 'status-success' : inv.status === 'RETURNED' ? 'status-error' : 'status-warning'}" ${inv.status === 'RETURNED' ? 'style="background: #FEE2E2; color: #EF4444;"' : ''}>
                        ${inv.status === 'PAID' ? '💵 PAID' : inv.status === 'RETURNED' ? '🔄 RETURNED' : '⏳ PENDING'}
                    </span>
                </td>
                <td style="font-weight: 700;">₹${Number(inv.total_amount).toFixed(2)}</td>
                <td>
                    ${inv.notes ? `<div style="font-size: 0.8rem; color: #EF4444; font-weight: bold; max-width: 200px; line-height: 1.3;">${String(inv.notes).replace(/\n/g, '<br>')}</div>` : '<span style="color:#CBD5E1;">-</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary view-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem;" title="View Items"><i class="ph ph-list-dashes"></i></button>
                        <button class="btn btn-secondary receipt-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem;" title="View Thermal Receipt"><i class="ph ph-receipt"></i></button>
                        ${(inv.status === 'PENDING' || inv.status === 'UNPAID') ? `<button class="btn btn-primary mark-paid-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem; background:#10B981; border:none;" title="Mark Paid & Deduct Stock"><i class="ph ph-check-circle"></i> Mark Paid</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // View Items Modal Logic
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                
                document.getElementById('view-modal').style.display = 'flex';
                const ul = document.getElementById('view-items-list');
                ul.innerHTML = '<li style="text-align:center; padding: 12px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin"></i> Retrieving receipt line items...</li>';
                
                const { data: lines } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
                if(lines) {
                    let htmlList = '';
                    for (const l of lines) {
                        // Hide stealth stock decrement trackers from the printed receipt
                        if (Number(l.subtotal) === 0 && Number(l.unit_price) === 0 && l.product_type === 'STATIONERY') {
                            continue;
                        }
                        
                        let productName = '';
                        // Try cache first
                        const product = products.find(p => p.id === String(l.product_id));
                        if (product && product.name) {
                            productName = product.name;
                        } else {
                            // On-demand fetch fallback!
                            try {
                                if (l.product_type === 'BOOK') {
                                    const { data: bData } = await supabase.from('Stationery Details').select('"Book Name"').eq('id', l.product_id).single();
                                    productName = bData ? bData['Book Name'] : `Unknown Book (ID: ${l.product_id})`;
                                } else {
                                    const { data: iData } = await supabase.from('inventory_items').select('item_name').eq('id', l.product_id).single();
                                    productName = iData ? iData.item_name : `Unknown Item (ID: ${l.product_id})`;
                                }
                            } catch (e) {
                                productName = `Unknown [ID:${String(l.product_id).substring(0,8)}]`;
                            }
                        }

                        // Add to html block
                        htmlList += `
                        <li style="display: grid; grid-template-columns: 80px 1fr 140px 100px; align-items: center; border-bottom: 1px solid #E2E8F0; padding: 20px 0; font-size: 1.1rem; transition: background 0.2s;">
                            <span style="font-weight: 800; color: var(--primary); font-size: 1.3rem;">${l.quantity}</span> 
                            <span style="font-weight: 600; color: var(--text-main);">${productName}</span>
                            <span style="font-weight: 800; color: var(--text-main); text-align: right;">₹${Number(l.subtotal).toFixed(2)}</span>
                            <div style="text-align: right;">
                                <button class="btn btn-ghost return-item-btn" data-line-id="${l.id}" data-inv-id="${id}" data-prod-type="${l.product_type}" data-prod-id="${l.product_id}" data-unit-price="${l.unit_price}" data-max-qty="${l.quantity}" data-prod-name="${productName.replace(/"/g, '&quot;')}" style="color: #EF4444; padding: 6px 12px; font-size: 0.85rem;"><i class="ph ph-arrow-u-up-left"></i> Return</button>
                            </div>
                        </li>
                        `;
                    }
                    ul.innerHTML = htmlList;

                    // Bind Return Buttons
                    document.querySelectorAll('.return-item-btn').forEach(rBtn => {
                        rBtn.addEventListener('click', (btnEvent) => {
                            const btn = btnEvent.currentTarget;
                            const maxQty = parseInt(btn.getAttribute('data-max-qty'));
                            if (maxQty <= 0) return;

                            const returnQty = maxQty; // Automatically take full quantity without prompting

                            showConfirm(
                                'Process Return', 
                                `Are you sure you want to return ALL <b>${returnQty}</b> of this item?<br><br>This will naturally update the current invoice, deduct the total, and smoothly generate a corresponding Return Record while restoring your inventory stock.`,
                                'Yes, Return Item',
                                '#EF4444',
                                async () => {
                                    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                                    btn.disabled = true;

                                    try {
                                const lineId = btn.getAttribute('data-line-id');
                                const invId = btn.getAttribute('data-inv-id');
                                const unitPrice = parseFloat(btn.getAttribute('data-unit-price'));
                                const prodType = btn.getAttribute('data-prod-type');
                                const prodId = btn.getAttribute('data-prod-id');
                                const prodName = btn.getAttribute('data-prod-name') || 'Unknown Item';

                                const deductAmount = unitPrice * returnQty;

                                // 1. Store remaining items to migrate to the new invoice (Handling Partial Returns correctly)
                                const { data: currentItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invId);
                                const remainingItems = (currentItems || []).map(item => {
                                    if (String(item.id) === String(lineId)) {
                                        const leftQty = item.quantity - returnQty;
                                        if (leftQty > 0) {
                                            return { ...item, quantity: leftQty, subtotal: leftQty * item.unit_price };
                                        }
                                        return null;
                                    }
                                    return item;
                                }).filter(Boolean);

                                const targetInv = allInvoices.find(i => i.id === invId);
                                let newlyCreatedId = null;

                                if (targetInv) {
                                    const newTotal = Number(targetInv.total_amount) - deductAmount;
                                    
                                    // 2. Erase the old invoice entirely (items first to respect foreign keys)
                                    await supabase.from('invoice_items').delete().eq('invoice_id', invId);
                                    await supabase.from('invoices').delete().eq('id', invId);

                                    // 3. Create the NEW Invoice exclusively for the REMAINING Purchase items natively asserting the 'RETURNED' status
                                    const { data: retInv, error: retErr } = await supabase.from('invoices').insert({
                                        student_id: targetInv.student_id,
                                        school_id: targetInv.school_id,
                                        total_amount: Math.max(0, newTotal),
                                        status: 'RETURNED'
                                    }).select('id').single();

                                    if (retInv) {
                                        newlyCreatedId = retInv.id;
                                        
                                        // Migrate remaining items to the new invoice
                                        if (remainingItems.length > 0) {
                                            const newItemsPayload = remainingItems.map(item => ({
                                                invoice_id: newlyCreatedId,
                                                product_type: item.product_type,
                                                product_id: item.product_id,
                                                quantity: item.quantity,
                                                unit_price: item.unit_price,
                                                subtotal: item.subtotal
                                            }));
                                            await supabase.from('invoice_items').insert(newItemsPayload);
                                        }
                                    }
                                }

                                // 4. Restore Physical Stock explicitly ONLY for the physically returned returnedQty!
                                if (targetInv && targetInv.status === 'PAID') {
                                    if (prodType === 'STATIONERY' || prodType === 'BOOK' || prodType === 'SET') {
                                        const { data: currentBk } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', prodId).single();
                                        if (currentBk) {
                                            await supabase.from('Stationery Details').update({ remaining_stock: (currentBk.remaining_stock ?? 0) + returnQty }).eq('id', prodId);
                                        }
                                    }
                                }

                                showToast("Item returned successfully! Invoice and Stock updated.", "success");
                                // Refresh outer table and close modal to force visual reset
                                document.getElementById('view-modal').style.display = 'none';
                                await loadInvoices();

                                // Auto-pop the newly generated return bill receipt!
                                if (newlyCreatedId) {
                                    setTimeout(() => {
                                        const receiptTargetBtn = document.querySelector(`.receipt-btn[data-id="${newlyCreatedId}"]`);
                                        if (receiptTargetBtn) receiptTargetBtn.click();
                                    }, 400); // UI delay for rendering
                                }

                            } catch (err) {
                                showToast("Error processing return: " + err.message, "error");
                                btn.innerHTML = '<i class="ph ph-arrow-u-up-left"></i> Return';
                                btn.disabled = false;
                            }
                        });
                        });
                    });
                } else {
                    ul.innerHTML = '<li style="text-align:center; padding: 12px; color: #EF4444;">Failed to load items.</li>';
                }

                const invData = allInvoices.find(i => i.id === id);
                if (invData) {
                    const stu = invData.students;
                    if (stu) {
                        document.getElementById('view-student-details').innerHTML = `
                            <span style="font-weight: 800; color: var(--text-main); font-size: 1.3rem; margin-bottom: 4px; display: block;">${stu.first_name || ''} ${stu.last_name || ''}</span>
                            <span style="display: flex; align-items: center; gap: 8px;"><i class="ph ph-buildings"></i> ${stu.school_name || 'N/A'}</span>
                            <span style="display: flex; align-items: center; gap: 8px;"><i class="ph ph-graduation-cap"></i> Class ${stu.grade_section || 'N/A'}</span>
                        `;
                    } else {
                        document.getElementById('view-student-details').innerText = 'Student Details Unavailable';
                    }
                    document.getElementById('view-total').innerText = '₹' + Number(invData.total_amount).toFixed(2);
                    
                    const notesEl = document.getElementById('view-invoice-notes');
                    if (invData.notes) {
                        notesEl.innerHTML = '<b style="color:var(--text-main);">Return Tracking / Audit Log:</b><br>' + String(invData.notes).replace(/\n/g, '<br>');
                    } else {
                        notesEl.innerHTML = '';
                    }
                }
            });
        });

        // View Thermal Receipt Logic
        document.querySelectorAll('.receipt-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const btnIcon = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                
                try {
                    const inv = allInvoices.find(i => i.id === id);
                    const { data: lines } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
                    
                    import('../utils/receipt.js?v=printable_v3').then(m => {
                        m.showReceiptModal({
                            id: inv.id,
                            student_id: inv.student_id,
                            student_name: inv.students ? inv.students.first_name + ' ' + inv.students.last_name : 'Unknown',
                            grade_section: inv.students ? inv.students.grade_section : 'Unknown',
                            parent_contact: inv.students ? inv.students.parent_contact : null,
                            total_amount: inv.total_amount,
                            status: inv.status,
                            created_at: inv.created_at,
                            seq_no: inv.seq_no,
                            notes: inv.notes,
                            items: (lines || []).map(l => {
                                let prodName = 'Unknown Item';
                                const b = products.find(p => p.id === String(l.product_id));
                                if(b && b.name) prodName = b.name;
                                return { name: prodName, qty: l.quantity, price: l.unit_price };
                            })
                        });
                    });
                } catch(err) {
                    showToast('Failed to load receipt: ' + err.message, 'error');
                }
                e.currentTarget.innerHTML = btnIcon;
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
                    const { error } = await supabase.from('invoices').update({ status: 'PAID' }).eq('id', id);
                    if(error) {
                        alert("Failed to mark as paid: " + error.message);
                        btn.innerHTML = '<i class="ph ph-check-circle"></i> Paid'; // Revert to original icon or a default
                        btn.disabled = false;
                        return;
                    } else {
                        // Dynamically deduct explicitly tracked physical stock exactly right now
                        const { data: invLines } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
                        if (invLines) {
                            const stockPromises = invLines.filter(item => ['STATIONERY','BOOK','SET'].includes(item.product_type)).map(async (item) => {
                                const { data: sd } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', item.product_id).single();
                                if (sd) {
                                    const newStock = Math.max(0, (sd.remaining_stock ?? 0) - item.quantity);
                                    await supabase.from('Stationery Details').update({ remaining_stock: newStock }).eq('id', item.product_id);
                                }
                            });
                            await Promise.all(stockPromises);
                        }
                    }                    
                    // Success! Refresh UI cleanly
                    await loadInvoices(); 
                    showToast('Invoice physically marked as PAID!', 'success');
                    
                    // Automatically pop the Receipt!
                    const targetBtn = document.querySelector(`.receipt-btn[data-id="${id}"]`);
                    if(targetBtn) targetBtn.click();
                    
                } catch (err) {
                    showToast('System Error updating Invoice: ' + err.message, 'error');
                    e.currentTarget.innerHTML = '<i class="ph ph-check-circle"></i> Paid';
                    e.currentTarget.disabled = false;
                }
            });
        });

        renderPaginationControls(totalPages);
    };

    document.getElementById('status-filter').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('close-view-btn').addEventListener('click', () => document.getElementById('view-modal').style.display = 'none');

    document.getElementById('export-csv-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating...';
        btn.disabled = true;

        try {
            const filterStr = document.getElementById('status-filter').value;
            const filtered = filterStr === 'ALL' ? allInvoices : 
                             (filterStr === 'PENDING' ? allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID') : 
                             (filterStr === 'RETURNED' ? allInvoices.filter(i => i.status === 'RETURNED' || (i.notes && i.notes.includes('Refund'))) :
                             allInvoices.filter(i => i.status === filterStr)));

            if (filtered.length === 0) {
                showToast("No invoices to export based on current filter.", "error");
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }

            // Fetch items in chunks to avoid URL length errors for IN clauses
            const invoiceIds = filtered.map(i => i.id);
            const itemsChunks = [];
            for (let i = 0; i < invoiceIds.length; i += 50) {
                const chunk = invoiceIds.slice(i, i + 50);
                const { data } = await supabase.from('invoice_items').select('*').in('invoice_id', chunk);
                if (data) itemsChunks.push(...data);
            }

            const eSchoolId = localStorage.getItem('selected_school_id');
            const [ { data: eInv }, { data: eBks } ] = await Promise.all([
                supabase.from('inventory_items').select('id, item_name').eq('school_id', eSchoolId),
                supabase.from('Stationery Details').select('id, "Book Name"').eq('school_id', eSchoolId).order('id')
            ]);
            
            const liveMap = {};
            const masterOrderMap = {};
            let orderCounter = 0;

            // Preserve DB rendering order (Books first, then Stationery) to make the Excel sheet cleanly organized
            if (eBks) {
                eBks.forEach(b => {
                    let bname = b['Book Name'] ? b['Book Name'].trim() : 'Unknown';
                    liveMap[String(b.id)] = bname;
                    if (masterOrderMap[bname] === undefined) masterOrderMap[bname] = orderCounter++;
                });
            }

            if (eInv) {
                eInv.forEach(i => {
                    let iname = i.item_name ? i.item_name.trim() : 'Unknown';
                    liveMap[String(i.id)] = iname;
                    if (masterOrderMap[iname] === undefined) masterOrderMap[iname] = orderCounter++;
                });
            }

            console.log("[EXCEL DEBUG] Total Invoices to Export:", filtered.length);
            console.log("[EXCEL DEBUG] Total invoice_items fetched globally:", itemsChunks.length);

            if (itemsChunks.length === 0) {
                throw new Error("CRITICAL ALIGNMENT HALT: 0 global invoice_items were fetched from the database!");
            }

            const wb = XLSX.utils.book_new();

            // Extract distinct target classes
            const allPossibleClasses = filtered.map(inv => {
                let c = inv.students ? (inv.students.grade_section || '') : '';
                return c.trim().toUpperCase() || 'UNKNOWN CLASS';
            });
            const distinctClasses = [...new Set(allPossibleClasses)].sort();

            for (const grade of distinctClasses) {
                const classInvoices = filtered.filter(inv => {
                    let c = inv.students ? (inv.students.grade_section || '') : '';
                    return (c.trim().toUpperCase() || 'UNKNOWN CLASS') === grade;
                });

                if (classInvoices.length === 0) continue;

                // 1. Sweep all unique items purchased specifically by students inside this Class
                const classSpecificItemSet = new Set();
                classInvoices.forEach(inv => {
                    const invItems = itemsChunks.filter(li => String(li.invoice_id).toLowerCase() === String(inv.id).toLowerCase());
                    invItems.forEach(l => {
                        let productName = liveMap[String(l.product_id)] || 'Unknown Item';
                        classSpecificItemSet.add(productName.trim());
                    });
                });

                // 2. Sort columns matching the DB master order logic
                const classHeadersVector = Array.from(classSpecificItemSet).sort((a, b) => {
                    const idxA = masterOrderMap[a] !== undefined ? masterOrderMap[a] : 999999;
                    const idxB = masterOrderMap[b] !== undefined ? masterOrderMap[b] : 999999;
                    if (idxA === idxB) return a.localeCompare(b);
                    return idxA - idxB;
                });

                const headerRow = ["Sr No", "Name Of Student", "Class", ...classHeadersVector, "Total"];
                const wsData = [headerRow];

                // 3. Build Class Rows
                classInvoices.forEach((inv, index) => {
                    const studentName = inv.students ? `${inv.students.first_name || ''} ${inv.students.last_name || ''}`.trim() : 'Unknown';
                    const row = [index + 1, studentName.toUpperCase(), grade];
                    
                    const invItems = itemsChunks.filter(li => String(li.invoice_id).toLowerCase() === String(inv.id).toLowerCase());
                    const itemMap = {};
                    invItems.forEach(l => {
                        let productName = liveMap[String(l.product_id)] || 'Unknown Item';
                        // Output the explicitly requested PRICE (Subtotal) of the mapped item
                        itemMap[productName.trim()] = (itemMap[productName.trim()] || 0) + Number(l.unit_price * l.quantity);
                    });

                    // Target the exact narrowed columns explicitly aligned
                    classHeadersVector.forEach(eh => {
                        let val = itemMap[eh];
                        // If the item was not purchased, output an empty cell instead of a glaring '0'
                        row.push(typeof val === 'number' ? val : "");
                    });

                    row.push(Number(inv.total_amount));
                    wsData.push(row);
                });

                // 4. Render native Worksheet object for this Class grouping
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                ws["!freeze"] = { xSplit: 0, ySplit: 1 };
                
                const colWidths = headerRow.map(h => ({ wch: Math.max(15, h.length + 2) }));
                colWidths[0] = { wch: 8 };   // Sr No 
                colWidths[1] = { wch: 30 };  // Student Name
                colWidths[2] = { wch: 15 };  // Class
                ws["!cols"] = colWidths;

                // Visually style headers seamlessly
                for (let c = 0; c < headerRow.length; c++) {
                    const cellRef = XLSX.utils.encode_cell({c: c, r: 0});
                    if (ws[cellRef]) {
                        ws[cellRef].s = {
                            font: { bold: true },
                            fill: { fgColor: { rgb: "FFEFEFEF" } },
                            alignment: { horizontal: "center", vertical: "center", wrapText: true }
                        };
                    }
                }
                
                for (let r = 1; r < wsData.length; r++) {
                    const srRef = XLSX.utils.encode_cell({c: 0, r: r});
                    if(ws[srRef]) ws[srRef].s = { alignment: { horizontal: "center" } };
                    const classRef = XLSX.utils.encode_cell({c: 2, r: r});
                    if(ws[classRef]) ws[classRef].s = { alignment: { horizontal: "center" } };
                }

                // Append perfectly encoded Tab name
                let safeSheetName = String(grade).replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
                if (!safeSheetName || safeSheetName.trim() === '') safeSheetName = "ClassData";
                XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            }

            const dtStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Student_Invoices_${dtStr}.xlsx`);

            showToast("Excel Pivot Table Exported Successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Error generating Excel Output: " + err.message, "error");
        }

        btn.innerHTML = originalHtml;
        btn.disabled = false;
    });

    await loadInvoices();
}
