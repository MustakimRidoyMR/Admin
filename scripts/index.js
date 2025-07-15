       // Enhanced Admin State Management
        class AdminState {
            constructor() {
                this.admin = null;
                this.isAdminMode = false;
                this.adminCode = "ADMIN2024"; // Default admin registration code
                this.adminCredentials = {}; // Store admin credentials
            }
            
            saveAdminState() {
                localStorage.setItem('adminState', JSON.stringify({
                    admin: this.admin,
                    isAdminMode: this.isAdminMode
                }));
            }
            
            loadAdminState() {
                const state = localStorage.getItem('adminState');
                if (state) {
                    const parsed = JSON.parse(state);
                    this.admin = parsed.admin;
                    this.isAdminMode = parsed.isAdminMode;
                    return true;
                }
                return false;
            }
            
            registerAdmin(name, email, password, adminCode) {
                if (adminCode !== this.adminCode) {
                    return { success: false, message: "Invalid admin registration code" };
                }
                
                // Generate a simple admin ID
                const adminId = btoa(email + Date.now()).substring(0, 30);
                
                this.adminCredentials[adminId] = {
                    name,
                    email,
                    password: this.hashPassword(password),
                    registeredAt: new Date().toISOString(),
                    lastLogin: null,
                    permissions: ["user_management", "system_settings", "analytics", "security"]
                };
                
                this.admin = {
                    id: adminId,
                    name,
                    email,
                    permissions: ["user_management", "system_settings", "analytics", "security"]
                };
                
                this.isAdminMode = true;
                this.saveAdminState();
                return { success: true, message: "Admin registration successful" };
            }
            
            loginAdmin(email, password) {
                // Find admin by email
                const adminId = Object.keys(this.adminCredentials).find(
                    id => this.adminCredentials[id].email === email
                );
                
                if (!adminId) {
                    return { success: false, message: "Admin not found" };
                }
                
                // Verify password
                if (this.adminCredentials[adminId].password !== this.hashPassword(password)) {
                    return { success: false, message: "Invalid password" };
                }
                
                // Update last login
                this.adminCredentials[adminId].lastLogin = new Date().toISOString();
                
                this.admin = {
                    id: adminId,
                    name: this.adminCredentials[adminId].name,
                    email,
                    permissions: this.adminCredentials[adminId].permissions
                };
                
                this.isAdminMode = true;
                this.saveAdminState();
                return { success: true, message: "Admin login successful" };
            }
            
            logout() {
                this.admin = null;
                this.isAdminMode = false;
                this.saveAdminState();
            }
            
            hashPassword(password) {
                // Simple hash for demo purposes
                return btoa(password + this.adminCode);
            }
            
            hasPermission(permission) {
                return this.admin && this.admin.permissions.includes(permission);
            }
        }
        
        // Initialize Admin State
        const adminState = new AdminState();
        adminState.loadAdminState();
        
        // Enhanced Admin UI Functions
        function showAdminModal(modalId) {
            document.getElementById(modalId).classList.remove('hidden');
        }
        
        function hideAdminModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
        }
        
        function hideAdminCustomAlert() {
            document.getElementById('adminCustomAlert').classList.add('hidden');
        }
        
        function showAdminCustomAlert(message, type = 'info') {
            const alertIcon = document.getElementById('adminAlertIcon');
            const alertMessage = document.getElementById('adminAlertMessage');
            
            alertMessage.textContent = message;
            
            switch(type) {
                case 'success':
                    alertIcon.className = 'fas fa-check-circle text-5xl mb-4 text-green-400';
                    break;
                case 'error':
                    alertIcon.className = 'fas fa-exclamation-circle text-5xl mb-4 text-red-400';
                    break;
                case 'warning':
                    alertIcon.className = 'fas fa-exclamation-triangle text-5xl mb-4 text-yellow-400';
                    break;
                default:
                    alertIcon.className = 'fas fa-info-circle text-5xl mb-4 text-blue-400';
            }
            
            document.getElementById('adminCustomAlert').classList.remove('hidden');
        }
        
        // Admin Registration Form Handler
        document.getElementById('adminRegistrationForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('adminName').value.trim();
            const email = document.getElementById('adminEmail').value.trim().toLowerCase();
            const password = document.getElementById('adminPassword').value;
            const adminCode = document.getElementById('adminCode').value;
            
            // Validate inputs
            if (name.length < 2) {
                showAdminCustomAlert('Name must be at least 2 characters long', 'error');
                return;
            }
            
            if (!email.includes('@') || !email.includes('.')) {
                showAdminCustomAlert('Please enter a valid email address', 'error');
                return;
            }
            
            if (password.length < 8) {
                showAdminCustomAlert('Password must be at least 8 characters long', 'error');
                return;
            }
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="spinner"></div>Processing...';
            submitBtn.disabled = true;
            
            // Register admin
            const result = adminState.registerAdmin(name, email, password, adminCode);
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                if (result.success) {
                    showAdminCustomAlert(result.message, 'success');
                    hideAdminModal('adminRegistrationModal');
                    showAdminCustomAlert('Admin registration successful! You can now login.', 'success');
                } else {
                    showAdminCustomAlert(result.message, 'error');
                }
            }, 1500);
        });
        
        // Admin Login Form Handler
        document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginAdminEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginAdminPassword').value;
            
            // Validate inputs
            if (!email.includes('@') || !email.includes('.')) {
                showAdminCustomAlert('Please enter a valid email address', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAdminCustomAlert('Please enter your password', 'error');
                return;
            }
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="spinner"></div>Logging in...';
            submitBtn.disabled = true;
            
            // Login admin
            const result = adminState.loginAdmin(email, password);
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                if (result.success) {
                    showAdminCustomAlert(result.message, 'success');
                    hideAdminModal('adminLoginModal');
                    updateAdminUI();
                } else {
                    showAdminCustomAlert(result.message, 'error');
                }
            }, 1500);
        });
        
        // User Management Functions
        function searchUser() {
            const searchTerm = document.getElementById('userSearchInput').value.trim().toLowerCase();
            
            if (!searchTerm) {
                showAdminCustomAlert('Please enter an email or username to search', 'warning');
                return;
            }
            
            // In a real implementation, this would query your user database
            // For demo purposes, we'll simulate a user
            const demoUsers = [
                {
                    id: 'user1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    coins: 1250,
                    verified: true,
                    status: 'active'
                },
                {
                    id: 'user2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    coins: 750,
                    verified: false,
                    status: 'pending'
                },
                {
                    id: 'user3',
                    name: 'Bob Johnson',
                    email: 'bob@example.com',
                    coins: 2000,
                    verified: true,
                    status: 'active'
                }
            ];
            
            const user = demoUsers.find(u => 
                u.email.toLowerCase().includes(searchTerm) || 
                u.name.toLowerCase().includes(searchTerm)
            );
            
            if (user) {
                document.getElementById('userSearchResults').classList.remove('hidden');
                document.getElementById('userDetailName').textContent = user.name;
                document.getElementById('userDetailEmail').textContent = user.email;
                document.getElementById('userDetailCoins').textContent = user.coins;
                
                const verifiedBadge = document.getElementById('userDetailVerified');
                verifiedBadge.textContent = user.verified ? 'Verified' : 'Unverified';
                verifiedBadge.className = `status-badge ${user.verified ? 'verified' : 'unverified'}`;
                
                const statusBadge = document.getElementById('userDetailStatus');
                statusBadge.textContent = user.status;
                statusBadge.className = `status-badge ${user.status === 'active' ? 'verified' : 'pending'}`;
            } else {
                showAdminCustomAlert('No user found with that email or username', 'warning');
            }
        }
        
        function resetUserSearch() {
            document.getElementById('userSearchInput').value = '';
            document.getElementById('userSearchResults').classList.add('hidden');
        }
        
        function rewardUser() {
            const coinsInput = prompt('Enter number of coins to reward:');
            if (coinsInput && !isNaN(coinsInput) && parseInt(coinsInput) > 0) {
                const coins = parseInt(coinsInput);
                showAdminCustomAlert(`User rewarded with ${coins} coins`, 'success');
                // In real implementation, update user's coin balance
            } else {
                showAdminCustomAlert('Please enter a valid number of coins', 'warning');
            }
        }
        
        function verifyUser() {
            showAdminCustomAlert('User email verification sent', 'success');
            // In real implementation, send verification email
        }
        
        function resetUserPassword() {
            const newPassword = prompt('Enter new password for user:');
            if (newPassword && newPassword.length >= 6) {
                showAdminCustomAlert('User password reset successfully', 'success');
                // In real implementation, update user's password
            } else {
                showAdminCustomAlert('Password must be at least 6 characters', 'warning');
            }
        }
        
        function banUser() {
            const confirmBan = confirm('Are you sure you want to ban this user?');
            if (confirmBan) {
                showAdminCustomAlert('User has been banned', 'success');
                // In real implementation, update user's status to banned
            }
        }
        
        // System Settings Functions
        function showSystemSettings() {
            if (!adminState.hasPermission('system_settings')) {
                showAdminCustomAlert('You do not have permission to access system settings', 'error');
                return;
            }
            showAdminModal('systemSettingsModal');
        }
        
        function saveSystemSettings() {
            // In real implementation, save settings to database
            showAdminCustomAlert('System settings saved successfully', 'success');
            hideAdminModal('systemSettingsModal');
        }
        
        // Analytics Functions
        function showAnalytics() {
            if (!adminState.hasPermission('analytics')) {
                showAdminCustomAlert('You do not have permission to view analytics', 'error');
                return;
            }
            showAdminCustomAlert('Analytics feature coming soon!', 'info');
        }
        
        // Admin Logout
        function adminLogout() {
            adminState.logout();
            document.getElementById('adminDashboard').classList.add('hidden');
            document.getElementById('adminStatus').classList.add('hidden');
            document.getElementById('adminLoginModal').classList.remove('hidden');
            showAdminCustomAlert('Admin logged out successfully', 'success');
        }
        
        // Update Admin UI
        function updateAdminUI() {
            if (adminState.isAdminMode && adminState.admin) {
                document.getElementById('adminStatus').classList.remove('hidden');
                document.getElementById('adminName').textContent = adminState.admin.name;
                document.getElementById('adminDashboard').classList.remove('hidden');
                document.getElementById('adminLoginModal').classList.add('hidden');
                document.getElementById('adminRegistrationModal').classList.add('hidden');
                
                // Load sample data for demo
                loadSampleData();
            } else {
                document.getElementById('adminDashboard').classList.add('hidden');
                document.getElementById('adminStatus').classList.add('hidden');
                document.getElementById('adminLoginModal').classList.remove('hidden');
            }
        }
        
        // Load Sample Data for Demo
        function loadSampleData() {
            // Update stats
            document.getElementById('totalUsers').textContent = '1,245';
            document.getElementById('totalCoins').textContent = '125,678';
            document.getElementById('verifiedUsers').textContent = '1,089';
            document.getElementById('pendingVerification').textContent = '156';
            
            // Load sample activities
            const activities = [
                { user: 'john@example.com', activity: 'Registered', ip: '192.168.1.1', time: '10:30 AM', status: 'success' },
                { user: 'jane@example.com', activity: 'Logged in', ip: '192.168.1.2', time: '11:15 AM', status: 'success' },
                { user: 'bob@example.com', activity: 'Earned 50 coins', ip: '192.168.1.3', time: '11:45 AM', status: 'success' },
                { user: 'alice@example.com', activity: 'Attempted login', ip: '192.168.1.4', time: '12:05 PM', status: 'error' },
                { user: 'mike@example.com', activity: 'Completed survey', ip: '192.168.1.5', time: '12:30 PM', status: 'success' }
            ];
            
            const activityTable = document.getElementById('activityTable');
            activityTable.innerHTML = '';
            
            activities.forEach(activity => {
                const row = document.createElement('tr');
                row.className = 'border-b border-white/10 user-row';
                
                row.innerHTML = `
                    <td class="py-3">${activity.user}</td>
                    <td class="py-3">${activity.activity}</td>
                    <td class="py-3">${activity.ip}</td>
                    <td class="py-3">${activity.time}</td>
                    <td class="py-3">
                        <span class="status-badge ${activity.status === 'success' ? 'verified' : 'unverified'}">
                            ${activity.status}
                        </span>
                    </td>
                    <td class="py-3">
                        <button class="text-blue-400 hover:text-blue-300 mr-2" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="text-red-400 hover:text-red-300" title="Delete Record">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                activityTable.appendChild(row);
            });
            
            // Load sample security logs
            const securityLogs = [
                { type: 'system', message: 'Admin panel initialized', time: 'Today, 10:30 AM' },
                { type: 'login', message: 'Admin login: john@example.com', time: 'Today, 10:35 AM' },
                { type: 'user', message: 'User registration: jane@example.com', time: 'Today, 11:15 AM' },
                { type: 'earning', message: 'User earned 50 coins: bob@example.com', time: 'Today, 11:45 AM' },
                { type: 'security', message: 'Failed login attempt: alice@example.com', time: 'Today, 12:05 PM' }
            ];
            
            const logsContainer = document.getElementById('securityLogs');
            logsContainer.innerHTML = '';
            
            securityLogs.forEach(log => {
                const logElement = document.createElement('div');
                logElement.className = 'p-3 bg-white/10 rounded-lg';
                
                let iconClass = 'fas fa-info-circle text-blue-400';
                if (log.type === 'login') iconClass = 'fas fa-sign-in-alt text-green-400';
                if (log.type === 'user') iconClass = 'fas fa-user-plus text-yellow-400';
                if (log.type === 'earning') iconClass = 'fas fa-coins text-yellow-400';
                if (log.type === 'security') iconClass = 'fas fa-shield-alt text-red-400';
                
                logElement.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                            <i class="${iconClass} mr-2"></i>
                            <span class="font-semibold">${log.message}</span>
                        </div>
                        <span class="text-sm text-white/60">${log.time}</span>
                    </div>
                    <p class="text-white/80 text-sm mt-1">${log.type} event</p>
                `;
                
                logsContainer.appendChild(logElement);
            });
        }
        
        // Event Listeners
        document.addEventListener('DOMContentLoaded', function() {
            // Setup admin registration and login forms
            document.getElementById('searchUserBtn').addEventListener('click', searchUser);
            document.getElementById('resetUserSearchBtn').addEventListener('click', resetUserSearch);
            
            // Setup user management buttons
            document.getElementById('rewardUserBtn').addEventListener('click', rewardUser);
            document.getElementById('verifyUserBtn').addEventListener('click', verifyUser);
            document.getElementById('resetPasswordBtn').addEventListener('click', resetUserPassword);
            document.getElementById('banUserBtn').addEventListener('click', banUser);
            
            // Setup system settings buttons
            document.getElementById('clearLogsBtn').addEventListener('click', function() {
                if (confirm('Are you sure you want to clear all security logs?')) {
                    document.getElementById('securityLogs').innerHTML = '';
                    showAdminCustomAlert('Security logs cleared', 'success');
                }
            });
            
            // Initialize admin UI based on state
            updateAdminUI();
        });
