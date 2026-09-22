document.addEventListener('DOMContentLoaded', () => {
    // --- SESSION (Direct Workspace Access) ---
    const userJson = localStorage.getItem('user') || localStorage.getItem('admin_user');
    let currentAdmin = { id: 1, userId: 1, fullName: 'Admin', email: 'admin123@gmail.com', role: 'Administrator' };
    if (userJson) {
        try {
            const parsed = JSON.parse(userJson);
            currentAdmin = { ...currentAdmin, ...parsed, userId: parsed.id || parsed.userId || 1 };
        } catch (e) { }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- DOM REFERENCES ---
    const adminNameEl = document.getElementById('adminName');
    const adminEmailDisplay = document.getElementById('adminEmailDisplay');
    const adminAvatarEl = document.getElementById('adminAvatar');

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = themeToggleBtn?.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn?.querySelector('.moon-icon');

    // Stat Cards
    const statCardUsers = document.getElementById('statCardUsers');
    const statCardCompleted = document.getElementById('statCardCompleted');
    const statCardProgress = document.getElementById('statCardProgress');
    const statCardProducts = document.getElementById('statCardProducts');

    const statUsersCount = document.getElementById('statUsersCount');
    const statCompletedCount = document.getElementById('statCompletedCount');
    const statProgressCount = document.getElementById('statProgressCount');
    const statProductsCount = document.getElementById('statProductsCount');
    const progressProductFilterSelect = document.getElementById('progressProductFilterSelect');

    // Drilldown views
    const drilldownTitle = document.getElementById('drilldownTitle');
    const drilldownSubtitle = document.getElementById('drilldownSubtitle');
    const drilldownSearchInput = document.getElementById('drilldownSearchInput');
    const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');

    // Add User Modal Elements
    const addUserModalOverlay = document.getElementById('addUserModalOverlay');
    const addUserModalCloseBtn = document.getElementById('addUserModalCloseBtn');
    const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');
    const addUserForm = document.getElementById('addUserForm');
    const newUserFullName = document.getElementById('newUserFullName');
    const newUserEmail = document.getElementById('newUserEmail');
    const newUserRole = document.getElementById('newUserRole');
    const newUserPassword = document.getElementById('newUserPassword');
    const saveUserBtn = document.getElementById('saveUserBtn');

    const usersViewContainer = document.getElementById('usersViewContainer');
    const tasksViewContainer = document.getElementById('tasksViewContainer');
    const productsViewContainer = document.getElementById('productsViewContainer');
    const adminUsersTableBody = document.getElementById('adminUsersTableBody');
    const adminTasksList = document.getElementById('adminTasksList');
    const adminProductsTableBody = document.getElementById('adminProductsTableBody');
    const newProductNameInput = document.getElementById('newProductNameInput');
    const addProductBtn = document.getElementById('addProductBtn');

    // Lightbox
    const lightboxOverlay = document.getElementById('lightboxOverlay');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxContentWrapper = document.getElementById('lightboxContentWrapper');
    const lightboxCounter = document.getElementById('lightboxCounter');

    // --- STATE ---
    const state = {
        theme: localStorage.getItem('lms_portal_theme') || 'light',
        users: [],
        events: [],
        products: [],
        activeTab: 'users', // 'users' | 'completed' | 'progress' | 'products'
        searchQuery: '',
        updatingStatusIds: new Set()
    };

    // --- INITIALIZE UI ---
    applyTheme(state.theme);
    if (adminNameEl) adminNameEl.textContent = currentAdmin.fullName || 'Admin';
    if (adminEmailDisplay) adminEmailDisplay.textContent = currentAdmin.email || '';
    if (adminAvatarEl) adminAvatarEl.textContent = (currentAdmin.fullName || 'A').charAt(0).toUpperCase();
    const adminRoleBadge = document.getElementById('adminRoleBadge');
    if (adminRoleBadge) adminRoleBadge.textContent = currentAdmin.role || 'Admin';

    // Theme Toggle
    themeToggleBtn?.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('lms_portal_theme', state.theme);
        applyTheme(state.theme);
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
        }
    }

    // --- ADD USER MODAL LOGIC ---
    let isSavingUser = false;

    function openAddUserModal() {
        if (addUserModalOverlay) {
            addUserModalOverlay.classList.add('active');
            isSavingUser = false;
            if (saveUserBtn) {
                saveUserBtn.disabled = false;
                saveUserBtn.textContent = 'Save User';
                saveUserBtn.style.pointerEvents = 'auto';
            }
            if (newUserFullName) {
                newUserFullName.value = '';
                newUserFullName.focus();
            }
            if (newUserRole) newUserRole.value = '';
        }
    }

    function closeAddUserModal() {
        if (addUserModalOverlay) {
            addUserModalOverlay.classList.remove('active');
            isSavingUser = false;
            if (saveUserBtn) {
                saveUserBtn.disabled = false;
                saveUserBtn.textContent = 'Save User';
                saveUserBtn.style.pointerEvents = 'auto';
            }
            if (addUserForm) addUserForm.reset();
        }
    }

    openAddUserModalBtn?.addEventListener('click', openAddUserModal);
    addUserModalCloseBtn?.addEventListener('click', closeAddUserModal);
    cancelAddUserBtn?.addEventListener('click', closeAddUserModal);
    addUserModalOverlay?.addEventListener('click', (e) => {
        if (e.target === addUserModalOverlay) closeAddUserModal();
    });

    addUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSavingUser) return;

        const fullName = newUserFullName?.value.trim();
        const role = newUserRole?.value.trim();

        if (!fullName) {
            alert('Please enter full name.');
            if (newUserFullName) newUserFullName.focus();
            return;
        }
        if (!role) {
            alert('Please enter user role.');
            if (newUserRole) newUserRole.focus();
            return;
        }

        // Synchronously lock to ensure only ONE request is sent
        isSavingUser = true;
        if (saveUserBtn) {
            saveUserBtn.disabled = true;
            saveUserBtn.textContent = 'Saving...';
            saveUserBtn.style.pointerEvents = 'none';
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, role })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Failed to add user.');

            closeAddUserModal();
            loadDashboardData();
        } catch (err) {
            alert(err.message || 'Error adding user.');
        } finally {
            isSavingUser = false;
            if (saveUserBtn) {
                saveUserBtn.disabled = false;
                saveUserBtn.textContent = 'Save User';
                saveUserBtn.style.pointerEvents = 'auto';
            }
        }
    });

    // --- FETCH DATA ---
    async function loadDashboardData() {
        try {
            const [usersRes, eventsRes, productsRes] = await Promise.all([
                fetch(`/api/users?_t=${Date.now()}`),
                fetch(`/api/events?_t=${Date.now()}`),
                fetch(`/api/products?_t=${Date.now()}`)
            ]);

            state.users = await usersRes.json();
            state.events = await eventsRes.json();
            state.products = await productsRes.json();

            populateProductDropdown();
            updateMetrics();
            renderActiveTab();
        } catch (err) {
            console.error('Error loading admin dashboard data:', err);
        }
    }

    function populateProductDropdown() {
        if (!progressProductFilterSelect) return;
        const currentVal = progressProductFilterSelect.value || 'ALL';
        progressProductFilterSelect.innerHTML = '<option value="ALL">All Products</option>';

        const productNamesSet = new Set();

        if (Array.isArray(state.products)) {
            state.products.forEach(p => {
                if (!p) return;
                const name = typeof p === 'string' ? p : (p.name || p.productName);
                if (name && typeof name === 'string' && name.trim()) {
                    productNamesSet.add(name.trim());
                }
            });
        }

        if (Array.isArray(state.events)) {
            state.events.forEach(e => {
                const name = e.product_name || e.productName;
                if (name && typeof name === 'string' && name.trim() && name !== 'General') {
                    productNamesSet.add(name.trim());
                }
            });
        }

        productNamesSet.forEach(pName => {
            const opt = document.createElement('option');
            opt.value = pName;
            opt.textContent = pName;
            progressProductFilterSelect.appendChild(opt);
        });

        if (Array.from(progressProductFilterSelect.options).some(o => o.value === currentVal)) {
            progressProductFilterSelect.value = currentVal;
        } else {
            progressProductFilterSelect.value = 'ALL';
        }
    }

    function updateMetrics() {
        if (statUsersCount) statUsersCount.textContent = state.users.length;
        if (statProductsCount) statProductsCount.textContent = state.products.length;

        const completedEvents = state.events.filter(e => e.status === 'completed');
        if (statCompletedCount) statCompletedCount.textContent = completedEvents.length;

        let progressEvents = state.events.filter(e => e.status === 'progress');
        const selectedProd = progressProductFilterSelect ? progressProductFilterSelect.value : 'ALL';

        if (selectedProd && selectedProd !== 'ALL') {
            progressEvents = progressEvents.filter(e => {
                const pName = (e.product_name || e.productName || 'General').trim();
                return pName.toLowerCase() === selectedProd.trim().toLowerCase();
            });
        }

        if (statProgressCount) statProgressCount.textContent = progressEvents.length;
    }

    progressProductFilterSelect?.addEventListener('change', () => {
        updateMetrics();
        if (state.activeTab === 'progress') {
            renderTasksList();
        }
    });

    // --- TAB SWITCHING ---
    function setActiveTab(tab) {
        state.activeTab = tab;

        // Update card borders
        [statCardUsers, statCardCompleted, statCardProgress, statCardProducts].forEach(c => {
            if (!c) return;
            c.style.borderColor = 'var(--border)';
            const indicator = c.querySelector('.card-indicator');
            if (indicator) {
                indicator.style.color = 'var(--muted)';
                indicator.textContent = 'Click to View →';
            }
        });

        if (openAddUserModalBtn) {
            openAddUserModalBtn.style.display = (tab === 'users') ? 'inline-flex' : 'none';
        }

        if (tab === 'users') {
            if (statCardUsers) {
                statCardUsers.style.borderColor = 'var(--accent)';
                const ind = statCardUsers.querySelector('.card-indicator');
                if (ind) { ind.style.color = 'var(--accent)'; ind.textContent = 'Viewing List →'; }
            }
            drilldownTitle.textContent = 'User Management Directory';
            drilldownSubtitle.textContent = 'Manage registered users and purge removed accounts';
            usersViewContainer?.classList.remove('hidden');
            tasksViewContainer?.classList.add('hidden');
            productsViewContainer?.classList.add('hidden');
        } else if (tab === 'completed') {
            if (statCardCompleted) {
                statCardCompleted.style.borderColor = 'var(--success)';
                const ind = statCardCompleted.querySelector('.card-indicator');
                if (ind) { ind.style.color = 'var(--success)'; ind.textContent = 'Viewing List →'; }
            }
            drilldownTitle.textContent = 'Completed Updates Overview';
            drilldownSubtitle.textContent = 'List of all tasks and updates marked as Completed';
            usersViewContainer?.classList.add('hidden');
            tasksViewContainer?.classList.remove('hidden');
            productsViewContainer?.classList.add('hidden');
        } else if (tab === 'progress') {
            if (statCardProgress) {
                statCardProgress.style.borderColor = '#F59E0B';
                const ind = statCardProgress.querySelector('.card-indicator');
                if (ind) { ind.style.color = '#F59E0B'; ind.textContent = 'Viewing List →'; }
            }
            drilldownTitle.textContent = 'In-Progress Tasks Overview';
            drilldownSubtitle.textContent = 'Active updates currently in progress across workspace';
            usersViewContainer?.classList.add('hidden');
            tasksViewContainer?.classList.remove('hidden');
            productsViewContainer?.classList.add('hidden');
        } else if (tab === 'products') {
            if (statCardProducts) {
                statCardProducts.style.borderColor = '#a855f7';
                const ind = statCardProducts.querySelector('.card-indicator');
                if (ind) { ind.style.color = '#a855f7'; ind.textContent = 'Viewing List →'; }
            }
            drilldownTitle.textContent = 'Product Directory & Management';
            drilldownSubtitle.textContent = 'Add, edit, and delete workspace products for updates';
            usersViewContainer?.classList.add('hidden');
            tasksViewContainer?.classList.add('hidden');
            productsViewContainer?.classList.remove('hidden');
        }

        renderActiveTab();
    }

    statCardUsers?.addEventListener('click', () => setActiveTab('users'));
    statCardCompleted?.addEventListener('click', () => setActiveTab('completed'));
    statCardProgress?.addEventListener('click', () => setActiveTab('progress'));
    statCardProducts?.addEventListener('click', () => setActiveTab('products'));

    // Add Product button handler
    addProductBtn?.addEventListener('click', () => {
        const productName = newProductNameInput.value.trim();
        if (!productName) {
            alert('Product name is required.');
            return;
        }
        saveProduct({ name: productName });
    });

    // Search input filtering
    drilldownSearchInput?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderActiveTab();
    });

    // --- RENDER DRILLDOWN VIEWS ---
    function renderActiveTab() {
        if (state.activeTab === 'users') {
            renderUsersTable();
        } else if (state.activeTab === 'products') {
            renderProductsTable();
        } else {
            renderTasksList();
        }
    }

    function renderUsersTable() {
        adminUsersTableBody.innerHTML = '';
        const filteredUsers = state.users.filter(u => {
            if (!state.searchQuery) return true;
            const name = u.full_name || u.fullName || '';
            const role = u.role || '';
            return name.toLowerCase().includes(state.searchQuery) ||
                   role.toLowerCase().includes(state.searchQuery);
        });

        if (filteredUsers.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="3" style="text-align: center; padding: 2rem; color: var(--muted);">No users found.</td>`;
            adminUsersTableBody.appendChild(tr);
            return;
        }

        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.transition = 'background var(--ease)';

            const userName = user.full_name || user.fullName || 'User';
            const isCurrentAdmin = user.id === currentAdmin.userId || user.id === currentAdmin.id;
            const initial = userName.charAt(0).toUpperCase();

            tr.innerHTML = `
                <td style="padding: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="user-avatar-sm" style="width: 34px; height: 34px; font-size: 0.85rem;">${initial}</div>
                        <div>
                            <div style="font-weight: 600; color: var(--text);">${userName} ${isCurrentAdmin ? '<span style="color: var(--accent); font-size: 0.75rem;">(You)</span>' : ''}</div>
                            <div style="font-size: 0.75rem; color: var(--faint);">User ID: #${user.id}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 1rem;">
                    <span class="day-update-token" style="background: rgba(96, 165, 250, 0.1); color: var(--accent); font-size: 0.75rem;">${user.role || 'Member'}</span>
                </td>
                <td style="padding: 1rem; text-align: right;">
                    ${!isCurrentAdmin ? `
                        <button class="btn-delete-user" data-id="${user.id}" data-name="${userName}" style="background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background var(--ease), color var(--ease);">
                            Remove User
                        </button>
                    ` : '<span style="font-size: 0.78rem; color: var(--faint);">Current Admin</span>'}
                </td>
            `;

            adminUsersTableBody.appendChild(tr);
        });

        // Wire delete buttons — no confirm dialog, immediate delete
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.getAttribute('data-id');
                removeUserImmediate(userId);
            });
        });
    }

    async function removeUserImmediate(userId) {
        try {
            const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove user.');
            await loadDashboardData();
        } catch (err) {
            console.error('Remove user error:', err.message);
        }
    }

    function renderProductsTable() {
        adminProductsTableBody.innerHTML = '';
        const filteredProducts = state.products.filter(p => {
            if (!state.searchQuery) return true;
            return p.name && p.name.toLowerCase().includes(state.searchQuery);
        });

        if (filteredProducts.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="3" style="text-align: center; padding: 2rem; color: var(--muted);">No products found.</td>`;
            adminProductsTableBody.appendChild(tr);
            return;
        }

        filteredProducts.forEach(product => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.transition = 'background var(--ease)';
            tr.setAttribute('data-product-id', product.id);

            tr.innerHTML = `
                <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text);">
                    <span class="product-name-span">${product.name}</span>
                    <input type="text" class="product-edit-input hidden" value="${product.name}" style="width: 100%; max-width: 300px; padding: 0.35rem 0.65rem; font-size: 0.88rem; border: 1px solid var(--accent); border-radius: 6px; background: var(--surface-input); color: var(--text); outline: none;">
                </td>
                <td style="padding: 0.75rem 1rem; color: var(--muted); font-size: 0.85rem;">
                    ${product.createdAt || 'N/A'}
                </td>
                <td style="padding: 0.75rem 1rem; text-align: right;">
                    <div class="product-view-actions" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        <button class="btn-edit-product" data-id="${product.id}" style="background: rgba(96, 165, 250, 0.12); border: 1px solid var(--accent); color: var(--accent); border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Edit
                        </button>
                        <button class="btn-delete-product" data-id="${product.id}" style="background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Delete
                        </button>
                    </div>
                    <div class="product-edit-actions hidden" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        <button class="btn-save-inline-product" data-id="${product.id}" style="background: var(--accent); border: 1px solid var(--accent); color: #ffffff; border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Save
                        </button>
                        <button class="btn-cancel-inline-product" data-id="${product.id}" style="background: transparent; border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </td>
            `;

            adminProductsTableBody.appendChild(tr);

            // Wire Edit button (toggles row to inline edit input)
            const editBtn = tr.querySelector('.btn-edit-product');
            const deleteBtn = tr.querySelector('.btn-delete-product');
            const saveBtn = tr.querySelector('.btn-save-inline-product');
            const cancelBtn = tr.querySelector('.btn-cancel-inline-product');
            const nameSpan = tr.querySelector('.product-name-span');
            const editInput = tr.querySelector('.product-edit-input');
            const viewActions = tr.querySelector('.product-view-actions');
            const editActions = tr.querySelector('.product-edit-actions');

            editBtn?.addEventListener('click', () => {
                nameSpan.classList.add('hidden');
                editInput.classList.remove('hidden');
                viewActions.classList.add('hidden');
                editActions.classList.remove('hidden');
                editInput.focus();
            });

            cancelBtn?.addEventListener('click', () => {
                editInput.value = product.name;
                nameSpan.classList.remove('hidden');
                editInput.classList.add('hidden');
                viewActions.classList.remove('hidden');
                editActions.classList.add('hidden');
            });

            saveBtn?.addEventListener('click', () => {
                const newName = editInput.value.trim();
                if (!newName) return;
                saveProduct({ id: product.id, name: newName });
            });

            editInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            });

            // Wire Delete button (deletes directly in DB without alert popup)
            deleteBtn?.addEventListener('click', () => {
                deleteProduct(product.id);
            });
        });
    }

    async function saveProduct(productObj) {
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productObj)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save product.');
            if (newProductNameInput) newProductNameInput.value = '';
            await loadDashboardData();
        } catch (err) {
            console.error('Save product error:', err.message);
        }
    }

    async function deleteProduct(productId) {
        try {
            const res = await fetch(`/api/products?id=${productId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete product.');
            await loadDashboardData();
        } catch (err) {
            console.error('Delete product error:', err.message);
        }
    }

    function renderTasksList() {
        adminTasksList.innerHTML = '';
        const targetStatus = state.activeTab === 'completed' ? 'completed' : 'progress';
        const selectedProd = (state.activeTab === 'progress' && progressProductFilterSelect) ? progressProductFilterSelect.value : 'ALL';

        const filteredTasks = state.events
            .filter(e => e.status === targetStatus)
            .filter(e => {
                if (targetStatus === 'progress' && selectedProd && selectedProd !== 'ALL') {
                    const pName = (e.product_name || e.productName || 'General').trim();
                    return pName.toLowerCase() === selectedProd.trim().toLowerCase();
                }
                return true;
            })
            .filter(e => {
                if (!state.searchQuery) return true;
                return (e.title && e.title.toLowerCase().includes(state.searchQuery)) ||
                       (e.description && e.description.toLowerCase().includes(state.searchQuery)) ||
                       (e.comments && e.comments.toLowerCase().includes(state.searchQuery)) ||
                       (e.token_id && e.token_id.toLowerCase().includes(state.searchQuery));
            })
            .sort((a, b) => {
                if (a.event_date !== b.event_date) return b.event_date.localeCompare(a.event_date);
                return (b.id || 0) - (a.id || 0);
            });

        if (filteredTasks.length === 0) {
            const li = document.createElement('li');
            li.style.padding = '2rem';
            li.style.textAlign = 'center';
            li.style.color = 'var(--muted)';
            li.textContent = `No ${targetStatus === 'completed' ? 'completed' : 'in-progress'} tasks found.`;
            adminTasksList.appendChild(li);
            return;
        }

        filteredTasks.forEach(evt => {
            const li = document.createElement('li');
            li.className = 'day-update-card';

            const statusClass = evt.status === 'completed' ? 'status-badge-completed' : 'status-badge-progress';
            const statusText = evt.status === 'completed' ? 'Completed' : 'In Progress';

            // Find assignee
            let assigneeHtml = '<span class="day-update-assignee">Unassigned</span>';
            if (evt.member_id) {
                const assignedUser = state.users.find(u => u.id === evt.member_id);
                if (assignedUser) {
                    const initial = assignedUser.full_name.charAt(0).toUpperCase();
                    assigneeHtml = `
                        <div class="day-update-assignee" style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="user-avatar-sm" style="width: 24px; height: 24px; font-size: 0.7rem; margin: 0;">${initial}</div>
                            <span>Assigned to: ${assignedUser.full_name}</span>
                        </div>
                    `;
                }
            }

            // Parse images if any
            let imageList = [];
            if (evt.images) {
                try {
                    imageList = JSON.parse(evt.images);
                } catch(e) {
                    console.error('Failed to parse images:', e);
                }
            }

            let imagesHtml = '';
            if (Array.isArray(imageList) && imageList.length > 0) {
                imagesHtml = '<div class="day-update-thumbnails">';
                imageList.forEach((img, idx) => {
                    imagesHtml += `<img src="${img}" class="day-update-thumb" data-index="${idx}">`;
                });
                imagesHtml += '</div>';
            }

            const formattedDate = new Date(evt.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            let tokenIdHtml = '';
            if (evt.token_id && evt.token_id.trim()) {
                tokenIdHtml = `<span class="day-update-token">${evt.token_id.trim()}</span>`;
            }

            let contentBodyHtml = '';
            const titleStr = (evt.title || '').trim();
            const descStr = (evt.description || '').trim();
            const mainContent = descStr || titleStr || 'No content details provided.';

            if (descStr && titleStr && descStr !== titleStr && titleStr.length <= 60 && titleStr !== 'Update') {
                contentBodyHtml = `
                    <div class="day-update-subject">${titleStr}</div>
                    <div class="day-update-content">${descStr}</div>
                `;
            } else {
                contentBodyHtml = `
                    <div class="day-update-content" style="font-size: 0.88rem; line-height: 1.5; color: var(--text); font-weight: 500; margin-bottom: 0.4rem;">${mainContent}</div>
                `;
            }

            // Comments block if available
            let commentsHtml = '';
            const commentStr = (evt.comments || '').trim();
            if (commentStr) {
                commentsHtml = `
                    <div class="day-update-comments-block" style="margin: 0.45rem 0 0.35rem 0; padding: 0.5rem 0.75rem; background: var(--surface-input, rgba(0,0,0,0.03)); border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 4px; font-size: 0.84rem;">
                        <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--accent); margin-bottom: 3px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <span>Comment</span>
                        </div>
                        <div style="color: var(--text); line-height: 1.45; white-space: pre-wrap; word-break: break-word;">${escapeHtml(commentStr)}</div>
                    </div>
                `;
            }

            // Product badge if available
            let productBadgeHtml = '';
            let prodName = (evt.product_name || evt.productName || '').trim();
            if (!prodName && evt.product_id && state.products) {
                const p = state.products.find(prod => prod.id === evt.product_id || String(prod.id) === String(evt.product_id));
                if (p) prodName = p.name;
            }
            if (prodName) {
                productBadgeHtml = `
                    <span class="day-update-token" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
                        ${escapeHtml(prodName)}
                    </span>
                `;
            }

            const isCompleted = evt.status === 'completed';
            const radioColor = isCompleted ? '#10b981' : '#f59e0b';

            li.innerHTML = `
                <div class="day-update-header">
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                        ${tokenIdHtml}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span style="font-size: 0.78rem; color: var(--faint);">Date: ${formattedDate}</span>
                        <span class="day-update-status ${statusClass}">${statusText}</span>
                        <span class="status-radio-circle-btn ${isCompleted ? 'is-completed' : 'is-progress'}" data-event-id="${evt.id}" role="button" tabindex="0" title="Click to toggle status (Yellow: In Progress | Green: Completed)" onclick="event.stopPropagation();">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none;">
                                <circle cx="12" cy="12" r="9" stroke="${radioColor}" stroke-width="2.5" fill="none"/>
                                <circle cx="12" cy="12" r="5" fill="${radioColor}"/>
                            </svg>
                        </span>
                    </div>
                </div>
                ${contentBodyHtml}
                ${commentsHtml}
                ${imagesHtml}
                <div class="day-update-footer" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    ${assigneeHtml}
                    ${productBadgeHtml}
                </div>
            `;

            // Wire single radio button click -> switch status
            const radioBtn = li.querySelector('.status-radio-circle-btn');
            if (radioBtn) {
                radioBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const eventId = radioBtn.getAttribute('data-event-id');
                    if (!eventId || state.updatingStatusIds.has(eventId)) {
                        return; // Ignore concurrent clicks during network flight
                    }

                    state.updatingStatusIds.add(eventId);
                    radioBtn.style.pointerEvents = 'none';
                    radioBtn.style.opacity = '0.5';

                    const currentlyCompleted = String(evt.status || '').toLowerCase() === 'completed' || radioBtn.classList.contains('is-completed');
                    const newStatus = currentlyCompleted ? 'progress' : 'completed';
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    const todayStr = `${y}-${m}-${d}`;

                    // Instant UI update
                    const evObj = state.events.find(ev => String(ev.id) === String(eventId));
                    if (evObj) {
                        evObj.status = newStatus;
                        if (newStatus === 'completed') {
                            evObj.event_date = todayStr;
                            evObj.eventDate = todayStr;
                        }
                    }
                    updateMetrics();
                    populateProductDropdown();
                    renderTasksList();

                    const statusUrl = `/api/events/${eventId}/status?status=${encodeURIComponent(newStatus)}${newStatus === 'completed' ? `&date=${encodeURIComponent(todayStr)}` : ''}`;

                    try {
                        const response = await fetch(statusUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                status: newStatus,
                                date: todayStr
                            })
                        });

                        let res;
                        try {
                            res = await response.json();
                        } catch (jsonErr) {
                            if (!response.ok) {
                                throw new Error(`Server returned HTTP ${response.status}`);
                            }
                        }
                        if (!response.ok) throw new Error((res && (res.error || res.message)) || 'Failed to update status.');

                        if (res && res.data) {
                            const updated = res.data;
                            const idx = state.events.findIndex(e => String(e.id) === String(updated.id));
                            if (idx !== -1) {
                                state.events[idx] = { ...state.events[idx], ...updated };
                            }
                        }
                        updateMetrics();
                        populateProductDropdown();
                        renderTasksList();
                    } catch (err) {
                        console.error('Status update failed:', err);
                        alert('Status update failed: ' + (err.message || err));
                        await loadDashboardData();
                    } finally {
                        state.updatingStatusIds.delete(eventId);
                    }
                });
            }

            // Thumbnail lightbox trigger
            li.querySelectorAll('.day-update-thumb').forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(thumb.getAttribute('data-index'));
                    openLightbox(imageList, index);
                });
            });

            adminTasksList.appendChild(li);
        });
    }

    // --- LIGHTBOX ---
    let lightboxImages = [];
    let currentLightboxIndex = 0;

    function openLightbox(images, startIndex = 0) {
        lightboxImages = images;
        currentLightboxIndex = startIndex;

        lightboxContentWrapper.innerHTML = '';
        images.forEach(imgSrc => {
            const slide = document.createElement('div');
            slide.className = 'lightbox-slide';
            const img = document.createElement('img');
            img.src = imgSrc;
            img.className = 'lightbox-img';
            img.draggable = false;
            slide.appendChild(img);
            lightboxContentWrapper.appendChild(slide);
        });

        lightboxOverlay.classList.add('active');
        updateLightboxCounter();

        setTimeout(() => {
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollLeft = startIndex * slideWidth;
        }, 50);
    }

    function closeLightbox() {
        lightboxOverlay.classList.remove('active');
    }

    function updateLightboxCounter() {
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
    }

    let scrollTimeout;
    lightboxContentWrapper?.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const slideWidth = lightboxContentWrapper.clientWidth;
            if (slideWidth > 0) {
                const newIndex = Math.round(lightboxContentWrapper.scrollLeft / slideWidth);
                if (newIndex !== currentLightboxIndex && newIndex >= 0 && newIndex < lightboxImages.length) {
                    currentLightboxIndex = newIndex;
                    updateLightboxCounter();
                }
            }
        }, 80);
    });

    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => {
        if (currentLightboxIndex > 0) {
            currentLightboxIndex--;
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollTo({ left: currentLightboxIndex * slideWidth, behavior: 'smooth' });
            updateLightboxCounter();
        }
    });

    lightboxNext?.addEventListener('click', () => {
        if (currentLightboxIndex < lightboxImages.length - 1) {
            currentLightboxIndex++;
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollTo({ left: currentLightboxIndex * slideWidth, behavior: 'smooth' });
            updateLightboxCounter();
        }
    });

    lightboxContentWrapper?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget || e.target.classList.contains('lightbox-slide')) {
            closeLightbox();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (!lightboxOverlay.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') lightboxPrev.click();
        else if (e.key === 'ArrowRight') lightboxNext.click();
    });

    // Initial Load
    loadDashboardData();
});
