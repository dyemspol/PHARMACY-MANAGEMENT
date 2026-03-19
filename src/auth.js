// Authentication Utility for DavaoDeOro Pharmacy System

(function() {
    const AUTH_KEY = 'pharmacy_session';
    const USERS_KEY = 'pharmacy_users';

    // Initialize default admin user if no users exist
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([
            { 
                username: 'admin', 
                password: 'admin123', 
                role: 'admin', 
                name: 'Administrator',
                createdAt: new Date().toISOString()
            }
        ]));
    }

    function getUsers() {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    window.auth = {
        getUsers,
        saveUsers,
        
        login(username, password) {
            const users = getUsers();
            const user = users.find(u => u.username === username && u.password === password);
            
            if (user) {
                const sessionData = {
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    loginTime: new Date().getTime()
                };
                localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
                return true;
            }
            return false;
        },

        logout() {
            localStorage.removeItem(AUTH_KEY);
            window.location.href = 'login.html';
        },

        isAuthenticated() {
            return !!localStorage.getItem(AUTH_KEY);
        },

        getCurrentUser() {
            const session = localStorage.getItem(AUTH_KEY);
            return session ? JSON.parse(session) : null;
        },

        checkAuth() {
            const user = this.getCurrentUser();
            const isLoginPage = window.location.pathname.endsWith('login.html');

            if (!user && !isLoginPage) {
                window.location.href = 'login.html';
            } else if (user && isLoginPage) {
                // Land employees on POS Terminal, admins on Dashboard
                window.location.href = user.role === 'admin' ? 'index.html' : 'POST_terminal.html';
            } else if (user && user.role === 'employee') {
                // Restrict access to admin-only pages
                const restrictedPages = ['index.html', 'inventory.html', 'accounts.html'];
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                
                if (restrictedPages.includes(currentPage)) {
                    window.location.href = 'POST_terminal.html';
                }
            }
        }
    };

    // Run auth check immediately
    window.auth.checkAuth();
})();
