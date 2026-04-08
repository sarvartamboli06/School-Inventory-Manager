export function showReceiptModal(invoice) {
    let container = document.getElementById('global-receipt-modal');
    if (container) {
        container.remove();
    }
    container = document.createElement('div');
    container.id = 'global-receipt-modal';
    container.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; align-items: flex-start; justify-content: center; backdrop-filter: blur(4px); overflow-y: auto; padding: 40px 0;';
    container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 24px; max-width: 800px; width: 100%; align-items: center; margin: auto; position: relative;">
                
                <div id="receipt-paper" class="card fade-in" style="width: 100%; background: white; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: Arial, Helvetica, sans-serif; color: #000; font-weight: 600; border-radius: 4px; position: relative; overflow: hidden;">
                    
                    <!-- PAID WATERMARK STAMP -->
                    <div id="rcpt-paid-stamp" style="display: none; position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); font-size: 6rem; font-weight: 900; color: rgba(16, 185, 129, 0.15); border: 8px solid rgba(16, 185, 129, 0.15); padding: 10px 40px; border-radius: 16px; letter-spacing: 12px; pointer-events: none; z-index: 10;">
                        PAID
                    </div>

                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="font-size: 1.6rem; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; color: #1e3a8a;">DNYANAI ENTERPRISES</h2>
                        <p style="font-size: 0.95rem; font-style: italic; letter-spacing: 1px; margin-bottom: 12px; color: #475569;">"Elevate Your Expectations"</p>
                        <p style="font-size: 0.85rem; font-weight: bold; margin-bottom: 6px; background: #1e40af; color: white; display: inline-block; padding: 4px 12px; border-radius: 4px; letter-spacing: 1px;">School Stationary Services</p>
                        <p style="font-size: 0.85rem; margin-bottom: 2px; margin-top: 8px;"><i class="ph ph-whatsapp-logo" style="vertical-align: middle; font-size: 1rem;"></i> 9960996750 &nbsp;|&nbsp; <i class="ph ph-map-pin" style="vertical-align: middle; font-size: 1rem;"></i> Kopargaon, Dist. Ahmednagar</p>
                    </div>

                    <div style="border-top: 2px solid black; border-bottom: 1px solid black; height: 4px; margin-bottom: 16px;"></div>

                    <!-- Meta Info & Remarks -->
                    <div id="rcpt-remarks-banner" style="display: none; background: #FEF2F2; color: #EF4444; padding: 10px 16px; border: 1px dashed #EF4444; border-radius: 4px; font-weight: bold; text-align: center; margin-bottom: 16px; font-size: 0.95rem;"></div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.9rem; margin-bottom: 16px;">
                        <div>
                            <div style="display: flex; margin-bottom: 4px;"><span style="width: 120px;">INVOICE #</span> <span style="font-weight: bold;" id="rcpt-invoice-id">INV-PENDING</span></div>
                            <div style="display: flex; margin-bottom: 4px;"><span style="width: 120px;">DATE</span> <span id="rcpt-date">-</span></div>
                            <div style="display: flex;"><span style="width: 120px;">SCHOOL</span> <span id="rcpt-school">-</span></div>
                        </div>
                        <div>
                            <div style="display: flex; margin-bottom: 4px;"><span style="width: 140px;">STUDENT NAME</span> <b id="rcpt-student-name">-</b></div>
                            <div style="display: flex; margin-bottom: 4px;"><span style="width: 140px;">CLASS & SECTION</span> <span id="rcpt-class">-</span></div>
                            <div style="display: flex;"><span style="width: 140px;">PARENT PHONE</span> <span id="rcpt-phone">-</span></div>
                        </div>
                    </div>

                    <div style="border-top: 1px dashed black; margin-bottom: 8px;"></div>

                    <!-- Table Header -->
                    <div style="display: grid; grid-template-columns: 60px 1fr 60px 100px 120px; font-weight: bold; font-size: 0.85rem; padding-bottom: 8px;">
                        <div style="text-align: center;">S.NO</div>
                        <div>DESCRIPTION</div>
                        <div style="text-align: center;">QTY</div>
                        <div style="text-align: right;">RATE</div>
                        <div style="text-align: right;">AMOUNT</div>
                    </div>

                    <div style="border-top: 1px dashed black; margin-bottom: 8px;"></div>

                    <!-- Table Body -->
                    <div id="rcpt-items" style="font-size: 0.85rem; min-height: 100px;">
                        <!-- Items Injected Here -->
                    </div>

                    <div style="border-top: 1px dashed black; margin-top: 8px; margin-bottom: 8px;"></div>

                    <!-- Subtotal -->
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px;">
                        <span>Subtotal (₹)</span>
                        <span id="rcpt-subtotal">₹0.00</span>
                    </div>

                    <div style="border-top: 2px solid black; margin-bottom: 8px;"></div>

                    <!-- Grand Total -->
                    <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; margin-bottom: 8px;">
                        <span>GRAND TOTAL</span>
                        <span id="rcpt-grand-total">₹0.00</span>
                    </div>

                    <div style="border-top: 1px dashed black; margin-bottom: 8px;"></div>

                    <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 4px;">
                        Amount in Words: <span id="rcpt-words" style="font-weight: normal;">Zero</span>
                    </div>

                    <div id="rcpt-payment-mode-container" style="font-size: 0.9rem; font-weight: bold; margin-bottom: 16px; display: none;">
                        Payment Mode: <span id="rcpt-payment-mode" style="font-weight: normal;">-</span>
                    </div>

                    <div style="border-top: 1px dashed black; margin-bottom: 16px;"></div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 16px; width: 100%;">
                    <button class="btn btn-primary" id="rcpt-download-btn" style="flex: 1; padding: 16px; font-size: 1.1rem; box-shadow: var(--shadow-md);"><i class="ph ph-download-simple"></i> Download PDF</button>
                    <button class="btn btn-secondary" id="rcpt-print-btn" style="flex: 1; padding: 16px; font-size: 1.1rem; box-shadow: var(--shadow-sm);"><i class="ph ph-printer"></i> Print Invoice</button>
                    <button class="btn btn-ghost" onclick="document.getElementById('global-receipt-modal').style.display='none'" style="padding: 16px; font-size: 1.1rem; background: white; color: #EF4444;"><i class="ph ph-x"></i> Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        
        document.getElementById('rcpt-print-btn').addEventListener('click', () => {
            if (!document.getElementById('receipt-print-style')) {
                const style = document.createElement('style');
                style.id = 'receipt-print-style';
                style.innerHTML = `
                    @media print {
                        @page { size: auto; margin: 0; }
                        body * { visibility: hidden; }
                        #global-receipt-modal { 
                            position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 0; background: none; overflow: visible; display: block !important;
                        }
                        #receipt-paper, #receipt-paper * { visibility: visible; }
                        #receipt-paper { 
                            position: absolute; left: 0; top: 0; width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 10mm !important;
                        }
                        #global-receipt-modal button { display: none !important; }
                    }
                `;
                document.head.appendChild(style);
            }
            window.print();
        });

        document.getElementById('rcpt-download-btn').addEventListener('click', () => {
            const btn = document.getElementById('rcpt-download-btn');
            const ogHtml = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating PDF...';
            btn.disabled = true;

            const element = document.getElementById('receipt-paper');
            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `Invoice_${document.getElementById('rcpt-invoice-id').innerText}.pdf`,
                image:        { type: 'jpeg', quality: 1.0 },
                html2canvas:  { scale: 3, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all'] }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                btn.innerHTML = ogHtml;
                btn.disabled = false;
            });
        });

    // Populate Logic
    const displayId = invoice.seq_no ? String(invoice.seq_no) : 'INV-' + String(invoice.id).split('-')[0].toUpperCase();
    const dt = new Date(invoice.created_at || Date.now());
    
    document.getElementById('rcpt-invoice-id').innerText = displayId;
    document.getElementById('rcpt-date').innerText = dt.toLocaleDateString();
    document.getElementById('rcpt-school').innerText = (localStorage.getItem('selected_school_name') || 'Samata International School').toUpperCase();
    
    const studentName = invoice.student_name || 'UNKNOWN STUDENT';
    const gradeClass = invoice.grade_section || 'UNKNOWN';
    document.getElementById('rcpt-student-name').innerText = studentName.toUpperCase();
    document.getElementById('rcpt-class').innerText = gradeClass.toUpperCase();
    document.getElementById('rcpt-phone').innerText = invoice.parent_contact || '-';
    
    const itemsHtml = invoice.items.map((item, idx) => `
        <div style="display: grid; grid-template-columns: 60px 1fr 60px 100px 120px; padding: 4px 0;">
            <div style="text-align: center;">${idx + 1}</div>
            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${String((item.name || item.item_name || 'Item')).substring(0, 30)}</div>
            <div style="text-align: center;">${item.qty || item.quantity}</div>
            <div style="text-align: right;">₹${Number(item.price || item.unit_price).toFixed(2)}</div>
            <div style="text-align: right;">₹${((item.qty || item.quantity) * (item.price || item.unit_price)).toFixed(2)}</div>
        </div>
    `).join('');
    document.getElementById('rcpt-items').innerHTML = itemsHtml;
    
    document.getElementById('rcpt-subtotal').innerText = '₹' + Number(invoice.total_amount).toFixed(2);
    document.getElementById('rcpt-grand-total').innerText = '₹' + Number(invoice.total_amount).toFixed(2);
    document.getElementById('rcpt-words').innerText = `Rupees ${numberToWords(Math.round(invoice.total_amount))} Only`;

    // Payment Mode Extractions dynamically tracking explicit metadata formats natively bypassing raw prints
    const pmContainer = document.getElementById('rcpt-payment-mode-container');
    const pmText = document.getElementById('rcpt-payment-mode');
    let displayNotes = invoice.notes ? String(invoice.notes) : null;
    let extractedMode = null;

    if (invoice.status && invoice.status.includes('_')) {
        extractedMode = invoice.status.split('_')[1];
    } else if (invoice.status === 'PAID') {
        extractedMode = 'UNKNOWN';
    }

    if (displayNotes && displayNotes.includes('Payment Mode:')) {
        const parts = displayNotes.split('Payment Mode:');
        if (parts.length > 1) {
            const rawVal = parts[1];
            const nlIdx = rawVal.indexOf('\n');
            if (!extractedMode) {
                extractedMode = (nlIdx > -1 ? rawVal.substring(0, nlIdx) : rawVal).trim();
            }
            displayNotes = parts[0].trim() + (nlIdx > -1 ? rawVal.substring(nlIdx) : '').trim();
            displayNotes = displayNotes.trim();
            if (!displayNotes) displayNotes = null;
        }
    }

    if (extractedMode) {
        pmText.innerText = extractedMode.toUpperCase();
        pmContainer.style.display = 'block';
    } else {
        pmContainer.style.display = 'none';
    }

    // PAID Stamp logic natively honoring custom configurations
    document.getElementById('rcpt-paid-stamp').style.display = (invoice.status && invoice.status.startsWith('PAID')) ? 'block' : 'none';

    // REMARKS logic properly filtering decoupled attributes 
    const remarksBanner = document.getElementById('rcpt-remarks-banner');
    if (displayNotes) {
        remarksBanner.innerHTML = String(displayNotes).replace(/\n/g, '<br>');
        remarksBanner.style.display = 'block';
    } else {
        remarksBanner.style.display = 'none';
        remarksBanner.innerHTML = '';
    }

    container.style.display = 'flex';
}

function numberToWords(num) {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() || 'Zero';
}
