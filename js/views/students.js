import { supabase } from '../supabase.js';

export async function renderStudents(container) {
    container.innerHTML = `
        <div>
            <div class="page-header">
                <div>
                    <h1 class="page-title" style="margin-bottom: 4px;">Students Directory</h1>
                    <p style="color: var(--text-muted);">Manage student profiles and billing history.</p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <label class="btn btn-secondary" style="cursor: pointer;" title="Bulk import via Excel or CSV!">
                        <i class="ph ph-upload-simple"></i> Bulk CSV/Excel
                        <input type="file" id="bulk-upload-input" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style="display: none;">
                    </label>
                    <button class="btn btn-primary" id="add-student-btn"><i class="ph ph-user-plus"></i> Add Manually</button>
                </div>
            </div>

            <div class="table-container">
                <table style="min-width: 800px;">
                    <thead>
                        <tr>
                            <th>Student Profile</th>
                            <th>ID / Roll No.</th>
                            <th>Class (Grade)</th>
                            <th>Parent Contact</th>
                            <th>Balance Due</th>
                            <th style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="student-tbody">
                        <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading students from database...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal for Adding Student -->
            <div id="add-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div class="card fade-in" style="width: 100%; max-width: 500px; padding: 32px; box-shadow: var(--shadow-lg);">
                    <h2 style="margin-bottom: 24px;">Add New Student</h2>
                    <form id="add-student-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; gap: 16px;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">First Name</label>
                                <input type="text" id="add-fn" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Last Name</label>
                                <input type="text" id="add-ln" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                            </div>
                        </div>
                        <input type="hidden" id="add-school-manual">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Class</label>
                            <input type="text" id="add-grade" placeholder="e.g. Class 10" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Parent Contact (Email or Phone)</label>
                            <input type="text" id="add-contact" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;">
                            <button type="button" class="btn btn-ghost" id="close-modal-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-btn">Save Student</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    let allStudents = [];
    const schoolId = localStorage.getItem('selected_school_id');
    const schoolNameStr = localStorage.getItem('selected_school_name') || 'Main Campus';

    await loadStudents();

    const modal = document.getElementById('add-modal');
    document.getElementById('add-student-btn').addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => { 
        modal.style.display = 'none'; 
        document.getElementById('add-student-form').reset(); 
    });

    // Handle Manual Add
    document.getElementById('add-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        const payload = {
            school_id: schoolId,
            school_name: schoolNameStr,
            first_name: document.getElementById('add-fn').value,
            last_name: document.getElementById('add-ln').value,
            grade_section: document.getElementById('add-grade').value,
            parent_contact: document.getElementById('add-contact').value,
            balance_due: 0.00
        };

        const { error } = await supabase.from('students').insert([payload]);
        if (error) {
            alert('Error adding student: ' + error.message);
        } else {
            modal.style.display = 'none';
            document.getElementById('add-student-form').reset();
            await loadStudents();
        }
        btn.innerHTML = 'Save Student';
        btn.disabled = false;
    });

    // Handle Excel/CSV Bulk Upload
    document.getElementById('bulk-upload-input').addEventListener('change', async (e) => {
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

                // Map literal strings dynamically from CSV Headers
                const payload = jsonRows.map(row => {
                    const fullName = row['Student Name'] || row['Name'] || row['student_name'] || row['Student'] || '';
                    const nameParts = fullName.split(' ');
                    const firstName = nameParts[0] || 'Unknown';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    const grade = row['Class'] || row['class'] || row['Grade'] || 'Unknown';
                    const contact = String(row['Contact'] || row['Parent Contact'] || row['Email'] || 'Imported via CSV');
                    
                    return {
                        school_id: schoolId,
                        school_name: schoolNameStr,
                        first_name: firstName,
                        last_name: lastName,
                        grade_section: String(grade).trim(),
                        parent_contact: contact,
                        balance_due: 0.00
                    };
                }).filter(item => item.first_name !== 'Unknown');

                if (payload.length > 0) {
                    const tbody = document.getElementById('student-tbody');
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--primary);"><b><i class="ph ph-spinner ph-spin"></i> Binding ${payload.length} students to ${schoolNameStr}...</b></td></tr>`;
                    
                    // Upload chunks to avoid huge payload drops
                    const { error } = await supabase.from('students').insert(payload);
                    if (error) {
                        window.showToast('Error executing bulk upload: ' + error.message, 'error');
                    } else {
                        window.showToast(`Successfully imported ${payload.length} students natively to ${schoolNameStr}!`, 'success');
                    }
                } else {
                    window.showToast("Could not identify valid student rows in the spreadsheet. Please ensure you have columns like 'Student Name' and 'Class'.", 'error');
                }
            } catch (err) {
                console.error(err);
                window.showToast("Critical error parsing spreadsheet: " + err.message, 'error');
            }
            
            // Clean up UI
            e.target.value = '';
            await loadStudents();
        };
        reader.readAsArrayBuffer(file);
    });

    async function loadStudents() {
        const tbody = document.getElementById('student-tbody');
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i></td></tr>`;

        try {
            const { data: students, error } = await supabase.from('students').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });

            if (error) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #EF4444;"><b>Error connecting to database:</b> <br>${error.message}</td></tr>`;
                return;
            }

            allStudents = students || [];
            renderTable();

        } catch(err) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #EF4444;"><b>Critical Error:</b> Could not fetch database constraints.</td></tr>`;
        }
    }

    function renderTable() {
        const tbody = document.getElementById('student-tbody');
        const filtered = allStudents;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">No students found in the database matching this criteria. You can Bulk Upload now!</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td style="font-weight: 500;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.first_name + ' ' + s.last_name)}&background=4F46E5&color=fff" style="width: 32px; height: 32px; border-radius: 50%;">
                        <div>
                            <span>${s.first_name} ${s.last_name}</span><br>
                        </div>
                    </div>
                </td>
                <td style="font-family: monospace; color: var(--text-muted);">${s.id.split('-')[0].toUpperCase()}</td>
                <td style="font-weight: 600;">${s.grade_section}</td>
                <td>${s.parent_contact || 'N/A'}</td>
                <td><span class="status-badge ${s.balance_due > 0 ? 'status-warning' : 'status-success'}">₹${Number(s.balance_due || 0).toFixed(2)}</span></td>
                <td>
                    <button class="icon-btn delete-btn" data-id="${s.id}" style="padding: 6px; font-size: 1.1rem; color: #EF4444; border:none; background: transparent;"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                e.currentTarget.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
                
                const { error } = await supabase.from('students').delete().eq('id', id);
                if (error) {
                    alert('System Error preventing deletion: ' + error.message);
                    e.currentTarget.innerHTML = '<i class="ph ph-trash"></i>';
                } else {
                    await loadStudents();
                }
            });
        });
    }
}
