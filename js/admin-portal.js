import { supabaseUrl, supabaseAnonKey, supabase } from './supabase.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// The Secret! A secondary Supabase client that uses explicitly NO STORAGE.
// This allows the Master Admin to mint new accounts under the hood without accidentally destroying their own master session!
const supabaseStateless = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

document.addEventListener('DOMContentLoaded', async () => {
    const authGate = document.getElementById('admin-auth-gate');
    const consoleWrapper = document.getElementById('admin-console-wrapper');
    
    // ----------------------------------------------------
    // SUPER ADMIN SESSION GUARD & GATE KEEPER
    // ----------------------------------------------------
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if genuinely the master admin
    if (session && session.user.email === 'admin@school.com') {
        authGate.style.display = 'none';
        consoleWrapper.style.display = 'flex';
        loadDashboard();
    } else {
        // If not logged in cleanly as admin, securely mount the Authentication Gate
        if (session) await supabase.auth.signOut(); // Boot them out explicitly if they hold lesser tokens
        authGate.style.display = 'block';
        consoleWrapper.style.display = 'none';
    }

    // Process Gate Submissions
    const gateForm = document.getElementById('admin-gate-form');
    const gateBtn = document.getElementById('gate-btn');
    const gateError = document.getElementById('gate-error');

    gateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        gateError.innerText = '';
        gateBtn.disabled = true;
        gateBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Unlocking...';

        const email = document.getElementById('gate-email').value.toLowerCase().trim();
        const password = document.getElementById('gate-pass').value;

        if (email !== 'admin@school.com') {
            gateError.innerText = "ACCESS DENIED: Unauthorized ID structure.";
            gateBtn.disabled = false; gateBtn.innerHTML = 'Unlock Console'; return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            gateError.innerText = "Invalid Master Credentials.";
            gateBtn.disabled = false; gateBtn.innerHTML = 'Unlock Console';
        } else {
            // Successfully Authenticated! Boot the physical Master Dashboard
            authGate.style.display = 'none';
            consoleWrapper.style.display = 'flex';
            loadDashboard();
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    // ----------------------------------------------------
    // DASHBOARD METRICS RENDERER (NATIVE RLS BYPASS)
    // ----------------------------------------------------
    async function loadDashboard() {
        const loading = document.getElementById('stats-loading');
        const container = document.getElementById('stats-container');
        
        loading.style.display = 'flex';
        container.style.display = 'none';

        try {
            // Because we violently removed the leaky "Global Bypass", we now securely ping our targeted Backend Function (RPC) 
            // which pulls the metrics natively through database memory exclusively for the Master Admin!
            const { data: metrics, error } = await supabase.rpc('get_admin_dashboard_metrics');
            if (error) throw error;
            
            const roles = metrics.roles;
            const schools = metrics.schools;
            const students = metrics.students;
            const inventory = metrics.inventory;

            // Architecture Metrics Maps
            const studentsPerSchool = {};
            const itemsPerSchool = {};
            
            (students || []).forEach(st => {
                studentsPerSchool[st.school_id] = (studentsPerSchool[st.school_id] || 0) + 1;
            });
            
            (inventory || []).forEach(inv => {
                // For inventory, we can count literal items (rows) or summing remaining_stock. The requirements asked for "no of inventory item." 
                // We will count Unique Items in the database table identically.
                itemsPerSchool[inv.school_id] = (itemsPerSchool[inv.school_id] || 0) + 1;
            });

            // Grouping logic
            const suppliers = roles.filter(r => r.role === 'SUPPLIER');
            const schoolsMapped = {}; // supplier_id => array of schools
            const independentSchools = []; // Schools with no supplier

            (schools || []).forEach(s => {
                if (s.supplier_id) {
                    if (!schoolsMapped[s.supplier_id]) schoolsMapped[s.supplier_id] = [];
                    schoolsMapped[s.supplier_id].push(s);
                } else {
                    independentSchools.push(s);
                }
            });

            // HTML Renderer Method
            let htmlChunks = [];

            const renderSchoolRow = (sch) => `
                <div class="sub-school">
                    <div>
                        <h4 style="margin: 0; font-size: 1rem; color: var(--text-main);"><i class="ph ph-buildings" style="color: var(--text-muted); margin-right: 4px;"></i> ${sch.school_name}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Database UUID: ${sch.id.substring(0,8)}...</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span class="stat-badge" style="background:#EEF2FF; color:#4F46E5;"><i class="ph ph-student"></i> ${studentsPerSchool[sch.id] || 0}</span>
                        <span class="stat-badge" style="background:#FFF1F2; color:#E11D48;"><i class="ph ph-package"></i> ${itemsPerSchool[sch.id] || 0}</span>
                    </div>
                </div>
            `;

            // Block 1: Master Suppliers & Their Inherited Schools
            suppliers.forEach(sup => {
                const mySchools = schoolsMapped[sup.user_id] || [];
                htmlChunks.push(`
                    <div class="supplier-block">
                        <div class="supplier-header">
                            <div style="background: var(--primary); width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                                <i class="ph ph-briefcase" style="font-size: 1.25rem;"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1.1rem; color: #1E293B;">Supplier Operations</h3>
                                <p style="margin: 0; font-size: 0.85rem; color: #64748B;">Registered Email: <b>${sup.email}</b></p>
                            </div>
                            <span class="stat-badge" style="margin-left: auto; background:#F1F5F9; color:#475569;">${mySchools.length} Owned Schools</span>
                        </div>
                        ${mySchools.length === 0 ? '<div style="font-size: 0.85rem; color: #94A3B8; text-align: center; padding: 12px; font-style: italic;">No schools provisioned yet.</div>' : mySchools.map(renderSchoolRow).join('')}
                    </div>
                `);
            });

            // Block 2: Independent Non-Supplier Mapped Schools
            if (independentSchools.length > 0) {
                htmlChunks.push(`
                    <div class="supplier-block" style="border-color: #38BDF8;">
                        <div class="supplier-header">
                            <div style="background: #0EA5E9; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                                <i class="ph ph-chalkboard-teacher" style="font-size: 1.25rem;"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1.1rem; color: #0C4A6E;">Strictly Independent Schools</h3>
                                <p style="margin: 0; font-size: 0.85rem; color: #0284C7;">Platform native accounts mapped explicitly with zero Supplier oversight.</p>
                            </div>
                            <span class="stat-badge" style="margin-left: auto; background:#E0F2FE; color:#0369A1;">${independentSchools.length} Independent</span>
                        </div>
                        ${independentSchools.map(renderSchoolRow).join('')}
                    </div>
                `);
            }

            container.innerHTML = htmlChunks.join('');
            loading.style.display = 'none';
            container.style.display = 'flex';

        } catch (fatalErr) {
            loading.innerHTML = `<div style="color: #EF4444;"><i class="ph ph-warning-circle" style="font-size: 2rem; margin-bottom: 8px;"></i><br>Dashboard Aggregation Error: ${fatalErr.message}</div>`;
        }
    }

    // ----------------------------------------------------
    // DYNAMIC FORM LOGIC
    // ----------------------------------------------------
    const roleRadios = document.getElementsByName('role');
    const schoolNameContainer = document.getElementById('school-name-container');
    const schoolNameInput = document.getElementById('admin-schoolname');

    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'SCHOOL') {
                schoolNameContainer.style.display = 'block';
                schoolNameInput.required = true;
            } else {
                schoolNameContainer.style.display = 'none';
                schoolNameInput.required = false;
                schoolNameInput.value = '';
            }
        });
    });

    const form = document.getElementById('admin-signup-form');
    const errorNode = document.getElementById('admin-error');
    const successNode = document.getElementById('admin-success');
    const btn = document.getElementById('admin-signup-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorNode.innerText = '';
        successNode.innerText = '';
        btn.disabled = true;
        btn.innerHTML = 'Minting Secure Account...';

        const email = document.getElementById('admin-email').value.toLowerCase().trim();
        const pass = document.getElementById('admin-pass').value;
        const confirm = document.getElementById('admin-confirm').value;
        const name = document.getElementById('admin-name').value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value;

        // Validations
        if (pass.length < 6) { 
            errorNode.innerText = 'Validation Error: Password must be significantly stronger (min 6 characters).'; 
            btn.disabled = false; btn.innerHTML = 'Mint Multi-Tenant Account'; return; 
        }
        if (pass !== confirm) { 
            errorNode.innerText = 'Validation Error: Passwords lack geometric parity (they do not match).'; 
            btn.disabled = false; btn.innerHTML = 'Mint Multi-Tenant Account'; return; 
        }

        // USING THE STATELESS SUB-CLIENT!!
        const { data, error } = await supabaseStateless.auth.signUp({
            email: email,
            password: pass,
            options: {
                data: {
                    full_name: name,
                    requested_role: role,
                    school_name: role === 'SCHOOL' ? schoolNameInput.value.trim() : null
                }
            }
        });

        if (error) {
            errorNode.innerText = "Fatal Minting Failure: " + error.message;
        } else {
            successNode.innerText = `Account beautifully minted! The user mapped to '${email}' can now seamlessly log in natively!`;
            form.reset();
            schoolNameContainer.style.display = 'none';
            
            // Instantly refresh the right-panel Dashboard to vividly show the newly minted data without refreshing!
            loadDashboard();
        }
        
        btn.disabled = false;
        btn.innerHTML = 'Mint Multi-Tenant Account';
    });
});
