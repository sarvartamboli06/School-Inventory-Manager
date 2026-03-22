import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.innerText = '';
        errorMsg.style.color = '#EF4444';

        const emailVal = emailInput.value.trim().toLowerCase();
        const passVal = passwordInput.value.trim();

        // --- HARDCODED ADMIN FALLBACK ---
        if (emailVal === 'admin@school.com' && passVal === 'admin123') {
            localStorage.setItem('admin_session', 'true');
            window.location.href = 'index.html';
            return;
        }
        // --------------------------------

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
            window.location.href = 'index.html';
        }
    });

    // Signup functionality has been removed. Access is only intended for the Admin.
});
