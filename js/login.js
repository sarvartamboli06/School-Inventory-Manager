import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Session Guard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        if (localStorage.getItem('user_role') === 'SCHOOL') {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'select-school.html';
        }
        return;
    }

    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const formLogin = document.getElementById('login-form');

    // Core Routing Sequence Function
    const routeUser = async (userEmail) => {
        const { data: roleData, error: roleErr } = await supabase.from('user_roles').select('*').eq('email', userEmail).maybeSingle();
        
        if (roleErr) console.error("Role lookup error:", roleErr);

        if (roleData && roleData.role === 'SUPPLIER') {
            localStorage.setItem('user_role', 'SUPPLIER');
            window.location.href = 'select-school.html';
        } else if (roleData && roleData.role === 'SCHOOL') {
            if (!roleData.school_id) {
                await supabase.auth.signOut();
                return "Configuration Error: Your School account exists but is not linked to a specific School ID in the database. Please contact your master supplier.";
            }
            
            const { data: sData } = await supabase.from('schools').select('school_name').eq('id', roleData.school_id).maybeSingle();
            
            localStorage.setItem('selected_school_id', roleData.school_id);
            localStorage.setItem('selected_school_name', sData ? sData.school_name : 'Unknown School');
            localStorage.setItem('user_role', 'SCHOOL');
            window.location.href = 'index.html';
            return null;
        } else {
            await supabase.auth.signOut();
            return "Access Denied: Your account role is strictly unassigned. Please contact your administrator.";
        }
    };

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 🚨 CRITICAL FIX: Wipe all legacy caches immediately when attempting a new sign in!
        localStorage.clear();

        errorMsg.innerText = '';
        loginBtn.innerHTML = 'Signing in...';
        loginBtn.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value,
        });

        if (error) {
            errorMsg.innerText = error.message;
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        } else {
            const email = (data.user?.email || data.session?.user?.email || emailInput.value).toLowerCase().trim();
            const routingError = await routeUser(email);
            if (routingError) {
                errorMsg.innerText = routingError;
                loginBtn.innerHTML = 'Sign In';
                loginBtn.disabled = false;
            }
        }
    });
});
