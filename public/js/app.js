// ============================================
// XITERS — App Controller
// ============================================

(function () {
    'use strict';

    // ---- State ----
    let isAuthenticated = false;
    let currentView = 'home';
    let allLinks = [];
    let deleteTargetId = null;

    // ---- DOM Elements ----
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const hamburgerBtn = $('#hamburgerBtn');
    const sideMenu = $('#sideMenu');
    const overlay = $('#overlay');
    const authIndicator = $('#authIndicator');

    const homeView = $('#homeView');
    const loginView = $('#loginView');
    const adminView = $('#adminView');

    const menuHome = $('#menuHome');
    const menuAdmin = $('#menuAdmin');
    const menuLogout = $('#menuLogout');

    const loginForm = $('#loginForm');
    const loginError = $('#loginError');
    const loginUser = $('#loginUser');
    const loginPass = $('#loginPass');
    const togglePass = $('#togglePass');
    const loginBtn = $('#loginBtn');

    const postForm = $('#postForm');
    const linkTitle = $('#linkTitle');
    const linkUrl = $('#linkUrl');
    const linkDesc = $('#linkDesc');
    const linkCategory = $('#linkCategory');
    const descCount = $('#descCount');
    const postBtn = $('#postBtn');

    const linksContainer = $('#linksContainer');
    const emptyState = $('#emptyState');
    const linkCount = $('#linkCount');
    const searchInput = $('#searchInput');
    const adminLinksList = $('#adminLinksList');
    const adminLinkCount = $('#adminLinkCount');
    const adminUsername = $('#adminUsername');

    const accessLogTable = $('#accessLogTable');
    const accessLogBody = $('#accessLogBody');
    const accessLogCount = $('#accessLogCount');
    const accessLogEmpty = $('#accessLogEmpty');

    const editModal = $('#editModal');
    const editForm = $('#editForm');
    const closeModal = $('#closeModal');
    const cancelEdit = $('#cancelEdit');
    const editId = $('#editId');
    const editTitle = $('#editTitle');
    const editUrl = $('#editUrl');
    const editCategory = $('#editCategory');
    const editDesc = $('#editDesc');

    const deleteModal = $('#deleteModal');
    const closeDeleteModal = $('#closeDeleteModal');
    const cancelDelete = $('#cancelDelete');
    const confirmDelete = $('#confirmDelete');

    const toastContainer = $('#toastContainer');

    // ---- Utility Functions ----
    function showToast(message, type = 'info') {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'agora mesmo';
        if (mins < 60) return `${mins}min atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: days > 365 ? 'numeric' : undefined
        });
    }

    function extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- API Functions ----
    async function apiRequest(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            const data = await res.json();
            return { ok: res.ok, data };
        } catch (err) {
            return { ok: false, data: { message: 'Erro de conexão com o servidor' } };
        }
    }

    async function checkAuth() {
        const { ok, data } = await apiRequest('/api/check-auth');
        isAuthenticated = ok && data.authenticated;
        updateAuthUI();
        return isAuthenticated;
    }

    async function login(username, password) {
        const { ok, data } = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (ok) {
            isAuthenticated = true;
            updateAuthUI();
            showToast('Login realizado com sucesso!', 'success');
            switchView('admin');
            loadLinks();
        } else {
            loginError.textContent = data.message || 'Credenciais inválidas';
            loginPass.value = '';
            loginPass.focus();
        }

        return ok;
    }

    async function logout() {
        await apiRequest('/api/logout', { method: 'POST' });
        isAuthenticated = false;
        updateAuthUI();
        switchView('home');
        showToast('Logout realizado', 'info');
    }

    async function loadLinks() {
        const { ok, data } = await apiRequest('/api/links');
        if (ok) {
            allLinks = data.links;
            renderPublicLinks(allLinks);
            renderAdminLinks(allLinks);
        }
    }

    async function loadAccessLogs() {
        const { ok, data } = await apiRequest('/api/access-log');
        if (ok) {
            renderAccessLogs(data.logs);
        }
    }

    function formatAccessDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    function renderAccessLogs(logs) {
        accessLogCount.textContent = logs.length;

        if (logs.length === 0) {
            accessLogTable.style.display = 'none';
            accessLogEmpty.style.display = 'block';
            return;
        }

        accessLogTable.style.display = 'table';
        accessLogEmpty.style.display = 'none';

        accessLogBody.innerHTML = logs.slice(0, 50).map(log => 
            `<tr>
                <td>${escapeHtml(log.ip)}</td>
                <td>${formatAccessDate(log.timestamp)}</td>
                <td title="${escapeHtml(log.userAgent)}">${truncate(escapeHtml(log.userAgent), 50)}</td>
            </tr>`
        ).join('');
    }

    async function postLink(title, url, description, category) {
        const { ok, data } = await apiRequest('/api/links', {
            method: 'POST',
            body: JSON.stringify({ title, url, description, category })
        });

        if (ok) {
            showToast('Link publicado com sucesso!', 'success');
            loadLinks();
        } else {
            showToast(data.message || 'Erro ao postar link', 'error');
        }

        return ok;
    }

    async function deleteLink(id) {
        const { ok, data } = await apiRequest(`/api/links/${id}`, {
            method: 'DELETE'
        });

        if (ok) {
            showToast('Link removido!', 'success');
            loadLinks();
        } else {
            showToast(data.message || 'Erro ao deletar', 'error');
        }
    }

    async function updateLink(id, payload) {
        const { ok, data } = await apiRequest(`/api/links/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (ok) {
            showToast('Link atualizado!', 'success');
            loadLinks();
        } else {
            showToast(data.message || 'Erro ao atualizar', 'error');
        }

        return ok;
    }

    // ---- Render Functions ----
    function renderPublicLinks(links) {
        const count = links.length;
        linkCount.textContent = `${count} link${count !== 1 ? 's' : ''}`;

        if (count === 0) {
            linksContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        linksContainer.innerHTML = links.map(link => 
            `<article class="link-card">
                <div class="link-card-header">
                    <h3 class="link-card-title">${escapeHtml(link.title)}</h3>
                    <span class="link-card-category">${escapeHtml(link.category || 'Geral')}</span>
                </div>
                ${link.description ? `<p class="link-card-desc">${escapeHtml(link.description)}</p>` : ''}
                <div class="link-card-footer">
                    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-card-url">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        <span>${extractDomain(link.url)}</span>
                    </a>
                    <span class="link-card-date">${formatDate(link.createdAt)}</span>
                </div>
            </article>`
        ).join('');
    }

    function renderAdminLinks(links) {
        adminLinkCount.textContent = links.length;

        if (links.length === 0) {
            adminLinksList.innerHTML = '<div class="admin-empty">Nenhum link postado ainda.</div>';
            return;
        }

        adminLinksList.innerHTML = links.map(link => 
            `<div class="admin-link-item" data-id="${link.id}">
                <div class="admin-link-info">
                    <h4>${escapeHtml(link.title)}</h4>
                    <span>${extractDomain(link.url)} · ${formatDate(link.createdAt)}</span>
                </div>
                <div class="admin-link-actions">
                    <button class="action-btn edit" onclick="window.xiters.editLink('${link.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="action-btn delete" onclick="window.xiters.confirmDelete('${link.id}')" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>`
        ).join('');
    }

    // ---- UI Functions ----
    function updateAuthUI() {
        if (isAuthenticated) {
            authIndicator.classList.add('online');
            menuLogout.style.display = 'flex';
            menuAdmin.querySelector('span').textContent = 'Painel Admin';
        } else {
            authIndicator.classList.remove('online');
            menuLogout.style.display = 'none';
            menuAdmin.querySelector('span').textContent = 'Painel Admin';
        }
    }

    function switchView(view) {
        currentView = view;
        homeView.classList.remove('active');
        loginView.classList.remove('active');
        adminView.classList.remove('active');

        // Update menu active state
        $$('.menu-item').forEach(item => item.classList.remove('active-item'));

        switch (view) {
            case 'home':
                homeView.classList.add('active');
                menuHome.classList.add('active-item');
                break;
            case 'login':
                loginView.classList.add('active');
                menuAdmin.classList.add('active-item');
                loginError.textContent = '';
                loginUser.value = '';
                loginPass.value = '';
                setTimeout(() => loginUser.focus(), 300);
                break;
            case 'admin':
                adminView.classList.add('active');
                menuAdmin.classList.add('active-item');
                adminUsername.textContent = 'admin';
                loadAccessLogs();
                break;
        }

        closeSideMenu();
    }

    function toggleSideMenu() {
        const isActive = sideMenu.classList.contains('active');
        if (isActive) {
            closeSideMenu();
        } else {
            sideMenu.classList.add('active');
            overlay.classList.add('active');
            hamburgerBtn.classList.add('active');
        }
    }

    function closeSideMenu() {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
    }

    function closePanels() {
        closeSideMenu();
        switchView('home');
    }

    function openEditModal(link) {
        editId.value = link.id;
        editTitle.value = link.title;
        editUrl.value = link.url;
        editCategory.value = link.category || '';
        editDesc.value = link.description || '';
        editModal.classList.add('active');
    }

    function closeEditModal() {
        editModal.classList.remove('active');
    }

    function openDeleteModal(id) {
        deleteTargetId = id;
        deleteModal.classList.add('active');
    }

    function closeDeleteModalFn() {
        deleteModal.classList.remove('active');
        deleteTargetId = null;
    }

    // ---- Event Listeners ----
    hamburgerBtn.addEventListener('click', toggleSideMenu);
    overlay.addEventListener('click', closeSideMenu);

    menuHome.addEventListener('click', () => switchView('home'));

    menuAdmin.addEventListener('click', () => {
        if (isAuthenticated) {
            switchView('admin');
        } else {
            switchView('login');
        }
    });

    menuLogout.addEventListener('click', logout);

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div><span>Entrando...</span>';

        await login(loginUser.value.trim(), loginPass.value);

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Entrar</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    });

    togglePass.addEventListener('click', () => {
        const type = loginPass.type === 'password' ? 'text' : 'password';
        loginPass.type = type;
    });

    // Post link
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        postBtn.disabled = true;
        postBtn.innerHTML = '<div class="spinner"></div><span>Publicando...</span>';

        const ok = await postLink(
            linkTitle.value.trim(),
            linkUrl.value.trim(),
            linkDesc.value.trim(),
            linkCategory.value.trim() || 'Geral'
        );

        if (ok) {
            postForm.reset();
            descCount.textContent = '0';
        }

        postBtn.disabled = false;
        postBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg><span>Publicar Link</span>';
    });

    // Char count
    linkDesc.addEventListener('input', () => {
        descCount.textContent = linkDesc.value.length;
    });

    // Search
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            renderPublicLinks(allLinks);
            return;
        }

        const filtered = allLinks.filter(link =>
            link.title.toLowerCase().includes(query) ||
            (link.description && link.description.toLowerCase().includes(query)) ||
            link.url.toLowerCase().includes(query) ||
            (link.category && link.category.toLowerCase().includes(query))
        );

        renderPublicLinks(filtered);
    });

    // Edit modal
    closeModal.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ok = await updateLink(editId.value, {
            title: editTitle.value.trim(),
            url: editUrl.value.trim(),
            category: editCategory.value.trim() || 'Geral',
            description: editDesc.value.trim()
        });

        if (ok) closeEditModal();
    });

    // Delete modal
    closeDeleteModal.addEventListener('click', closeDeleteModalFn);
    cancelDelete.addEventListener('click', closeDeleteModalFn);
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModalFn();
    });

    confirmDelete.addEventListener('click', async () => {
        if (deleteTargetId) {
            await deleteLink(deleteTargetId);
            closeDeleteModalFn();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSideMenu();
            closeEditModal();
            closeDeleteModalFn();
        }
    });

    // Brand click
    document.querySelector('.navbar-brand').addEventListener('click', () => {
        switchView('home');
        closeSideMenu();
    });

    // ---- Public API (for inline onclick) ----
    window.xiters = {
        editLink: (id) => {
            const link = allLinks.find(l => l.id === id);
            if (link) openEditModal(link);
        },
        confirmDelete: (id) => {
            openDeleteModal(id);
        }
    };

    // Make closePanels accessible
    window.closePanels = closePanels;

    // ---- Init ----
    async function init() {
        await checkAuth();
        await loadLinks();
        switchView('home');
    }

    init();

})();
