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

                    <div id="cart-container" style="background: white; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px;">
                        <div id="cart-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px;">
                            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px;">Cart is empty. Select a student first!</div>
                        </div>
                    </div>
                </div>

                <!-- Right: Summary -->
                <div class="card" style="flex: 1; min-width: 300px; background: #F8FAFC; border: 1px solid var(--border);">
                    <h2 class="card-title" style="margin-bottom: 24px;">Order Summary</h2>
                    
                    <!-- QR Upload feature -->
                    <div style="margin-bottom: 20px; text-align: center; border: 1px dashed #CBD5E1; padding: 12px; border-radius: 8px; background: white;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); cursor: pointer; margin-bottom: 8px;">
                            <i class="ph ph-qr-code" style="font-size: 1.2rem; vertical-align: middle;"></i> Upload QR Code (Optional)
                            <input type="file" id="qr-upload-input" accept="image/*" style="display: none;">
                        </label>
                        <img id="qr-preview-img" style="max-width: 100%; max-height: 500px; display: none; margin: 0 auto; border-radius: 4px; object-fit: contain;">
                        <button id="qr-remove-btn" class="btn btn-ghost" style="display: none; width: 100%; margin-top: 8px; color: #EF4444; padding: 4px; font-size: 0.85rem;"><i class="ph ph-trash"></i> Remove QR</button>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem;">
                        <span style="color: var(--text-muted);">Subtotal</span>
                        <span style="font-weight: 600;" id="summary-subtotal">₹0.00</span>
                    </div>
                    
                    <div style="border-top: 1px dashed #CBD5E1; padding-top: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1.1rem; font-weight: 600;">Total</span>
                        <span style="font-size: 1.5rem; font-weight: 700; color: var(--primary);" id="summary-total">₹0.00</span>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Payment Mode</label>
                        <select id="payment-mode-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); outline: none; background: white;">
                            <option value="Cash">Cash</option>
                            <option value="Online">Online</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button class="btn btn-secondary" id="save-unpaid-btn" style="flex: 1; padding: 14px; font-size: 1.05rem;" disabled><i class="ph ph-clock"></i> Save UNPAID</button>
                        <button class="btn btn-primary" id="mark-paid-btn" style="flex: 1; padding: 14px; font-size: 1.05rem; background: #10B981; border: none;" disabled><i class="ph ph-money"></i> Mark PAID</button>
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
    const saveUnpaidBtn = document.getElementById('save-unpaid-btn');
    const markPaidBtn = document.getElementById('mark-paid-btn');

    // QR Code Upload Logic
    const qrInput = document.getElementById('qr-upload-input');
    const qrImg = document.getElementById('qr-preview-img');
    const qrRemoveBtn = document.getElementById('qr-remove-btn');
    
    if (qrInput) {
        qrInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    qrImg.src = evt.target.result;
                    qrImg.style.display = 'block';
                    qrRemoveBtn.style.display = 'block';
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
        
        qrRemoveBtn.addEventListener('click', () => {
            qrInput.value = '';
            qrImg.src = '';
            qrImg.style.display = 'none';
            qrRemoveBtn.style.display = 'none';
        });
    }

    try {
        const schoolId = localStorage.getItem('selected_school_id');
        // Fetch base lists natively
        const [ 
            {data: students, error: stuErr}, 
            {data: inventory, error: invErr} 
        ] = await Promise.all([
            supabase.from('students').select('*').eq('school_id', schoolId),
            supabase.from('Stationery Details').select('*').eq('school_id', schoolId)
        ]);

        if (stuErr) throw stuErr;
        if (invErr) throw invErr;

        allStudents = students || [];

        // Map exclusively from Stationery Details since it contains the actual unified dataset (Books & Stock)
        if (inventory) products.push(...inventory.map(i => ({
            id: String(i.id),
            type: 'BOOK', // Classifying as BOOK ensures selectStudent auto-populates class lists flawlessly
            name: i['Book Name'] || i.item_name || 'Unknown Item',
            price: Number(i['Rate'] || i.Rate || 0),
            stock_count: Number(i.remaining_stock ?? 100),
            class: String(i['Class'] || '').trim().toUpperCase()
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
        const normalizeClass = c => String(c || '').trim().toUpperCase().replace(/^CLASS\s*|-/g, '');
        const targetClass = normalizeClass(activeStudent.grade_section);
        
        // Gather all individual legacy books aligning on normalized class names
        const classBooks = products.filter(p => p.type === 'BOOK' && normalizeClass(p.class) === targetClass);
        cart.push(...classBooks.map(b => ({ ...b, qty: b.required_qty || 1 })));

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

    const getDynamicIcon = (name, type) => {
        const lower = name.toLowerCase();
        if (lower.includes('math') || lower.includes('algebra') || lower.includes('calculus')) return 'ph-calculator';
        if (lower.includes('science') || lower.includes('physics') || lower.includes('chemistry') || lower.includes('biology')) return 'ph-flask';
        if (lower.includes('history') || lower.includes('geography')) return 'ph-globe-hemisphere-west';
        if (lower.includes('english') || lower.includes('grammar') || lower.includes('literature')) return 'ph-translate';
        if (lower.includes('art') || lower.includes('drawing') || lower.includes('color')) return 'ph-palette';
        if (lower.includes('computer') || lower.includes('code')) return 'ph-desktop';
        if (lower.includes('music') || lower.includes('song')) return 'ph-music-notes';
        if (lower.includes('bag') || lower.includes('backpack')) return 'ph-backpack';
        if (lower.includes('uniform') || lower.includes('shirt') || lower.includes('tie') || lower.includes('belt')) return 'ph-t-shirt';
        if (lower.includes('notebook') || lower.includes('copy') || lower.includes('diary') || lower.includes('journal')) return 'ph-notebook';
        if (lower.includes('pencil') || lower.includes('pen') || lower.includes('marker')) return 'ph-pencil-simple';
        if (lower.includes('ruler') || lower.includes('scale')) return 'ph-ruler';
        if (lower.includes('eraser') || lower.includes('sharpener')) return 'ph-eraser';
        
        return type === 'BOOK' ? 'ph-book-open' : 'ph-package';
    };

    const renderCart = () => {
        const grid = document.getElementById('cart-grid');
        if (cart.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px;">Cart is empty. Make sure the Class matches exactly!</div>';
            updateTotals(0);
            return;
        }

        grid.innerHTML = cart.map((item, index) => {
            const disableMinus = item.qty <= 0;
            const disablePlus = item.qty >= item.stock_count;
            const iconClass = getDynamicIcon(item.name, item.type);

            return `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 16px 12px; border: 1px solid #E2E8F0; border-radius: 8px; background: white; text-align: center; position: relative;">
                <!-- Icon -->
                <div style="font-size: 2rem; color: var(--primary); background: #EEF2FF; width: 48px; height: 48px; min-height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; margin-top: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                    <i class="ph ${iconClass}"></i>
                </div>
                
                <!-- Name -->
                <div style="font-weight: 700; color: #1E293B; font-size: 0.85rem; margin-bottom: 4px; line-height: 1.2;">
                    ${item.name}
                </div>
                
                <!-- Price -->
                <div style="color: #10B981; font-weight: 600; font-size: 0.75rem; margin-bottom: 16px;">
                    ₹${Number(item.price).toFixed(2)}
                </div>
                
                <!-- Quantity Control -->
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border: 1px solid #E2E8F0; border-radius: 20px; padding: 2px 6px; margin-top: auto; background: white;">
                    <button type="button" class="icon-btn minus-btn" data-index="${index}" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:${disableMinus ? '#CBD5E1' : '#64748B'}; cursor:${disableMinus ? 'not-allowed' : 'pointer'};" ${disableMinus ? 'disabled' : ''}>
                        <i class="ph ph-minus"></i>
                    </button>
                    <span style="font-weight: 700; font-size: 0.85rem; color: #1E293B; min-width: 20px;">${item.qty}</span>
                    <button type="button" class="icon-btn plus-btn" data-index="${index}" style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:${disablePlus ? '#CBD5E1' : '#64748B'}; cursor:${disablePlus ? 'not-allowed' : 'pointer'};" ${disablePlus ? 'disabled' : ''}>
                        <i class="ph ph-plus"></i>
                    </button>
                </div>
            </div>
        `}).join('');

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        updateTotals(subtotal);

        document.querySelectorAll('.minus-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                if (cart[idx].qty <= 0) return;
                cart[idx].qty -= 1;
                renderCart();
            });
        });

        document.querySelectorAll('.plus-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                if (cart[idx].qty >= cart[idx].stock_count) {
                    alert('Cannot exceed available stock physical quantity.');
                    return;
                }
                cart[idx].qty += 1;
                renderCart();
            });
        });

        document.querySelectorAll('.remove-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                cart.splice(idx, 1);
                renderCart();
            });
        });
    };

    function updateTotals(subtotal) {
        document.getElementById('summary-subtotal').innerText = '₹' + subtotal.toFixed(2);
        document.getElementById('summary-total').innerText = '₹' + subtotal.toFixed(2);
        
        const disabled = cart.length === 0 || !activeStudent;
        saveUnpaidBtn.disabled = disabled;
        markPaidBtn.disabled = disabled;
    };

    async function processCheckout(statusLabel) {
        const activeItems = cart.filter(item => item.qty > 0);
        if(!activeStudent || activeItems.length === 0) {
            alert('Select a student and ensure at least one item has a quantity greater than 0.');
            return;
        }
        
        saveUnpaidBtn.disabled = true;
        markPaidBtn.disabled = true;
        const ogBtnHtml = statusLabel === 'PAID' ? markPaidBtn.innerHTML : saveUnpaidBtn.innerHTML;
        if(statusLabel === 'PAID') markPaidBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';
        else saveUnpaidBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

        const total_amount = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const schoolId = localStorage.getItem('selected_school_id');

        let invoiceNotes = null;
        if (statusLabel === 'PAID') {
            const payMode = document.getElementById('payment-mode-select').value;
            invoiceNotes = `Payment Mode: ${payMode}`;
        }

        let dbStatus = statusLabel;
        if (statusLabel === 'PAID') {
            const payMode = document.getElementById('payment-mode-select').value;
            dbStatus = `PAID_${payMode}`;
        }

        const { data: invoice, error: invError } = await supabase.from('invoices').insert([{
            student_id: activeStudent.id,
            total_amount: total_amount,
            status: dbStatus,
            school_id: schoolId
        }]).select('id').single();

        if (invError) {
            alert('System Fault creating Invoice header: ' + invError.message);
            saveUnpaidBtn.disabled = false;
            markPaidBtn.disabled = false;
            if(statusLabel === 'PAID') markPaidBtn.innerHTML = ogBtnHtml; else saveUnpaidBtn.innerHTML = ogBtnHtml;
            return;
        }

        const invoiceItems = activeItems.map(item => ({
            invoice_id: invoice.id,
            product_type: item.type,
            product_id: item.id,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: item.price * item.qty
        }));

        const { error: lineError } = await supabase.from('invoice_items').insert(invoiceItems);
        
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        const sequenceNumber = count || 1;

        if (lineError) {
            alert('Checkout succeeded but line itemization failed: ' + lineError.message);
        } else {
            // 5. Deduct explicit physical stock ONLY when the invoice is actually Mark PAID
            if (statusLabel === 'PAID') {
                const stockPromises = activeItems.filter(i => i.type === 'BOOK').map(async (item) => {
                    const { data: sd, error: sdErr } = await supabase.from('Stationery Details').select('remaining_stock').eq('id', item.id).single();
                    if (!sdErr && sd) {
                        const newStock = Math.max(0, (sd.remaining_stock ?? 0) - item.qty);
                        await supabase.from('Stationery Details').update({ remaining_stock: newStock }).eq('id', item.id);
                    } else if (sdErr) {
                        console.error("Hardened Audit: Failed stock deduction verification for item: " + item.id, sdErr);
                    }
                });
                await Promise.all(stockPromises);
            }

            if (statusLabel === 'PAID') {
                const receiptModule = await import('../utils/receipt.js?v=printable_v8');
                receiptModule.showReceiptModal({
                    id: invoice.id,
                    student_id: activeStudent.id,
                    student_name: activeStudent.first_name + ' ' + activeStudent.last_name,
                    grade_section: activeStudent.grade_section,
                    parent_contact: activeStudent.parent_contact,
                    total_amount: total_amount,
                    status: dbStatus,
                    created_at: new Date().toISOString(),
                    seq_no: sequenceNumber,
                    notes: invoiceNotes,
                    items: activeItems.map(i => ({...i}))
                });
            } else {
                window.showToast("Success", "Invoice saved as UNPAID.", "success");
            }
            clearStudentBtn.click();
        }

        saveUnpaidBtn.disabled = false;
        markPaidBtn.disabled = false;
        if(statusLabel === 'PAID') markPaidBtn.innerHTML = ogBtnHtml; else saveUnpaidBtn.innerHTML = ogBtnHtml;
    }

    saveUnpaidBtn.addEventListener('click', () => processCheckout('PENDING'));
    markPaidBtn.addEventListener('click', () => processCheckout('PAID'));
}
