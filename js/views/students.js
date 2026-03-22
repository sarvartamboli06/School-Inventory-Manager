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
                    <select id="global-school-select" style="padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none; font-weight: bold; color: var(--primary);">
                        <option value="">-- All Schools --</option>
                    </select>
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
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">School Name (Literal)</label>
                            <input type="text" id="add-school-manual" placeholder="e.g. Springfield High" required style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); outline: none;">
                        </div>
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

    // Fetch and populate Top Level School Dropdown with Literal Names
    let allStudents = [];
    const schoolSelect = document.getElementById('global-school-select');
    
    const { data: schools } = await supabase.from('schools').select('school_name');
    if (schools) {
        // Dedup names natively
        const uniqueNames = [...new Set(schools.map(s => s.school_name))];
        schoolSelect.innerHTML += uniqueNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }

    // Filter Trigger
    schoolSelect.addEventListener('change', () => { renderTable(); });

    await loadStudents();

    const modal = document.getElementById('add-modal');
    document.getElementById('add-student-btn').addEventListener('click', () => {
        document.getElementById('add-school-manual').value = schoolSelect.value || '';
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
            school_name: document.getElementById('add-school-manual').value.trim(),
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
        const fallbackSchoolName = schoolSelect.value || 'Unassigned School';

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
                    const contact = row['Contact'] || row['Parent Contact'] || row['Email'] || 'Imported via CSV';
                    const csvSchoolName = row['School'] || row['School Name'] || row['school_name'] || fallbackSchoolName;
                    
                    return {
                        school_name: String(csvSchoolName).trim(),
                        first_name: firstName,
                        last_name: lastName,
                        grade_section: String(grade).trim(),
                        parent_contact: contact,
                        balance_due: 0.00
                    };
                }).filter(item => item.first_name !== 'Unknown');

                if (payload.length > 0) {
                    const tbody = document.getElementById('student-tbody');
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--primary);"><b><i class="ph ph-spinner ph-spin"></i> Binding ${payload.length} students to database...</b></td></tr>`;
                    
                    // Upload chunks to avoid huge payload drops
                    const { error } = await supabase.from('students').insert(payload);
                    if (error) {
                        alert('Error executing bulk upload: ' + error.message);
                    } else {
                        alert(`Successfully imported ${payload.length} students natively!`);
                    }
                } else {
                    alert("Could not identify valid student rows in the spreadsheet. Please ensure you have columns like 'Student Name' and 'Class'.");
                }
            } catch (err) {
                console.error(err);
                alert("Critical error parsing spreadsheet: " + err.message);
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
            // Because school_name is now flat, we don't need expensive relational joints!
            const { data: students, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });

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
        const filterVal = schoolSelect.value;
        const filtered = filterVal ? allStudents.filter(s => s.school_name === filterVal) : allStudents;

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
                            <small style="color: var(--primary); font-weight: bold;"><i class="ph ph-buildings"></i> ${s.school_name || 'No School Recorded'}</small>
                        </div>
                    </div>
                </td>
                <td style="font-family: monospace; color: var(--text-muted);">${s.id.split('-')[0].toUpperCase()}</td>
                <td style="font-weight: 600;">${s.grade_section}</td>
                <td>${s.parent_contact || 'N/A'}</td>
                <td><span class="status-badge ${s.balance_due > 0 ? 'status-warning' : 'status-success'}">$${Number(s.balance_due).toFixed(2)}</span></td>
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
