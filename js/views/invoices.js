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
                    <div style="position: relative;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 10px; top: 12px; color: var(--text-muted);"></i>
                        <input type="text" id="invoice-search" placeholder="Search by Inv No or Name..." style="padding: 10px 10px 10px 32px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none; width: 260px; font-weight: 500;">
                    </div>
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
                            <th>Payment Mode</th>
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
            let inventory, books, invErrGlobal, bookErrGlobal;
            [ 
                { data: invoices, error: invErr },
                { data: inventory, error: invErrGlobal },
                { data: books, error: bookErrGlobal }
            ] = await Promise.all([
                supabase.from('invoices').select('*, students(first_name, last_name, grade_section, school_name, parent_contact)').eq('school_id', schoolId).order('created_at', { ascending: false }),
                supabase.from('inventory_items').select('*').eq('school_id', schoolId),
                supabase.from('Stationery Details').select('*').eq('school_id', schoolId)
            ]);

            products = [];
            if (!invErrGlobal && inventory) products.push(...inventory.map(i => ({ id: String(i.id), name: i.item_name || 'Unknown' })));
            if (!bookErrGlobal && books) products.push(...books.map(b => ({ id: String(b.id), name: b['Book Name'] || 'Unknown Book' })));
            if (!invErrGlobal && !bookErrGlobal) productsLoaded = true;
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
        const totalPaid = allInvoices.filter(i => i.status && (i.status.startsWith('PAID') || i.status.startsWith('UPDATED'))).reduce((sum, item) => sum + Number(item.total_amount), 0);
        const totalPending = allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID').reduce((sum, item) => sum + Number(item.total_amount), 0);
        document.getElementById('metric-paid').innerText = '₹' + totalPaid.toFixed(2);
        document.getElementById('metric-pending').innerText = '₹' + totalPending.toFixed(2);

        let filtered = filterStr === 'ALL' ? allInvoices : 
                         (filterStr === 'PENDING' ? allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID') : 
                         (filterStr === 'RETURNED' ? allInvoices.filter(i => (i.status && i.status.startsWith('RETURNED')) || (i.notes && i.notes.includes('Refund'))) :
                         (filterStr === 'PAID' ? allInvoices.filter(i => i.status && i.status.startsWith('PAID')) :
                         allInvoices.filter(i => i.status && i.status.startsWith(filterStr)))));

        const searchStr = (document.getElementById('invoice-search')?.value || '').toLowerCase().trim();
        if (searchStr) {
            filtered = filtered.filter(i => {
                const sName = (i.students ? i.students.first_name + ' ' + i.students.last_name : '').toLowerCase();
                const invNo = String(i.seq_no).toLowerCase();
                return sName.includes(searchStr) || invNo.includes(searchStr);
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No invoices found matching currently selected filter (${filterStr}).</td></tr>`;
            return;
        }

        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        tbody.innerHTML = paginated.map(inv => {
            const rawStatus = inv.status || 'PENDING';
            let logicalStatus = rawStatus;
            let pMode = 'N/A';

            if (rawStatus.includes('_')) {
                const parts = rawStatus.split('_');
                logicalStatus = parts[0];
                pMode = parts[1].toUpperCase();
            } else if (rawStatus === 'PAID') {
                pMode = 'UNKNOWN';
            }

            let statusBadge = '';
            if (logicalStatus === 'PAID') statusBadge = '<span class="status-badge status-success">💵 PAID</span>';
            else if (logicalStatus === 'RETURNED') statusBadge = '<span class="status-badge status-error" style="background:#FEE2E2; color:#EF4444;">🔄 RETURNED</span>';
            else if (logicalStatus === 'UPDATED') statusBadge = '<span class="status-badge status-warning" style="background:#FEF3C7; color:#D97706;">📝 UPDATED</span>';
            else statusBadge = `<span class="status-badge status-warning">⏳ ${logicalStatus}</span>`;

            const pmText = pMode === 'CASH' ? '<span style="font-weight:700; color:#10B981;">CASH</span>' : 
                           pMode === 'ONLINE' ? '<span style="font-weight:700; color:#3B82F6;">ONLINE</span>' : 
                           `<span style="color:var(--text-muted); font-weight: 500;">${pMode}</span>`;

            return `
            <tr>
                <td style="font-family: monospace; font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${inv.seq_no}</td>
                <td>${new Date(inv.created_at).toLocaleDateString()} <span style="color:var(--text-muted); font-size:0.8rem;">${new Date(inv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                <td style="font-weight: 500;">
                    ${inv.students ? inv.students.first_name + ' ' + inv.students.last_name : 'Unknown Student'}<br>
                    <small style="color: var(--primary);">Class: ${inv.students ? inv.students.grade_section : 'N/A'}</small>
                </td>
                <td>${statusBadge}</td>
                <td>${pmText}</td>
                <td style="font-weight: 700;">₹${Number(inv.total_amount).toFixed(2)}</td>
                <td>
                    ${inv.notes ? `<div style="font-size: 0.8rem; color: #EF4444; font-weight: bold; max-width: 200px; line-height: 1.3;">${String(inv.notes).replace(/\\n/g, '<br>')}</div>` : '<span style="color:#CBD5E1;">-</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary view-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem;" title="View Items"><i class="ph ph-list-dashes"></i></button>
                        <button class="btn btn-secondary receipt-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem;" title="View Thermal Receipt"><i class="ph ph-receipt"></i></button>
                        ${(logicalStatus === 'PENDING' || logicalStatus === 'UNPAID') ? `<button class="btn btn-primary mark-paid-btn" data-id="${inv.id}" style="padding: 6px 10px; font-size: 0.85rem; background:#10B981; border:none;" title="Mark Paid & Deduct Stock"><i class="ph ph-check-circle"></i> Mark Paid</button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');

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
                        <li style="display: grid; grid-template-columns: 80px 1fr 120px 160px; align-items: center; border-bottom: 1px solid #E2E8F0; padding: 20px 0; font-size: 1.1rem; transition: background 0.2s;">
                            <span style="font-weight: 800; color: var(--primary); font-size: 1.3rem;">${l.quantity}</span> 
                            <span style="font-weight: 600; color: var(--text-main);">${productName}</span>
                            <span style="font-weight: 800; color: var(--text-main); text-align: right; padding-right: 10px;">₹${Number(l.subtotal).toFixed(2)}</span>
                            <div style="text-align: right; display: flex; justify-content: flex-end; gap: 4px;">
                                <button class="btn btn-ghost add-qty-btn" data-line-id="${l.id}" data-inv-id="${id}" data-prod-type="${l.product_type}" data-prod-id="${l.product_id}" data-unit-price="${l.unit_price}" data-qty="${l.quantity}" data-prod-name="${productName.replace(/"/g, '&quot;')}" style="color: #3B82F6; padding: 6px 8px; font-size: 0.85rem;" title="Add quantity to this item"><i class="ph ph-plus"></i> Add</button>
                                <button class="btn btn-ghost return-item-btn" data-line-id="${l.id}" data-inv-id="${id}" data-prod-type="${l.product_type}" data-prod-id="${l.product_id}" data-unit-price="${l.unit_price}" data-max-qty="${l.quantity}" data-prod-name="${productName.replace(/"/g, '&quot;')}" style="color: #EF4444; padding: 6px 8px; font-size: 0.85rem;" title="Return this item"><i class="ph ph-arrow-u-up-left"></i> Return</button>
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
                                `Are you sure you want to return ALL <b>${returnQty}</b> of this item?<br><br>This will naturally update the current invoice, deduct the total, and smoothly generate a corresponding Return Record while restoring your inventory stock.<br><br><label style="font-size:0.9rem; font-weight:600; display:block; margin-bottom: 5px;">Payment Mode (Revised Bill):</label><select id="return-payment-mode-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); outline: none; background: white;"><option value="Cash">Cash</option><option value="Online">Online</option></select>`,
                                'Yes, Return Item',
                                '#EF4444',
                                async () => {
                                    const pmSelect = document.getElementById('return-payment-mode-select');
                                    const customPayMode = pmSelect ? pmSelect.value : 'Cash';
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

                                    // 3. Create the NEW Invoice for the REMAINING items, preserving the original payment mode
                                    const { data: retInv, error: retErr } = await supabase.from('invoices').insert({
                                        student_id: targetInv.student_id,
                                        school_id: targetInv.school_id,
                                        total_amount: Math.max(0, newTotal),
                                        status: 'RETURNED_' + customPayMode
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
                                if (targetInv && (targetInv.status.startsWith('PAID') || targetInv.status === 'UPDATED')) {
                                    if (prodType === 'STATIONERY' || prodType === 'BOOK' || prodType === 'SET') {
                                        const { data: currentBk, error: currentBkErr } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', prodId).single();
                                        if (!currentBkErr && currentBk) {
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

                    // Bind Add Qty Buttons
                    document.querySelectorAll('.add-qty-btn').forEach(aBtn => {
                        aBtn.addEventListener('click', (btnEvent) => {
                            const btn = btnEvent.currentTarget;
                            const prodName = btn.getAttribute('data-prod-name') || 'Item';
                            
                            showConfirm(
                                'Add More Quantity',
                                `How many additional units of <b>${prodName}</b> would you like to add to this invoice? <br><br><input type="number" id="extra-add-qty" min="1" value="1" style="width:100%; padding: 10px; margin-top:10px; border-radius: 8px; border: 1px solid var(--border);"><br><br><label style="font-size:0.9rem; font-weight:600; display:block; margin-bottom: 5px;">Payment Mode (Revised Bill):</label><select id="add-payment-mode-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); outline: none; background: white;"><option value="Cash">Cash</option><option value="Online">Online</option></select>`,
                                'Add Quantity',
                                '#3B82F6',
                                async () => {
                                    const pmSelect = document.getElementById('add-payment-mode-select');
                                    const customPayMode = pmSelect ? pmSelect.value : 'Cash';
                                    const inputVal = document.getElementById('extra-add-qty');
                                    let addQty = parseInt(inputVal ? inputVal.value : 1) || 1;
                                    if(addQty <= 0) return;

                                    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Add';
                                    btn.disabled = true;

                                    try {
                                        const lineId = btn.getAttribute('data-line-id');
                                        const invId = btn.getAttribute('data-inv-id');
                                        const unitPrice = parseFloat(btn.getAttribute('data-unit-price'));
                                        const prodType = btn.getAttribute('data-prod-type');
                                        const prodId = btn.getAttribute('data-prod-id');
                                        const oldQty = parseInt(btn.getAttribute('data-qty'));

                                        const addedAmount = unitPrice * addQty;
                                        const newQty = oldQty + addQty;
                                        
                                        const { data: oldItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invId);
                                        const newItems = (oldItems || []).map(item => {
                                            if (String(item.id) === String(lineId)) {
                                                return { ...item, quantity: newQty, subtotal: (parseFloat(item.subtotal) || (unitPrice*oldQty)) + addedAmount };
                                            }
                                            return item;
                                        });

                                        const { data: curInvTemp } = await supabase.from('invoices').select('*').eq('id', invId).single();
                                        
                                        if (curInvTemp.status === 'PENDING') {
                                            const stockPromises = newItems.filter(item => ['STATIONERY','BOOK','SET'].includes(item.product_type)).map(async (item) => {
                                                const { data: sd, error: sdErr } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', item.product_id).single();
                                                if (!sdErr && sd) {
                                                    const newStock = Math.max(0, (sd.remaining_stock ?? 0) - item.quantity);
                                                    await supabase.from('Stationery Details').update({ remaining_stock: newStock }).eq('id', item.product_id);
                                                }
                                            });
                                            await Promise.all(stockPromises);
                                        } else {
                                            if (prodType === 'STATIONERY' || prodType === 'BOOK' || prodType === 'SET') {
                                                const { data: stockInfo, error: stError } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', prodId).single();
                                                if (stError) throw new Error("Could not verify remaining stock natively.");
                                                const currentStock = stockInfo ? stockInfo.remaining_stock : 0;
                                                if (currentStock < addQty) throw new Error(`Insufficient stock for extra units!`);
                                                await supabase.from('Stationery Details').update({ remaining_stock: (currentStock - addQty) }).eq('id', prodId);
                                            }
                                        }

                                        const newTotal = parseFloat(curInvTemp.total_amount) + addedAmount;

                                        await supabase.from('invoice_items').delete().eq('invoice_id', invId);
                                        await supabase.from('invoices').delete().eq('id', invId);

                                        const { data: newInv } = await supabase.from('invoices').insert({
                                            student_id: curInvTemp.student_id,
                                            school_id: curInvTemp.school_id,
                                            total_amount: newTotal,
                                            status: 'UPDATED_' + customPayMode
                                        }).select('id').single();

                                        const newlyCreatedId = newInv.id;
                                        
                                        if (newItems.length > 0) {
                                            const insertPayload = newItems.map(item => ({
                                                invoice_id: newlyCreatedId,
                                                product_type: item.product_type,
                                                product_id: item.product_id,
                                                quantity: item.quantity,
                                                unit_price: item.unit_price,
                                                subtotal: item.subtotal
                                            }));
                                            await supabase.from('invoice_items').insert(insertPayload);
                                        }

                                        showToast("Item quantity added and invoice regenerated!", "success");
                                        document.getElementById('view-modal').style.display = 'none';
                                        await loadInvoices();

                                        setTimeout(() => {
                                            const receiptBtn = document.querySelector(`.receipt-btn[data-id="${newlyCreatedId}"]`);
                                            if (receiptBtn) receiptBtn.click();
                                        }, 400);
                                    } catch(err) {
                                        showToast("Error adding quantity: " + err.message, "error");
                                        btn.innerHTML = '<i class="ph ph-plus"></i> Add';
                                        btn.disabled = false;
                                    }
                                }
                            );
                        });
                    });

                    // Populate & Show Add New Item section
                    const addNewSection = document.getElementById('add-new-item-section');
                    const newItemSelect = document.getElementById('new-item-select');
                    const addNewItemBtn = document.getElementById('add-new-item-btn');
                    
                    if (addNewSection && newItemSelect) {
                        const invData = allInvoices.find(i => i.id === id);
                        let targetClass = null;
                        if (invData && invData.students) {
                            targetClass = invData.students.grade_section;
                        }

                        let opts = '<option value="">-- Select New Item to Add --</option>';
                        products.forEach(p => {
                            if (p.type === 'BOOK' && targetClass && p.class && p.class.toUpperCase() !== targetClass.toUpperCase()) {
                                return; // Automatically skip books meant for other classes
                            }
                            opts += `<option value="${p.id}" data-type="${p.type}" data-price="${p.price}" data-name="${p.name.replace(/"/g, '&quot;')}">${p.name} - ₹${Number(p.price).toFixed(2)}</option>`;
                        });
                        newItemSelect.innerHTML = opts;
                        addNewSection.style.display = 'flex';
                        
                        const newBtnClone = addNewItemBtn.cloneNode(true);
                        addNewItemBtn.parentNode.replaceChild(newBtnClone, addNewItemBtn);
                        
                        newBtnClone.addEventListener('click', async () => {
                            const option = newItemSelect.options[newItemSelect.selectedIndex];
                            if(!option || !option.value) { showToast("Please select an item to add.", "error"); return; }
                            
                            const addQty = parseInt(document.getElementById('new-item-qty').value) || 1;
                            if (addQty <= 0) return;

                            showConfirm(
                                'Add New Item',
                                `Are you sure you want to add ${addQty}x <b>${option.getAttribute('data-name')}</b> to this invoice?<br><br><label style="font-size:0.9rem; font-weight:600; display:block; margin-bottom: 5px;">Payment Mode (Revised Bill):</label><select id="add-new-payment-mode-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); outline: none; background: white;"><option value="Cash">Cash</option><option value="Online">Online</option></select>`,
                                'Add Item',
                                '#3B82F6',
                                async () => {
                                    const pmSelect = document.getElementById('add-new-payment-mode-select');
                                    const customPayMode = pmSelect ? pmSelect.value : 'Cash';
                                    newBtnClone.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Adding...';
                                    newBtnClone.disabled = true;
                                    
                                    try {
                                        const prodId = option.value;
                                        const prodType = option.getAttribute('data-type');
                                        const unitPrice = parseFloat(option.getAttribute('data-price')) || 0;
                                        const addedAmount = unitPrice * addQty;
                                        
                                        const { data: oldItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
                                        const { data: curInvTemp } = await supabase.from('invoices').select('*').eq('id', id).single();
                                        const newTotal = parseFloat(curInvTemp.total_amount) + addedAmount;

                                        const insertPayload = (oldItems || []).map(item => ({
                                            product_type: item.product_type,
                                            product_id: item.product_id,
                                            quantity: item.quantity,
                                            unit_price: item.unit_price,
                                            subtotal: item.subtotal
                                        }));

                                        insertPayload.push({
                                            product_type: prodType,
                                            product_id: prodId,
                                            quantity: addQty,
                                            unit_price: unitPrice,
                                            subtotal: addedAmount
                                        });

                                        if (curInvTemp.status === 'PENDING') {
                                            const stockPromises = insertPayload.filter(item => ['STATIONERY','BOOK','SET'].includes(item.product_type)).map(async (item) => {
                                                const { data: sd, error: sdErr } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', item.product_id).single();
                                                if (!sdErr && sd) {
                                                    const newStock = Math.max(0, (sd.remaining_stock ?? 0) - item.quantity);
                                                    await supabase.from('Stationery Details').update({ remaining_stock: newStock }).eq('id', item.product_id);
                                                }
                                            });
                                            await Promise.all(stockPromises);
                                        } else {
                                            if (prodType === 'STATIONERY' || prodType === 'BOOK' || prodType === 'SET') {
                                                const { data: stockInfo, error: stErr2 } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', prodId).single();
                                                if(stErr2) throw new Error("Could not fetch remote stock matrix.");
                                                const currentStock = stockInfo ? stockInfo.remaining_stock : 0;
                                                if (currentStock < addQty) throw new Error(`Insufficient stock for new item!`);
                                                await supabase.from('Stationery Details').update({ remaining_stock: (currentStock - addQty) }).eq('id', prodId);
                                            }
                                        }

                                        await supabase.from('invoice_items').delete().eq('invoice_id', id);
                                        await supabase.from('invoices').delete().eq('id', id);

                                        const { data: newInv } = await supabase.from('invoices').insert({
                                            student_id: curInvTemp.student_id,
                                            school_id: curInvTemp.school_id,
                                            total_amount: newTotal,
                                            status: 'UPDATED_' + customPayMode
                                        }).select('id').single();

                                        const newlyCreatedId = newInv.id;

                                        const finalPayload = insertPayload.map(item => ({
                                            ...item,
                                            invoice_id: newlyCreatedId
                                        }));

                                        await supabase.from('invoice_items').insert(finalPayload);

                                        showToast("New Item added and invoice regenerated!", "success");
                                        document.getElementById('view-modal').style.display = 'none';
                                        await loadInvoices();
                                        
                                        setTimeout(() => {
                                            const receiptBtn = document.querySelector(`.receipt-btn[data-id="${newlyCreatedId}"]`);
                                            if (receiptBtn) receiptBtn.click();
                                        }, 400);

                                    } catch(err) {
                                        showToast("Error adding new item: " + err.message, "error");
                                        newBtnClone.innerHTML = '<i class="ph ph-plus"></i> Add Item';
                                        newBtnClone.disabled = false;
                                    }
                                }
                            );
                        });
                    }

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
                        notesEl.innerHTML = '<b style="color:var(--text-main);">Return Tracking / Audit Log:</b><br>' + String(invData.notes).replace(/\\n/g, '<br>');
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
                    
                    import('../utils/receipt.js?v=printable_v8').then(m => {
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
                    const invRec = allInvoices.find(v => v.id === id);
                    const isAlreadyUpdatedOrPaid = (invRec && (invRec.status === 'UPDATED' || invRec.status.startsWith('PAID')));

                    // 1. Mark Invoice as PAID
                    const { error } = await supabase.from('invoices').update({ status: 'PAID_Cash' }).eq('id', id);
                    if(error) {
                        alert("Failed to mark as paid: " + error.message);
                        btn.innerHTML = '<i class="ph ph-check-circle"></i> Paid'; // Revert to original icon or a default
                        btn.disabled = false;
                        return;
                    } else {
                        // Dynamically deduct explicitly tracked physical stock only if naturally expanding out of pure PENDING deferment
                        if (!isAlreadyUpdatedOrPaid) {
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
    const searchInput = document.getElementById('invoice-search');
    if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    document.getElementById('close-view-btn').addEventListener('click', () => document.getElementById('view-modal').style.display = 'none');

    document.getElementById('export-csv-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating...';
        btn.disabled = true;

        try {
            const filterStr = document.getElementById('status-filter').value;
            let filtered = filterStr === 'ALL' ? allInvoices : 
                             (filterStr === 'PENDING' ? allInvoices.filter(i => i.status === 'PENDING' || i.status === 'UNPAID') : 
                             (filterStr === 'RETURNED' ? allInvoices.filter(i => i.status === 'RETURNED' || (i.notes && i.notes.includes('Refund'))) :
                             (filterStr === 'PAID' ? allInvoices.filter(i => i.status && i.status.startsWith('PAID')) :
                             allInvoices.filter(i => i.status === filterStr))));
            
            const searchStr = (document.getElementById('invoice-search')?.value || '').toLowerCase().trim();
            if (searchStr) {
                filtered = filtered.filter(i => {
                    const sName = (i.students ? i.students.first_name + ' ' + i.students.last_name : '').toLowerCase();
                    const invNo = String(i.seq_no).toLowerCase();
                    return sName.includes(searchStr) || invNo.includes(searchStr);
                });
            }

            if (filtered.length === 0) {
                showToast("No invoices to export based on current filter.", "error");
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }

            await generateExcelForInvoices(filtered);
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

export async function generateExcelForInvoices(filtered) {
    if (!filtered || filtered.length === 0) throw new Error("No invoices to process.");

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

        const headerRow = ["Sr No", "Date & Time", "Name Of Student", "Class", "Status", "Payment Mode", ...classHeadersVector, "Total"];
        const wsData = [headerRow];

        // 3. Build Class Rows
        classInvoices.forEach((inv, index) => {
            const studentName = inv.students ? `${inv.students.first_name || ''} ${inv.students.last_name || ''}`.trim() : 'Unknown';
            
            let payMode = 'N/A';
            let logicalStatus = inv.status || 'PENDING';
            if (inv.status && inv.status.includes('_')) {
                const parts = inv.status.split('_');
                logicalStatus = parts[0];
                payMode = parts[1];
            } else if (inv.status === 'PAID') {
                payMode = 'UNKNOWN';
            }

            let dtStr = '';
            if (inv.created_at) {
                const dateObj = new Date(inv.created_at);
                dtStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            const row = [index + 1, dtStr, studentName.toUpperCase(), grade, logicalStatus.toUpperCase(), payMode.toUpperCase()];
            
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
        colWidths[1] = { wch: 22 };  // Date & Time
        colWidths[2] = { wch: 30 };  // Student Name
        colWidths[3] = { wch: 15 };  // Class
        colWidths[4] = { wch: 15 };  // Payment Mode
        ws["!cols"] = colWidths;

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

        let safeSheetName = String(grade).replace(/[\\\\/*?:\\[\\]]/g, '').substring(0, 31);
        if (!safeSheetName || safeSheetName.trim() === '') safeSheetName = "ClassData";
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }

    // === EXPLICIT REVENUE SUMMARY SHEET ===
    let totalCash = 0;
    let totalOnline = 0;

    filtered.forEach(inv => {
        let val = Number(inv.total_amount) || 0;
        let payMode = 'OTHER';
        
        if (inv.status && inv.status.includes('_')) {
            payMode = inv.status.split('_')[1].toUpperCase();
        }

        if (payMode === 'CASH') totalCash += val;
        else if (payMode === 'ONLINE') totalOnline += val;
    });

    const summaryData = [
        ["Payment Mode / Source", "Generated Revenue (₹)"],
        ["CASH", totalCash],
        ["ONLINE", totalOnline]
    ];
    
    summaryData.push(["GRAND TOTAL", totalCash + totalOnline]);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 30 }, { wch: 25 }];
    
    const cellA1 = XLSX.utils.encode_cell({c: 0, r: 0});
    const cellB1 = XLSX.utils.encode_cell({c: 1, r: 0});
    if(summaryWs[cellA1]) summaryWs[cellA1].s = { font: { bold: true }, fill: { fgColor: { rgb: "FFEFEFEF" } } };
    if(summaryWs[cellB1]) summaryWs[cellB1].s = { font: { bold: true }, fill: { fgColor: { rgb: "FFEFEFEF" } } };
    
    const gtRow = summaryData.length - 1;
    const cellAgt = XLSX.utils.encode_cell({c: 0, r: gtRow});
    const cellBgt = XLSX.utils.encode_cell({c: 1, r: gtRow});
    if(summaryWs[cellAgt]) summaryWs[cellAgt].s = { font: { bold: true } };
    if(summaryWs[cellBgt]) summaryWs[cellBgt].s = { font: { bold: true } };

    XLSX.utils.book_append_sheet(wb, summaryWs, "Revenue Summary");

    const dtStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Student_Invoices_${dtStr}.xlsx`);
}
