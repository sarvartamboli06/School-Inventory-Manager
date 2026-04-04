import { supabase } from '../supabase.js';

export async function renderDashboard(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h1 class="page-title" style="margin-bottom:0;">Dashboard</h1>
                <button class="btn btn-primary" onclick="window.location.hash='#/billing'"><i class="ph ph-receipt"></i> New POS Transaction</button>
            </div>
            
            <div id="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
                <div class="card"><div style="text-align:center; padding: 20px;"><i class="ph ph-spinner ph-spin"></i> Loading metrics...</div></div>
            </div>

            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 16px;">Recent Transactions</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Student</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="dashboard-txs">
                        <tr><td colspan="5" style="text-align:center; padding: 20px;">Fetching recent invoices...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadDashboardStats();
    await loadRecentTransactions();
}

async function loadDashboardStats() {
    const statsContainer = document.getElementById('dashboard-stats');
    
    // Run all fetches in parallel
    const schoolId = localStorage.getItem('selected_school_id');
    const [
        { count: studentCount, error: e1 },
        { data: invoices, error: e3 }
    ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('invoices').select('id, total_amount, status, created_at, students(first_name, last_name, grade_section)').eq('school_id', schoolId)
    ]);

    if(e1 || e3) {
        statsContainer.innerHTML = `<div style="color:red;">Error loading stats. Check database connection.</div>`;
        return;
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    
    // Total Revenue represents all historical PAID or RETURNED/UPDATED (captures residual/net payments cleanly)
    const totalRevenue = invoices.filter(inv => {
        return (inv.status && inv.status.startsWith('PAID')) || inv.status === 'RETURNED' || inv.status === 'UPDATED';
    }).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    const pendingCount = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'UNPAID').length;

    // Today's Revenue and strict Excel Payload mapping tightly
    const todaysInvoices = invoices.filter(inv => {
        if (!(inv.status && inv.status.startsWith('PAID')) && inv.status !== 'UPDATED' && inv.status !== 'RETURNED') return false;
        const invDate = new Date(inv.created_at).toLocaleDateString('en-CA');
        return invDate === todayStr;
    });

    const todayRevenue = todaysInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    statsContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <span class="card-title">Total Revenue</span>
                <div class="icon-btn" style="color: var(--secondary); border:none; background: #DCFCE7;"><i class="ph ph-currency-dollar"></i></div>
            </div>
            <h2 style="font-size: 2rem; margin-bottom: 8px;">₹${totalRevenue.toFixed(2)}</h2>
            <p style="color: var(--secondary); font-size: 0.85rem; font-weight: 500;">Lifetime sales</p>
        </div>
        
        <div class="card" style="border: 1px solid #E0E7FF;">
            <div class="card-header">
                <span class="card-title">Today's Revenue</span>
                <button id="dash-export-today-btn" class="icon-btn" style="color: var(--primary); border:none; background: #E0E7FF; cursor: pointer; transition: 0.2s;" title="Download Today's Excel">
                    <i class="ph ph-download-simple"></i>
                </button>
            </div>
            <h2 style="font-size: 2rem; margin-bottom: 8px; color: var(--primary);">₹${todayRevenue.toFixed(2)}</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500;">Sales made today</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <span class="card-title">Active Students</span>
                <div class="icon-btn" style="color: #8B5CF6; border:none; background: #EDE9FE;"><i class="ph ph-users"></i></div>
            </div>
            <h2 style="font-size: 2rem; margin-bottom: 8px;">${studentCount || 0}</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500;">Enrolled profiles</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <span class="card-title">Pending Invoices</span>
                <div class="icon-btn" style="color: #EF4444; border:none; background: #FEE2E2;"><i class="ph ph-receipt"></i></div>
            </div>
            <h2 style="font-size: 2rem; margin-bottom: 8px;">${pendingCount}</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500;">Awaiting payment</p>
        </div>
    `;

    const dlBtn = document.getElementById('dash-export-today-btn');
    if (dlBtn) {
        dlBtn.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
            btn.disabled = true;

            try {
                if (todaysInvoices.length === 0) {
                    alert("No sales recorded today to export.");
                } else {
                    const m = await import('./invoices.js?v=2000');
                    await m.generateExcelForInvoices(todaysInvoices);
                }
            } catch (err) {
                console.error(err);
                alert("Error exporting: " + err.message);
            }

            btn.innerHTML = originalHtml;
            btn.disabled = false;
        });
    }
}

async function loadRecentTransactions() {
    const schoolId = localStorage.getItem('selected_school_id');
    const tbody = document.getElementById('dashboard-txs');
    const { data: invoices, error } = await supabase.from('invoices').select('*, students(first_name, last_name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">No recent transactions.</td></tr>`;
        return;
    }

    tbody.innerHTML = invoices.map(inv => `
        <tr>
            <td style="font-weight: 500; font-family: monospace;">#TRX-${inv.id.split('-')[0].toUpperCase()}</td>
            <td>${inv.students ? inv.students.first_name + ' ' + inv.students.last_name : 'Guest/Deleted'}</td>
            <td>${new Date(inv.created_at).toLocaleDateString()}</td>
            <td style="font-weight: 600;">₹${Number(inv.total_amount).toFixed(2)}</td>
            <td><span class="status-badge ${inv.status === 'PAID' ? 'status-success' : 'status-warning'}">${inv.status}</span></td>
        </tr>
    `).join('');
}
