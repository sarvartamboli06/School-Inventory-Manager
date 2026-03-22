import { renderDashboard } from './views/dashboard.js?v=999';
import { renderSchools } from './views/schools.js?v=999';
import { renderBooks } from './views/books.js?v=999';
import { renderStudents } from './views/students.js?v=999';
import { renderInventory } from './views/inventory.js?v=999';
import { renderBilling } from './views/billing.js?v=999';
import { renderInvoices } from './views/invoices.js?v=999';

export const router = {
    routes: {
        '#/': renderDashboard,
        '#/schools': renderSchools,
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
        const routeHandler = this.routes[hash];
        const mainContent = document.getElementById('main-content');
        
        // Clear main content
        mainContent.innerHTML = '';
        
        if (routeHandler) {
            routeHandler(mainContent);
        } else {
            mainContent.innerHTML = `<div class="fade-in"><h1 class="page-title">404 Not Found</h1><p>The page you requested was not found.</p></div>`;
        }
    }
};
