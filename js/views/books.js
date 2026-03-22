import { supabase } from '../supabase.js';

export async function renderBooks(container) {
    container.innerHTML = `
        <div>
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Stationery Details (Books)</h1>
                    <p style="color: var(--text-muted);">Manage textbooks tailored for specific classes (Linked to legacy database).</p>
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
        </div>
    `;

    await loadBooks();
}

async function loadBooks() {
    const tbody = document.getElementById('books-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>';

    try {
        // Specifically querying the user's pre-existing legacy table
        const { data: books, error } = await supabase.from('Stationery Details').select('*');

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="color: #EF4444; padding: 24px; text-align:center;"><b>Database Error:</b> ${error.message}</td></tr>`;
            return;
        }

        if (!books || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">No records found in "Stationery Details".</td></tr>';
            return;
        }

        // Mapping to exact Column Keys discovered: "Book Name", "Class", "Rate"
        tbody.innerHTML = books.map(b => `
            <tr>
                <td style="font-weight: 600; color: var(--primary);"><i class="ph ph-book-open" style="margin-right: 8px;"></i> ${b['Book Name'] || 'Unnamed'}</td>
                <td style="font-weight: 500;">${b['Class'] || 'N/A'}</td>
                <td style="font-weight: 700;">$${Number(b['Rate'] || 0).toFixed(2)}</td>
                <td>
                    <span style="color: var(--text-muted); font-size: 0.8rem; background: #F1F5F9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">ID: ${b.id}</span>
                </td>
            </tr>
        `).join('');

    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: #EF4444; padding: 24px; text-align:center;"><b>Critical Error:</b> Failed to load legacy table.</td></tr>`;
    }
}
