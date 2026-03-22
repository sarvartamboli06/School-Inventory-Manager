import { supabase } from '../supabase.js';

export async function renderBilling(container) {
    container.innerHTML = `
        <div>
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Generate Bill</h1>
                    <p style="color: var(--text-muted);">Search for a student to instantly build their cart.</p>
                </div>
            </div>

            <div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">
                
                <!-- Left: Selection -->
                <div class="card" style="flex: 2; min-width: 400px; position: relative;">
                    <h2 class="card-title" style="margin-bottom: 16px;">Select Student</h2>
                    
                    <div style="margin-bottom: 24px; position: relative;">
                        <div class="header-search" style="width: 100%; box-shadow: none; border: 2px solid var(--primary); background: #F8FAFC;">
                            <i class="ph ph-magnifying-glass" style="color: var(--primary);"></i>
                            <input type="text" id="student-search-input" placeholder="Type student name or ID..." style="font-size: 1.05rem;" autocomplete="off">
                        </div>
                        <ul id="search-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 50; max-height: 250px; overflow-y: auto; list-style: none; padding: 0; margin-top: 8px;">
                            <!-- Results injected here -->
                        </ul>
                    </div>

                    <div id="selected-student-card" style="display: none; padding: 16px; background: #EEF2FF; border-radius: var(--radius-md); border: 1px solid #C7D2FE; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="display: block; font-weight: 700; color: #3730A3; font-size: 1.1rem;" id="sel-stu-name">-</span>
                            <span style="display: block; font-size: 0.85rem; color: #4F46E5; margin-top: 4px;" id="sel-stu-class">-</span>
                        </div>
                        <button class="btn btn-ghost" id="clear-student-btn" style="color: #EF4444;"><i class="ph ph-x"></i> Clear</button>
                    </div>

                    <div class="table-container" style="box-shadow: none; border: 1px solid var(--border);">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="cart-tbody">
                                <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Cart is empty. Select a student first!</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Right: Summary -->
                <div class="card" style="flex: 1; min-width: 300px; background: #F8FAFC; border: 1px solid var(--border);">
                    <h2 class="card-title" style="margin-bottom: 24px;">Order Summary</h2>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem;">
                        <span style="color: var(--text-muted);">Subtotal</span>
                        <span style="font-weight: 600;" id="summary-subtotal">$0.00</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem;">
                        <span style="color: var(--text-muted);">Tax (5%)</span>
                        <span style="font-weight: 600;" id="summary-tax">$0.00</span>
                    </div>
                    
                    <div style="border-top: 1px dashed #CBD5E1; padding-top: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1.1rem; font-weight: 600;">Total</span>
                        <span style="font-size: 1.5rem; font-weight: 700; color: var(--primary);" id="summary-total">$0.00</span>
                    </div>

                    <button class="btn btn-primary" id="open-checkout-modal-btn" style="width: 100%; padding: 14px; font-size: 1.05rem;" disabled><i class="ph ph-receipt"></i> Generate Bill</button>
                </div>
            </div>

            <!-- Checkout Modal -->
            <div id="checkout-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 450px; padding: 32px; box-shadow: var(--shadow-lg); text-align: center;">
                    <h2 style="margin-bottom: 8px;">Finalize Bill</h2>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">For <b id="modal-student-name">Student Name</b></p>
                    
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin-bottom: 32px;" id="modal-final-total">$0.00</div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn btn-primary" id="process-paid-btn" style="padding: 16px; font-size: 1.1rem; background: #10B981; border: none;"><i class="ph ph-money"></i> Mark as PAID & Deduct Stock</button>
                        <button class="btn btn-secondary" id="process-pending-btn" style="padding: 16px; font-size: 1.1rem;"><i class="ph ph-clock"></i> Save as PENDING (Unpaid)</button>
                        <button class="btn btn-ghost" id="cancel-checkout-btn" style="margin-top: 8px;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    let cart = [];
    let products = [];
    let allStudents = [];
    let activeStudent = null;
    
    // Elements
    const searchInput = document.getElementById('student-search-input');
    const searchResults = document.getElementById('search-results');
    const selectedCard = document.getElementById('selected-student-card');
    const clearStudentBtn = document.getElementById('clear-student-btn');
    const generateBtn = document.getElementById('open-checkout-modal-btn');
    const checkoutModal = document.getElementById('checkout-modal');

    try {
        // Fetch base lists natively
        const [ {data: students}, {data: inventory}, {data: books} ] = await Promise.all([
            supabase.from('students').select('*'),
            supabase.from('inventory_items').select('id, item_name, stock_count'),
            supabase.from('Stationery Details').select('*')
        ]);

        allStudents = students || [];

        // Note: Inventory Price is dynamically assumed 0 or inherited if it had one. We strict to 0 for Set Trackers.
        if (inventory) products.push(...inventory.map(i => ({...i, type: 'STATIONERY', name: i.item_name, price: 0})));
        
        if (books) products.push(...books.map(b => ({
            id: String(b.id), 
            type: 'BOOK', 
            name: b['Book Name'] || 'Unknown', 
            price: Number(b['Rate'] || 0), 
            class: String(b['Class'] || '').trim().toUpperCase(),
            stock_count: 9999
        })));

    } catch(err) {
        console.error(err);
        searchInput.placeholder = "Failed to load database. Refresh page.";
        searchInput.disabled = true;
    }

    // SEARCH BAR LOGIC
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 1) {
            searchResults.style.display = 'none';
            return;
        }

        const matches = allStudents.filter(s => 
            s.first_name.toLowerCase().includes(query) || 
            s.last_name.toLowerCase().includes(query) ||
            s.id.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to top 10 results

        if (matches.length === 0) {
            searchResults.innerHTML = '<li style="padding: 12px 16px; color: var(--text-muted);">No students found.</li>';
        } else {
            searchResults.innerHTML = matches.map(s => `
                <li class="search-item" data-id="${s.id}" style="padding: 12px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;">
                    <div style="font-weight: 600; color: var(--text);">${s.first_name} ${s.last_name} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted); float: right;">ID: ${s.id.split('-')[0]}</span></div>
                    <div style="font-size: 0.85rem; color: var(--primary); margin-top: 4px;">Class ${s.grade_section} &middot; ${s.school_name || 'No School Profile'}</div>
                </li>
            `).join('');
        }
        searchResults.style.display = 'block';

        // Bind clicks to dynamically injected LIs
        document.querySelectorAll('.search-item').forEach(li => {
            li.addEventListener('click', () => selectStudent(li.getAttribute('data-id')));
            li.addEventListener('mouseenter', () => li.style.background = '#F8FAFC');
            li.addEventListener('mouseleave', () => li.style.background = 'white');
        });
    });

    // Hide search results if clicked outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
    });

    function selectStudent(studentId) {
        activeStudent = allStudents.find(s => s.id === studentId);
        if (!activeStudent) return;

        searchResults.style.display = 'none';
        searchInput.parentElement.style.display = 'none';
        
        document.getElementById('sel-stu-name').innerText = activeStudent.first_name + ' ' + activeStudent.last_name;
        document.getElementById('sel-stu-class').innerText = 'Class ' + activeStudent.grade_section + ' — ' + (activeStudent.school_name || 'No School Profile');
        selectedCard.style.display = 'flex';

        // AUTO-POPULATE THE CART WITH BOOKS FOR THIS CLASS
        cart = [];
        const targetClass = activeStudent.grade_section.trim().toUpperCase();
        
        // Gather all individual legacy books
        const classBooks = products.filter(p => p.type === 'BOOK' && p.class === targetClass);
        cart.push(...classBooks.map(b => ({ ...b, qty: 1 })));

        // We explicitly DO NOT push the Set tracker to the visible cart output here anymore!
        // It gets stealth-injected directly into the Database payload during final generation.

        renderCart();
    }

    clearStudentBtn.addEventListener('click', () => {
        activeStudent = null;
        cart = [];
        selectedCard.style.display = 'none';
        searchInput.parentElement.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();
        renderCart();
    });

    const renderCart = () => {
        const tbody = document.getElementById('cart-tbody');
        if (cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Cart is empty. Make sure the Class matches exactly!</td></tr>';
            updateTotals(0);
            return;
        }

        tbody.innerHTML = cart.map((item, index) => `
            <tr>
                <td style="font-weight: 500;">${item.name}<br><small style="color:var(--text-muted);">${item.type}</small></td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>
                    <input type="number" class="qty-input" data-index="${index}" value="${item.qty}" min="1" max="${item.stock_count}" style="width: 60px; padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                </td>
                <td style="font-weight: 600;">$${(item.price * item.qty).toFixed(2)}</td>
                <td><button class="icon-btn remove-cart-btn" data-index="${index}" style="width: 32px; height: 32px; color: #EF4444; border:none; background:transparent;"><i class="ph ph-trash"></i></button></td>
            </tr>
        `).join('');

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        updateTotals(subtotal);

        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                let newQty = parseInt(e.target.value, 10);
                if (newQty > cart[idx].stock_count) {
                    alert('Cannot exceed available stock physical quantity.');
                    newQty = cart[idx].stock_count;
                }
                cart[idx].qty = newQty;
                renderCart();
            });
        });

        document.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.getAttribute('data-index');
                cart.splice(idx, 1);
                renderCart();
            });
        });
    };

    function updateTotals(subtotal) {
        const tax = subtotal * 0.05;
        const total = subtotal + tax;
        document.getElementById('summary-subtotal').innerText = '$' + subtotal.toFixed(2);
        document.getElementById('summary-tax').innerText = '$' + tax.toFixed(2);
        document.getElementById('summary-total').innerText = '$' + total.toFixed(2);
        
        generateBtn.disabled = cart.length === 0 || !activeStudent;
    };

    // OPEN CHECKOUT MODAL
    generateBtn.addEventListener('click', () => {
        if(!activeStudent || cart.length === 0) return;
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const finalTotal = subtotal + (subtotal * 0.05);
        
        document.getElementById('modal-student-name').innerText = activeStudent.first_name + ' ' + activeStudent.last_name;
        document.getElementById('modal-final-total').innerText = '$' + finalTotal.toFixed(2);
        
        checkoutModal.style.display = 'flex';
    });

    document.getElementById('cancel-checkout-btn').addEventListener('click', () => checkoutModal.style.display = 'none');

    // PROCESS BILL ENGINE
    async function processBill(statusLabel) {
        document.getElementById('process-paid-btn').disabled = true;
        document.getElementById('process-pending-btn').disabled = true;
        document.getElementById('process-paid-btn').innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const total_amount = subtotal + (subtotal * 0.05);

        // 1. Create Invoice Database record natively
        const { data: invoice, error: invError } = await supabase.from('invoices').insert([{
            student_id: activeStudent.id,
            total_amount: total_amount,
            status: statusLabel
        }]).select('id').single();

        if (invError) {
            alert('System Fault creating Invoice header: ' + invError.message);
            resetModalButtons();
            return;
        }

        // 2. Upload Invoice Items array
        const invoiceItems = cart.map(item => ({
            invoice_id: invoice.id,
            product_type: item.type,
            product_id: item.id,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: item.price * item.qty
        }));

        // 3. Silently inject the Database Inventory Deductor so it isn't visible on the UI, but still triggers SQL decrement rules!
        const targetClass = activeStudent.grade_section.trim().toUpperCase();
        const tracker = products.find(p => p.type === 'STATIONERY' && String(p.name).trim().toUpperCase() === targetClass);
        if (tracker) {
            invoiceItems.push({
                invoice_id: invoice.id,
                product_type: 'STATIONERY',
                product_id: tracker.id,
                quantity: 1,
                unit_price: 0,
                subtotal: 0
            });
        }

        const { error: lineError } = await supabase.from('invoice_items').insert(invoiceItems);
        
        if (lineError) {
            alert('Checkout succeeded but line itemization failed: ' + lineError.message);
        } else {
            // SUCCESS!
            alert(`Success! Bill Generated as ${statusLabel}. Check the new "Invoices" tab to view it!`);
            checkoutModal.style.display = 'none';
            clearStudentBtn.click(); // resets UI cleanly
        }
        resetModalButtons();
    }

    function resetModalButtons() {
        document.getElementById('process-paid-btn').disabled = false;
        document.getElementById('process-pending-btn').disabled = false;
        document.getElementById('process-paid-btn').innerHTML = '<i class="ph ph-money"></i> Mark as PAID & Deduct Stock';
    }

    document.getElementById('process-paid-btn').addEventListener('click', () => processBill('PAID'));
    document.getElementById('process-pending-btn').addEventListener('click', () => processBill('PENDING'));
}
