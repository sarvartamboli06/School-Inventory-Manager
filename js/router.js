import { renderDashboard } from './views/dashboard.js?v=1001';
import { renderBooks } from './views/books.js?v=1001';
import { renderStudents } from './views/students.js?v=1001';
import { renderInventory } from './views/inventory.js?v=1001';
import { renderBilling } from './views/billing.js?v=1001';
import { renderInvoices } from './views/invoices.js?v=1001';

export const router = {
    routes: {
        '#/': renderDashboard,
        '#/books': renderBooks,
        '#/students': renderStudents,
        '#/inventory': renderInventory,
        '#/billing': renderBilling,
        '#/invoices': renderInvoices
    },
    
    init() {
        // Run on hash change
        window.addEventListener('hashchange', () => this.handleRoute());
        // Run on initial load
        this.handleRoute();
    },
    
    handleRoute() {
        const hash = window.location.hash || '#/';
        const mainContent = document.getElementById('main-content');
        
        // --- MULTI-SCHOOL GUARD ---
        if (!localStorage.getItem('selected_school_id')) {
            window.location.href = 'select-school.html';
            return;
        }
        
        // Ensure sidebar shows active school
        const schoolNameDisp = document.getElementById('active-school-display');
        if (!schoolNameDisp && document.querySelector('.sidebar-header')) {
            const header = document.querySelector('.sidebar-header');
            header.insertAdjacentHTML('beforeend', `<div id="active-school-display" style="font-size:0.75rem; color:var(--primary); background:#EEF2FF; padding:4px 8px; border-radius:4px; margin-top:8px; display:inline-block; font-weight:600;"></div>`);
        }
        if (document.getElementById('active-school-display')) {
            const sn = localStorage.getItem('selected_school_name');
            document.getElementById('active-school-display').style.display = sn ? 'inline-block' : 'none';
            document.getElementById('active-school-display').innerText = sn ? '🏢 ' + sn : '';
        }

        const routeHandler = this.routes[hash];
        
        // Clear main content
        mainContent.innerHTML = '';
        
        if (routeHandler) {
            routeHandler(mainContent);
        } else {
            mainContent.innerHTML = `<div class="fade-in"><h1 class="page-title">404 Not Found</h1><p>The page you requested was not found.</p></div>`;
        }
    }
};
