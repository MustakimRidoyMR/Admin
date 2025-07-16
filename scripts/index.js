    // Admin Panel Configuration
        const config = {
            apiEndpoint: 'https://script.google.com/macros/s/AKfycbwzeoNtCleXecmpyEpfQMiZxNHizvl84nUipSj1FxTySFVhQrT-3K9Oo_7FiidM5HPL/exec',
            adminFolder: 'admin_data',
            coinToUsdRate: 0.000001
        };

        // Admin State Management
        class AdminPanel {
            constructor() {
                this.currentAdmin = null;
                this.selectedUser = null;
                this.adminCodes = ['ADMIN2025', 'CEPADMIN', 'MANAGER123'];
                this.actionHistory = [];
                this.init();
            }

            async init() {
                await this.loadAdminCodes();
                this.checkStoredLogin();
                this.setupEventListeners();
            }

            async loadAdminCodes() {
                try {
                    const response = await fetch(`${config.apiEndpoint}?folder=${config.adminFolder}&filename=admin_codes.json`);
                    if (response.ok) {
                        const text = await response.text();
                        if (!text.includes('error')) {
                            this.adminCodes = JSON.parse(text);
                        }
                    }
                } catch (error) {
                    console.log('Admin codes not found, using defaults');
                    this.adminCodes = ['ADMIN2025', 'CEPADMIN', 'MANAGER123'];
                }
            }

            checkStoredLogin() {
                const storedAdmin = localStorage.getItem('adminSession');
                if (storedAdmin) {
                    try {
                        const adminData = JSON.parse(storedAdmin);
                        if (Date.now() - adminData.loginTime < 3600000) { // 1 hour session
                            this.currentAdmin = adminData;
                            this.showDashboard();
                        } else {
                            localStorage.removeItem('adminSession');
                        }
                    } catch (error) {
                        localStorage.removeItem('adminSession');
                    }
                }
            }

            async authenticateAdmin(email, password, adminCode) {
                try {
                    console.log('Starting admin authentication for:', email);
                    
                    // First check if admin code is valid
                    if (!this.adminCodes.includes(adminCode)) {
                        throw new Error('Invalid admin code');
                    }
                    
                    // Check if user exists in main app database - using same method as main app
                    const userData = await this.loadUserFromDatabase(email);
                    
                    if (!userData) {
                        throw new Error('User not found in system. Please register in the main app first.');
                    }
                    
                    console.log('User found:', userData.name);
                    
                    // Verify password
                    if (userData.password !== password) {
                        throw new Error('Invalid password');
                    }
                    
                    console.log('Password verified for:', userData.name);
                    
                    // Create admin session
                    const adminData = {
                        email: userData.email,
                        name: userData.name,
                        phone: userData.phone,
                        adminCode: adminCode,
                        loginTime: Date.now(),
                        permissions: ['user_management', 'limited_edit']
                    };
                    
                    // Save admin session
                    await this.saveAdminSession(adminData);
                    
                    this.currentAdmin = adminData;
                    localStorage.setItem('adminSession', JSON.stringify(adminData));
                    
                    this.logAction('Admin Login', `${userData.name} logged in as admin`);
                    return { success: true, message: 'Admin login successful' };
                } catch (error) {
                    console.error('Admin authentication error:', error);
                    return { success: false, message: error.message };
                }
            }

            async loadUserFromDatabase(email) {
                try {
                    const filename = email.replace('@', '_at_').replace(/\./g, '_dot_') + '.json';
                    console.log('Loading user file:', filename);
                    
                    const response = await fetch(`${config.apiEndpoint}?folder=users&filename=${filename}`);
                    
                    console.log('Response status:', response.status);
                    
                    if (!response.ok) {
                        console.log('Response not ok:', response.status);
                        return null;
                    }
                    
                    const text = await response.text();
                    console.log('Response text preview:', text.substring(0, 200));
                    
                    if (text.includes('error') || text.includes('not found') || text.trim() === '') {
                        console.log('User file not found or error in response');
                        return null;
                    }
                    
                    try {
                        const userData = JSON.parse(text);
                        console.log('User data loaded successfully for:', email);
                        return userData;
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        console.log('Raw response that failed to parse:', text);
                        return null;
                    }
                } catch (error) {
                    console.error('Load user from database error:', error);
                    return null;
                }
            }

            async saveAdminSession(adminData) {
                try {
                    const sessionData = {
                        ...adminData,
                        sessionId: Date.now().toString(),
                        ipAddress: 'hidden',
                        userAgent: navigator.userAgent.substring(0, 100)
                    };
                    
                    const result = await fetch(config.apiEndpoint, {
                        method: 'POST',
                        body: new URLSearchParams({
                            folder: config.adminFolder,
                            filename: `session_${adminData.email.replace('@', '_at_').replace(/\./g, '_dot_')}.json`,
                            content: JSON.stringify(sessionData, null, 2)
                        })
                    });
                    
                    console.log('Admin session saved:', result.ok);
                } catch (error) {
                    console.error('Failed to save admin session:', error);
                }
            }

            showDashboard() {
                document.getElementById('loginRequired').classList.add('hidden');
                document.getElementById('adminDashboard').classList.remove('hidden');
                document.getElementById('adminInfo').classList.remove('hidden');
                document.getElementById('loginBtn').classList.add('hidden');
                
                document.getElementById('adminName').textContent = this.currentAdmin.name;
                document.getElementById('adminEmail').textContent = this.currentAdmin.email;
                
                this.loadDashboardStats();
            }

            async loadDashboardStats() {
                try {
                    // This would normally query your user database
                    // For now, we'll show basic stats
                    document.getElementById('totalUsers').textContent = '---';
                    document.getElementById('verifiedUsers').textContent = '---';
                    document.getElementById('totalCoins').textContent = '---';
                    document.getElementById('totalActivities').textContent = '---';
                } catch (error) {
                    console.error('Failed to load dashboard stats:', error);
                }
            }

            async searchUserByEmail(email) {
                return await this.loadUserFromDatabase(email);
            }

            displaySearchResults(users) {
                const userList = document.getElementById('userList');
                const searchResults = document.getElementById('searchResults');
                
                if (!users || users.length === 0) {
                    searchResults.classList.add('hidden');
                    showAlert('No users found matching your search criteria', 'warning');
                    return;
                }

                userList.innerHTML = '';
                
                users.forEach(user => {
                    const userCard = this.createUserCard(user);
                    userList.appendChild(userCard);
                });

                searchResults.classList.remove('hidden');
            }

            createUserCard(user) {
                const div = document.createElement('div');
                div.className = 'user-card bg-white/10 rounded-xl p-4 border border-white/20';
                
                const verificationStatus = user.isEmailVerified ? 'verified' : 'unverified';
                const activeStatus = user.isActive !== false ? 'active' : 'inactive';
                
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="text-lg font-bold text-white">${user.name}</h4>
                            <p class="text-white/70 text-sm">${user.email}</p>
                            <p class="text-white/60 text-xs">${user.phone || 'No phone'}</p>
                        </div>
                        <div class="text-right">
                            <span class="status-badge ${verificationStatus}">
                                <i class="fas ${user.isEmailVerified ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                ${user.isEmailVerified ? 'Verified' : 'Unverified'}
                            </span>
                            <br>
                            <span class="status-badge ${activeStatus} mt-1">
                                <i class="fas ${user.isActive !== false ? 'fa-check' : 'fa-ban'}"></i>
                                ${user.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-yellow-400">${user.coins || 0}</div>
                            <div class="text-xs text-white/60">Coins</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-cyan-400">${user.diamonds || 0}</div>
                            <div class="text-xs text-white/60">Diamonds</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-green-400">৳${(user.earnings || 0).toFixed(2)}</div>
                            <div class="text-xs text-white/60">Earnings</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-400">${user.streak || 0}</div>
                            <div class="text-xs text-white/60">Streak</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-white/70">
                            Joined: ${new Date(user.joinDate).toLocaleDateString()}
                        </div>
                        <button onclick="editUser('${user.email}')" class="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                            <i class="fas fa-edit mr-1"></i>Edit User
                        </button>
                    </div>
                `;
                
                return div;
            }

            async editUser(email) {
                try {
                    const user = await this.searchUserByEmail(email);
                    if (!user) {
                        showAlert('User not found', 'error');
                        return;
                    }

                    this.selectedUser = user;
                    this.showEditModal(user);
                } catch (error) {
                    console.error('Edit user error:', error);
                    showAlert('Failed to load user data', 'error');
                }
            }

            showEditModal(user) {
                document.getElementById('editUserName').textContent = user.name;
                const form = document.getElementById('editUserForm');
                
                form.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">
                                Coins (Current: ${user.coins || 0}) 
                                <span class="text-red-400">*Can only decrease</span>
                            </label>
                            <input type="number" id="editCoins" value="${user.coins || 0}" 
                                   max="${user.coins || 0}" min="0" class="edit-field">
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">
                                Diamonds (Current: ${user.diamonds || 0})
                                <span class="text-green-400">*Can increase/decrease</span>
                            </label>
                            <input type="number" id="editDiamonds" value="${user.diamonds || 0}" 
                                   min="0" class="edit-field">
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">
                                Earnings (Current: ৳${(user.earnings || 0).toFixed(2)})
                                <span class="text-red-400">*Can only decrease</span>
                            </label>
                            <input type="number" id="editEarnings" value="${user.earnings || 0}" 
                                   max="${user.earnings || 0}" min="0" step="0.01" class="edit-field">
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">
                                Streak (Current: ${user.streak || 0})
                                <span class="text-green-400">*Can increase/decrease</span>
                            </label>
                            <input type="number" id="editStreak" value="${user.streak || 0}" 
                                   min="0" class="edit-field">
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Account Status</label>
                            <select id="editIsActive" class="edit-field">
                                <option value="true" ${user.isActive !== false ? 'selected' : ''}>Active</option>
                                <option value="false" ${user.isActive === false ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Preferred Language</label>
                            <select id="editLanguage" class="edit-field">
                                <option value="en" ${user.preferredLanguage === 'en' ? 'selected' : ''}>English</option>
                                <option value="bn" ${user.preferredLanguage === 'bn' ? 'selected' : ''}>Bengali</option>
                                <option value="hi" ${user.preferredLanguage === 'hi' ? 'selected' : ''}>Hindi</option>
                                <option value="ar" ${user.preferredLanguage === 'ar' ? 'selected' : ''}>Arabic</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Daily Games Unlocked</label>
                            <select id="editGamesUnlocked" class="edit-field">
                                <option value="true" ${user.dailyUnlockedGames ? 'selected' : ''}>Yes</option>
                                <option value="false" ${!user.dailyUnlockedGames ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-white/80 text-sm font-medium mb-2">Daily Videos Unlocked</label>
                            <select id="editVideosUnlocked" class="edit-field">
                                <option value="true" ${user.dailyUnlockedVideos ? 'selected' : ''}>Yes</option>
                                <option value="false" ${!user.dailyUnlockedVideos ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mt-6">
                        <h4 class="text-lg font-bold mb-2">Read-Only Information</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><strong>Gender:</strong> ${user.gender || 'Not specified'}</div>
                            <div><strong>Date of Birth:</strong> ${user.dateOfBirth || 'Not specified'}</div>
                            <div><strong>Location:</strong> ${user.location || user.address || 'Not specified'}</div>
                            <div><strong>Bio:</strong> ${user.bio || 'No bio'}</div>
                            <div><strong>Join Date:</strong> ${new Date(user.joinDate).toLocaleDateString()}</div>
                            <div><strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
                        </div>
                    </div>
                `;
                
                document.getElementById('editUserModal').classList.remove('hidden');
            }

            async saveUserChanges() {
                if (!this.selectedUser) return;

                try {
                    const originalUser = { ...this.selectedUser };
                    
                    // Get new values
                    const newCoins = parseInt(document.getElementById('editCoins').value) || 0;
                    const newDiamonds = parseInt(document.getElementById('editDiamonds').value) || 0;
                    const newEarnings = parseFloat(document.getElementById('editEarnings').value) || 0;
                    const newStreak = parseInt(document.getElementById('editStreak').value) || 0;
                    const newIsActive = document.getElementById('editIsActive').value === 'true';
                    const newLanguage = document.getElementById('editLanguage').value;
                    const newGamesUnlocked = document.getElementById('editGamesUnlocked').value === 'true';
                    const newVideosUnlocked = document.getElementById('editVideosUnlocked').value === 'true';

                    // Validate changes
                    if (newCoins > originalUser.coins) {
                        showAlert('Cannot increase coins amount', 'error');
                        return;
                    }

                    if (newEarnings > originalUser.earnings) {
                        showAlert('Cannot increase earnings amount', 'error');
                        return;
                    }

                    // Update user data
                    const updatedUser = {
                        ...originalUser,
                        coins: newCoins,
                        diamonds: newDiamonds,
                        earnings: newEarnings,
                        streak: newStreak,
                        isActive: newIsActive,
                        preferredLanguage: newLanguage,
                        dailyUnlockedGames: newGamesUnlocked,
                        dailyUnlockedVideos: newVideosUnlocked,
                        lastUpdated: new Date().toISOString(),
                        lastUpdatedBy: this.currentAdmin.email
                    };

                    // Save to server
                    const result = await this.saveUserData(updatedUser);
                    
                    if (result.success) {
                        this.logAction('User Updated', `Updated ${originalUser.name} (${originalUser.email})`);
                        showAlert('User data updated successfully', 'success');
                        hideModal('editUserModal');
                        
                        // Refresh search results if visible
                        if (!document.getElementById('searchResults').classList.contains('hidden')) {
                            searchUser();
                        }
                    } else {
                        showAlert('Failed to update user data', 'error');
                    }
                } catch (error) {
                    console.error('Save user changes error:', error);
                    showAlert('Failed to save changes', 'error');
                }
            }

            async saveUserData(userData) {
                try {
                    const filename = userData.email.replace('@', '_at_').replace(/\./g, '_dot_') + '.json';
                    const response = await fetch(config.apiEndpoint, {
                        method: 'POST',
                        body: new URLSearchParams({
                            folder: 'users',
                            filename: filename,
                            content: JSON.stringify(userData, null, 2)
                        })
                    });

                    if (response.ok) {
                        return { success: true };
                    } else {
                        throw new Error('Server error');
                    }
                } catch (error) {
                    console.error('Save user data error:', error);
                    return { success: false, error: error.message };
                }
            }

            logAction(action, details) {
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    admin: this.currentAdmin.name,
                    adminEmail: this.currentAdmin.email,
                    action: action,
                    details: details
                };

                this.actionHistory.unshift(logEntry);
                this.actionHistory = this.actionHistory.slice(0, 50); // Keep last 50 actions
                
                this.updateActionLog();
                this.saveActionLog();
            }

            updateActionLog() {
                const actionLog = document.getElementById('actionLog');
                
                if (this.actionHistory.length === 0) {
                    actionLog.innerHTML = '<p class="text-white/70 text-center">No recent actions</p>';
                    return;
                }

                actionLog.innerHTML = '';
                
                this.actionHistory.slice(0, 10).forEach(log => {
                    const logDiv = document.createElement('div');
                    logDiv.className = 'bg-white/10 rounded-lg p-3 border-l-4 border-blue-400';
                    
                    logDiv.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-semibold text-white">${log.action}</div>
                                <div class="text-sm text-white/80">${log.details}</div>
                                <div class="text-xs text-white/60">by ${log.admin}</div>
                            </div>
                            <div class="text-xs text-white/60">
                                ${new Date(log.timestamp).toLocaleString()}
                            </div>
                        </div>
                    `;
                    
                    actionLog.appendChild(logDiv);
                });
            }

            async saveActionLog() {
                try {
                    await fetch(config.apiEndpoint, {
                        method: 'POST',
                        body: new URLSearchParams({
                            folder: config.adminFolder,
                            filename: `action_log_${new Date().toISOString().split('T')[0]}.json`,
                            content: JSON.stringify(this.actionHistory, null, 2)
                        })
                    });
                } catch (error) {
                    console.error('Failed to save action log:', error);
                }
            }

            logout() {
                this.logAction('Admin Logout', `${this.currentAdmin.name} logged out`);
                
                this.currentAdmin = null;
                localStorage.removeItem('adminSession');
                
                document.getElementById('loginRequired').classList.remove('hidden');
                document.getElementById('adminDashboard').classList.add('hidden');
                document.getElementById('adminInfo').classList.add('hidden');
                document.getElementById('loginBtn').classList.remove('hidden');
                
                showAlert('Admin logged out successfully', 'success');
            }

            setupEventListeners() {
                // Login form handler
                document.getElementById('loginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
                    const password = document.getElementById('loginPassword').value;
                    const adminCode = document.getElementById('adminCode').value.trim();
                    
                    if (!email || !password || !adminCode) {
                        showAlert('Please fill in all fields', 'warning');
                        return;
                    }
                    
                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<div class="spinner"></div>Authenticating...';
                    submitBtn.disabled = true;
                    
                    try {
                        const result = await this.authenticateAdmin(email, password, adminCode);
                        
                        if (result.success) {
                            hideModal('loginModal');
                            this.showDashboard();
                            showAlert(result.message, 'success');
                            
                            // Clear form
                            document.getElementById('loginEmail').value = '';
                            document.getElementById('loginPassword').value = '';
                            document.getElementById('adminCode').value = '';
                        } else {
                            showAlert(result.message, 'error');
                        }
                    } catch (error) {
                        console.error('Authentication error:', error);
                        showAlert('Authentication failed. Please check your credentials.', 'error');
                    } finally {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                });
            }
        }

        // Global instance
        const adminPanel = new AdminPanel();

        // Global functions
        function showLoginModal() {
            document.getElementById('loginModal').classList.remove('hidden');
        }

        function hideModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
        }

        function showAlert(message, type = 'info') {
            const alertIcon = document.getElementById('alertIcon');
            const alertMessage = document.getElementById('alertMessage');
            
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
            
            document.getElementById('customAlert').classList.remove('hidden');
        }

        function hideAlert() {
            document.getElementById('customAlert').classList.add('hidden');
        }

        async function searchUser() {
            const email = document.getElementById('searchEmail').value.trim().toLowerCase();
            const name = document.getElementById('searchName').value.trim().toLowerCase();
            
            if (!email && !name) {
                showAlert('Please enter an email or name to search', 'warning');
                return;
            }
            
            if (email) {
                const user = await adminPanel.searchUserByEmail(email);
                if (user) {
                    adminPanel.displaySearchResults([user]);
                } else {
                    adminPanel.displaySearchResults([]);
                }
            } else {
                // For name search, you would need to implement a search endpoint
                // For now, show message that email search is preferred
                showAlert('Please use email search for best results', 'info');
            }
        }

        function editUser(email) {
            adminPanel.editUser(email);
        }

        function saveUserChanges() {
            adminPanel.saveUserChanges();
        }

        function adminLogout() {
            adminPanel.logout();
        }

        // Dark mode support
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });
