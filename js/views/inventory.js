import { supabase } from '../supabase.js';

export async function renderInventory(container) {
    container.innerHTML = `
        <div class="fade-in" style="position: relative;">
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Item Inventory</h1>
                    <p style="color: var(--text-muted);">Track physical stock quantities for individual class items.</p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="header-search" style="box-shadow: none; border: 1px solid var(--border); background: white;">
                        <i class="ph ph-magnifying-glass" style="color: var(--primary);"></i>
                        <input type="text" id="inventory-search-input" placeholder="Filter by Class..." style="font-size: 0.9rem;" autocomplete="off">
                    </div>
                    <button class="btn btn-secondary" id="export-inventory-btn" style="background: #10B981; color: white; border: none;" title="Download Inventory Report">
                        <i class="ph ph-download-simple"></i> Download Report
                    </button>
                    <label class="btn btn-secondary" style="cursor: pointer;" title="Bulk import via Excel or CSV!">
                        <i class="ph ph-upload-simple"></i> Import CSV/Excel
                        <input type="file" id="bulk-inventory-input" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style="display: none;">
                    </label>
                    <button class="btn btn-primary" id="add-set-btn"><i class="ph ph-stack"></i> Add Item Stock</button>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Item Name</th>
                            <th>Total Stock</th>
                            <th>Remaining Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-tbody">
                        <tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading items...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Container -->
            <div id="pagination-container" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; padding-bottom: 24px;"></div>

            <!-- Modal for Adding Item -->
            <div id="add-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 400px; padding: 32px; box-shadow: var(--shadow-lg);">
                    <h2 style="margin-bottom: 24px;">Register Item Stock</h2>
                    <form id="add-set-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Class Name</label>
                            <input type="text" id="add-class" placeholder="e.g. NURSERY or 9TH" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Item Name</label>
                            <input type="text" id="add-name" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Total Units</label>
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

    if (!document.getElementById('toast-container')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 12px; z-index: 10000;"></div>
        `);
    }

    if (!window.showToast) {
        window.showToast = function(message, type = 'success') {
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
        };
    }

    let allInventoryData = [];
    let currentPage = 1;
    const rowsPerPage = 20;

    const renderPaginationControls = (totalPages) => {
        const container = document.getElementById('pagination-container');
        if (!container) return;
        
        let html = '';
        const btnStyle = "display: flex; align-items: center; justify-content: center; font-weight: bold; border: none; background: transparent; color: var(--primary); cursor: pointer; transition: 0.2s;";
        
        html += `<button class="paginate-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? `disabled style="opacity: 0.5; cursor: not-allowed; ${btnStyle}"` : `style="${btnStyle}"`}><i class="ph ph-caret-left" style="margin-right: 4px;"></i> Prev</button>`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages > 0 ? totalPages : 1, startPage + 4);
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

        if (endPage < (totalPages > 0 ? totalPages : 1)) {
            if (endPage < (totalPages > 0 ? totalPages : 1) - 1) html += `<span style="color: var(--primary); font-weight: bold; padding: 0 4px;">...</span>`;
            html += `<button class="paginate-btn" data-page="${totalPages}" style="width: 36px; height: 36px; border-radius: 50%; ${btnStyle}">${totalPages}</button>`;
        }

        html += `<button class="paginate-btn" data-page="${currentPage + 1}" ${currentPage >= (totalPages > 0 ? totalPages : 1) ? `disabled style="opacity: 0.5; cursor: not-allowed; ${btnStyle}"` : `style="${btnStyle}"`}>Next <i class="ph ph-caret-right" style="margin-left: 4px;"></i></button>`;

        container.innerHTML = `<div style="background: white; padding: 8px 20px; border-radius: 50px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 8px;">${html}</div>`;

        container.querySelectorAll('.paginate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.hasAttribute('disabled')) return;
                const newPage = parseInt(e.currentTarget.getAttribute('data-page'));
                if (newPage >= 1 && newPage <= (totalPages > 0 ? totalPages : 1)) {
                    currentPage = newPage;
                    renderTable();
                }
            });
        });
    };

    async function loadInventory() {
        const schoolId = localStorage.getItem('selected_school_id');
        const tbody = document.getElementById('inventory-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin"></i> Loading items...</td></tr>';

        // Fetch single granular items natively tracking dual stocks
        const { data: items, error } = await supabase.from('Stationery Details').select('*').eq('school_id', schoolId).order('Class', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #EF4444;"><b>Error connecting:</b> ${error.message}</td></tr>`;
            return;
        }

        allInventoryData = items || [];
        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById('inventory-tbody');
        const query = document.getElementById('inventory-search-input').value.toLowerCase().trim();

        const filtered = allInventoryData.filter(item => {
            const cls = String(item['Class'] || '').toLowerCase();
            return cls.includes(query);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No inventory found for this filter.</td></tr>';
            return;
        }

        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        tbody.innerHTML = paginated.map(item => {
            const totalCount = item.total_stock ?? 0;
            const remainingCount = item.remaining_stock ?? 0;
            return `
            <tr>
                <td style="font-weight: 700; color: var(--primary); font-size: 1.1rem;"><i class="ph ph-books"></i> ${item['Class']}</td>
                <td style="font-weight: 600; color: var(--text-main);">${item['Book Name']}</td>
                <td style="font-weight: 600;">${totalCount}</td>
                <td>
                    <span class="status-badge ${remainingCount > 10 ? 'status-success' : (remainingCount > 0 ? 'status-warning' : 'status-danger')}">
                        ${remainingCount} Units
                    </span>
                </td>
                <td>
                    <button class="icon-btn delete-btn" data-id="${item.id}" style="width: 32px; height: 32px; color: #EF4444;" title="Delete Item"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                const { error } = await supabase.from('Stationery Details').delete().eq('id', id);
                if (error) {
                    showToast('Error: ' + error.message, 'error');
                    e.currentTarget.innerHTML = '<i class="ph ph-trash"></i>';
                } else {
                    showToast('Stock item removed.', 'success');
                    await loadInventory();
                }
            });
        });
        
        renderPaginationControls(totalPages);
    }

    document.getElementById('inventory-search-input').addEventListener('input', () => { currentPage = 1; renderTable(); });

    await loadInventory();

    const modal = document.getElementById('add-modal');
    document.getElementById('add-set-btn').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('close-modal-btn').addEventListener('click', () => { modal.style.display = 'none'; document.getElementById('add-set-form').reset();});

    document.getElementById('add-set-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-set-btn');
        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        const totalItems = parseInt(document.getElementById('add-total').value, 10);
        const schoolId = localStorage.getItem('selected_school_id');
        const upperClass = document.getElementById('add-class').value.toUpperCase().trim();
        const itemName = document.getElementById('add-name').value.trim();

        // Check if item exists in this class
        const { data: existing } = await supabase.from('Stationery Details')
            .select('*')
            .eq('school_id', schoolId)
            .eq('Class', upperClass)
            .ilike('Book Name', itemName)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase.from('Stationery Details').update({
                total_stock: (existing.total_stock ?? 0) + totalItems,
                remaining_stock: (existing.remaining_stock ?? 0) + totalItems
            }).eq('id', existing.id);
            
            if (error) showToast('Error updating item: ' + error.message, 'error');
            else showToast(`Aggregated ${totalItems} new items into existing stock for ${itemName}!`, 'success');
        } else {
            const { error } = await supabase.from('Stationery Details').insert([{
                school_id: schoolId,
                "Sr No": Math.floor(Math.random() * 1000000000),
                Class: upperClass,
                "Book Name": itemName,
                total_stock: totalItems,
                remaining_stock: totalItems,
                Qty: 1,
                Rate: 0, // Default to 0 for dynamically added stock
                Amount: 0 
            }]);
            
            if (error) showToast('Error saving item: ' + error.message, 'error');
            else showToast('Successfully registered new class item stock!', 'success');
        }

        modal.style.display = 'none';
        document.getElementById('add-set-form').reset();
        btn.innerHTML = 'Save Stock';
        btn.disabled = false;
        await loadInventory();
    });

    const bulkInput = document.getElementById('bulk-inventory-input');
    if (bulkInput) {
        bulkInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                    const schoolId = localStorage.getItem('selected_school_id');
                    const tbody = document.getElementById('inventory-tbody');
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--primary);"><b><i class="ph ph-spinner ph-spin"></i> Processing spreadsheet rows...</b></td></tr>`;
                    
                    const payload = jsonRows.map(row => {
                        const className = String(row['Class Name'] || row['Class'] || row['class_name'] || '').trim().toUpperCase();
                        const itemName = String(row['Item name'] || row['Item Name'] || row['item_name'] || row['Book Name'] || '').trim();
                        const totalUnitAdded = parseInt(row['total item'] || row['Total item'] || row['Total Items'] || row['Stock'] || row['Quantity'] || 0, 10);
                        
                        if (!className || !itemName) return null;

                        return {
                            school_id: schoolId,
                            Class: className,
                            "Book Name": itemName,
                            total_stock: totalUnitAdded,
                            remaining_stock: totalUnitAdded
                        };
                    }).filter(item => item !== null);

                    if (payload.length > 0) {
                        try {
                            for (let p of payload) {
                                const { data: existing } = await supabase.from('Stationery Details')
                                    .select('*')
                                    .eq('school_id', schoolId)
                                    .eq('Class', p.Class)
                                    .ilike('Book Name', p["Book Name"])
                                    .maybeSingle();
                                    
                                if (existing) {
                                    await supabase.from('Stationery Details').update({
                                        total_stock: (existing.total_stock ?? 0) + p.total_stock,
                                        remaining_stock: (existing.remaining_stock ?? 0) + p.remaining_stock
                                    }).eq('id', existing.id);
                                } else {
                                    const { error: insertErr } = await supabase.from('Stationery Details').insert([{
                                        school_id: p.school_id,
                                        "Sr No": Math.floor(Math.random() * 1000000000),
                                        Class: p.Class,
                                        "Book Name": p["Book Name"],
                                        total_stock: p.total_stock,
                                        remaining_stock: p.remaining_stock,
                                        Qty: 1,
                                        Rate: 0,
                                        Amount: 0
                                    }]);
                                    if (insertErr) throw new Error(insertErr.message);
                                }
                            }
                            showToast(`Successfully imported and mapped ${payload.length} item definitions globally!`, 'success');
                        } catch(error) {
                            showToast('Error gracefully executing bulk import: ' + error.message, 'error');
                        }
                    } else {
                        showToast("Could not recognize rows. Please ensure your CSV includes 'Class', 'Item name', and 'Total item'.", 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast("Critical parsing breakdown: " + err.message, 'error');
                }
                
                e.target.value = '';
                await loadInventory();
            };
            reader.readAsArrayBuffer(file);
        });
    }

    const exportBtn = document.getElementById('export-inventory-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const originalHtml = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating...';
            exportBtn.disabled = true;

            const schoolId = localStorage.getItem('selected_school_id');
            const { data: stockItems, error } = await supabase.from('Stationery Details')
                .select('Class, "Book Name", total_stock, remaining_stock')
                .eq('school_id', schoolId)
                .order('Class', { ascending: true });

            if (error) {
                showToast("Failed to fetch inventory for export: " + error.message, 'error');
                exportBtn.innerHTML = originalHtml;
                exportBtn.disabled = false;
                return;
            }

            if (!stockItems || stockItems.length === 0) {
                showToast("No inventory data found to export.", 'error');
                exportBtn.innerHTML = originalHtml;
                exportBtn.disabled = false;
                return;
            }

            try {
                const workbook = XLSX.utils.book_new();

                const allPossibleClasses = stockItems.map(item => String(item.Class || '').trim().toUpperCase() || 'UNKNOWN CLASS');
                const distinctClasses = [...new Set(allPossibleClasses)].sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));

                for (const grade of distinctClasses) {
                    const classItems = stockItems.filter(item => {
                        let c = String(item.Class || '').trim().toUpperCase() || 'UNKNOWN CLASS';
                        return c === grade;
                    });

                    if (classItems.length === 0) continue;

                    const excelData = classItems.map(item => ({
                        "Class": item.Class,
                        "Item Name": item['Book Name'],
                        "Total Items": item.total_stock ?? 0,
                        "Remaining Units": item.remaining_stock ?? 0
                    }));

                    const worksheet = XLSX.utils.json_to_sheet(excelData);
                    worksheet['!cols'] = [
                        { wch: 15 }, // Class
                        { wch: 40 }, // Item Name
                        { wch: 15 }, // Total Items
                        { wch: 18 }  // Remaining Units
                    ];

                    let safeSheetName = String(grade).replace(/[\\/*?:\[\]]/g, '').substring(0, 31);
                    if (!safeSheetName || safeSheetName.trim() === '') safeSheetName = "ClassData";

                    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
                }

                const timeStamp = new Date().toISOString().split('T')[0];
                XLSX.writeFile(workbook, `Granular_Inventory_Report_${timeStamp}.xlsx`);
            } catch (err) {
                console.error(err);
                showToast("Error automatically generating the spreadsheet.", 'error');
            }

            exportBtn.innerHTML = originalHtml;
            exportBtn.disabled = false;
        });
    }
}
