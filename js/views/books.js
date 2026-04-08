import { supabase } from '../supabase.js';

export async function renderBooks(container) {
    container.innerHTML = `
        <div>
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Stationery Details (Books)</h1>
                    <p style="color: var(--text-muted);">Manage textbooks tailored for specific classes (Linked to legacy database).</p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <label style="font-size: 0.9rem; font-weight: 600;">Class Filter:</label>
                    <select id="class-filter" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none; background: white; font-weight: bold; color: var(--primary);">
                        <option value="ALL">All Classes</option>
                    </select>

                    <label class="btn btn-secondary" style="cursor: pointer;" title="Bulk import via Excel or CSV!">
                        <i class="ph ph-upload-simple"></i> Import CSV/Excel
                        <input type="file" id="bulk-books-input" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style="display: none;">
                    </label>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Book Name</th>
                            <th>Class (Grade Level)</th>
                            <th>Rate (Price)</th>
                            <th style="width: 120px;">System Ref</th>
                        </tr>
                    </thead>
                    <tbody id="books-tbody">
                        <tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">Loading books catalog...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Container -->
            <div id="pagination-container" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; padding-bottom: 24px;"></div>

        </div>
    `;

    await loadBooks();

    const bulkInput = document.getElementById('bulk-books-input');
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
                    const payload = jsonRows.map(row => {
                        const bookName = row['Book Name'] || row['Book'] || row['Name'] || '';
                        const className = row['Class'] || row['Grade'] || '';
                        const rate = parseFloat(row['Rate'] || row['Price'] || 0);

                        if (!bookName) return null;

                        return {
                            school_id: schoolId,
                            "Sr No": Math.floor(Math.random() * 1000000000),
                            "Book Name": String(bookName).trim(),
                            "Class": String(className).trim(),
                            "Rate": isNaN(rate) ? 0 : rate,
                            "Qty": 1,
                            "Amount": isNaN(rate) ? 0 : rate,
                            total_stock: 0,
                            remaining_stock: 0
                        };
                    }).filter(item => item !== null);

                    if (payload.length > 0) {
                        try {
                            const { error } = await supabase.from('Stationery Details').insert(payload);
                            if (error) {
                                window.showToast('Error executing bulk import: ' + error.message, 'error');
                            } else {
                                window.showToast(`Successfully imported ${payload.length} Stationery Details!`, 'success');
                            }
                        } catch(error) {
                            window.showToast('Error executing bulk import: ' + error.message, 'error');
                        }
                    } else {
                        window.showToast("Could not identify valid rows. Please ensure your CSV includes 'Book Name', 'Class', and 'Rate'.", 'error');
                    }
                } catch (err) {
                    console.error(err);
                    window.showToast("Critical parsing breakdown: " + err.message, 'error');
                }
                
                e.target.value = '';
                await loadBooks();
            };
            reader.readAsArrayBuffer(file);
        });
    }

    document.getElementById('class-filter').addEventListener('change', () => { currentPage = 1; renderTable(); });
}

let allBooks = [];
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

async function loadBooks() {
    const tbody = document.getElementById('books-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>';

    const schoolId = localStorage.getItem('selected_school_id');
    try {
        // Specifically querying the user's pre-existing legacy table
        const { data: books, error } = await supabase.from('Stationery Details').select('*').eq('school_id', schoolId);

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="color: #EF4444; padding: 24px; text-align:center;"><b>Database Error:</b> ${error.message}</td></tr>`;
            return;
        }

        allBooks = books || [];

        // Build Class Filter dynamically
        const classFilter = document.getElementById('class-filter');
        if (classFilter) {
            const currentSelection = classFilter.value;
            const uniqueClasses = [...new Set(allBooks.map(b => b['Class'] || 'N/A'))].filter(Boolean).sort();
            
            classFilter.innerHTML = '<option value="ALL">All Classes</option>' + 
                uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('');
            
            if (uniqueClasses.includes(currentSelection)) {
                classFilter.value = currentSelection;
            }
        }

        renderTable();

    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: #EF4444; padding: 24px; text-align:center;"><b>Critical Error:</b> Failed to load legacy table.</td></tr>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('books-tbody');
    const filterVal = document.getElementById('class-filter') ? document.getElementById('class-filter').value : 'ALL';
    
    const classOrder = {
        'NURSERY': 1, 'LKG': 2, 'UKG': 3,
        '1': 4, '1ST': 4, 'CLASS 1': 4, 'I': 4,
        '2': 5, '2ND': 5, 'CLASS 2': 5, 'II': 5,
        '3': 6, '3RD': 6, 'CLASS 3': 6, 'III': 6,
        '4': 7, '4TH': 7, 'CLASS 4': 7, 'IV': 7,
        '5': 8, '5TH': 8, 'CLASS 5': 8, 'V': 8,
        '6': 9, '6TH': 9, 'CLASS 6': 9, 'VI': 9,
        '7': 10, '7TH': 10, 'CLASS 7': 10, 'VII': 10,
        '8': 11, '8TH': 11, 'CLASS 8': 11, 'VIII': 11,
        '9': 12, '9TH': 12, 'CLASS 9': 12, 'IX': 12,
        '10': 13, '10TH': 13, 'CLASS 10': 13, 'X': 13,
        '11': 14, '11TH': 14, 'CLASS 11': 14, 'XI': 14,
        '12': 15, '12TH': 15, 'CLASS 12': 15, 'XII': 15
    };

    const getClassRank = (c) => classOrder[String(c).toUpperCase().trim()] || 99;

    let filtered = filterVal === 'ALL' ? [...allBooks] : allBooks.filter(b => (b.class || b.grade_level || b.Class || 'N/A') === filterVal);
    
    // Sort books automatically by class rank
    filtered.sort((a, b) => getClassRank(a.class || a.grade_level || a.Class) - getClassRank(b.class || b.grade_level || b.Class));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">No records found matching your current filter.</td></tr>';
        return;
    }

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tbody.innerHTML = paginated.map(b => `
        <tr>
            <td style="font-weight: 600; color: var(--primary);"><i class="ph ph-book-open" style="margin-right: 8px;"></i> ${b['Book Name'] || 'Unnamed'}</td>
            <td style="font-weight: 500;">${b['Class'] || 'N/A'}</td>
            <td style="font-weight: 700;">₹${Number(b['Rate'] || 0).toFixed(2)}</td>
            <td>
                <span style="color: var(--text-muted); font-size: 0.8rem; background: #F1F5F9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">ID: ${b.id}</span>
            </td>
        </tr>
    `).join('');

    renderPaginationControls(totalPages);
}
