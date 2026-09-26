document.addEventListener('DOMContentLoaded', () => {
    // Helper function to escape HTML special characters
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Auto-resize textarea vertically based on content with scrollable max height
    function autoResizeTextarea(el, minHeight = 44, maxHeight = 140) {
        if (!el) return;
        el.style.height = 'auto';
        const scrollH = el.scrollHeight;
        const newHeight = Math.min(maxHeight, Math.max(minHeight, scrollH));
        el.style.height = newHeight + 'px';
        if (scrollH > maxHeight) {
            el.style.overflowY = 'auto';
        } else {
            el.style.overflowY = 'hidden';
        }
    }

    // --- USER SESSION (Direct workspace access) ---
    const userJson = localStorage.getItem('user');
    let currentUser = { id: 1, userId: 1, fullName: 'Admin', email: 'admin123@gmail.com', role: 'Administrator' };
    if (userJson) {
        try {
            const parsed = JSON.parse(userJson);
            currentUser = { ...currentUser, ...parsed, userId: parsed.id || parsed.userId || 1 };
        } catch (e) { }
    } else {
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('token', 'workspace-token');
    }

    // Admin Portal button is common and accessible for all users
    const adminPortalBtn = document.getElementById('adminPortalBtn');
    if (adminPortalBtn) {
        adminPortalBtn.style.display = 'inline-flex';
    }

    // --- DOM ELEMENTS ---
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = themeToggleBtn?.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn?.querySelector('.moon-icon');

    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const toggleOnlineUsersBtn = document.getElementById('toggleOnlineUsersBtn');
    const onlineUsersChevron = document.getElementById('onlineUsersChevron');
    const calendarDaysGrid = document.getElementById('calendarDaysGrid');
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    const onlineUsersList = document.getElementById('onlineUsersList');
    const noUpcomingText = document.getElementById('noUpcomingText');

    // Filters
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Event Modal
    const eventModalOverlay = document.getElementById('eventModalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const eventForm = document.getElementById('eventForm');
    const eventIdInput = document.getElementById('eventId');
    const eventTokenIdInput = document.getElementById('eventTokenId');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventCommentsInput = document.getElementById('eventComments');
    const eventMemberIdSelect = document.getElementById('eventMemberId');
    const eventStatusSelect = document.getElementById('eventStatus');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const saveEventBtn = document.getElementById('saveEventBtn');

    // Day Updates Full Page View Containers
    const calendarViewContainer = document.getElementById('calendarViewContainer');
    const dayViewContainer = document.getElementById('dayViewContainer');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const dayUpdatesTitle = document.getElementById('dayUpdatesTitle');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const addUpdateBtn = document.getElementById('addUpdateBtn');
    const tableHeaderAddBtn = document.getElementById('tableHeaderAddBtn');
    const productFilterSelect = document.getElementById('productFilterSelect');
    const dayUpdatesTableBody = document.getElementById('dayUpdatesTableBody');

    // Read-only Details elements
    const eventDetailsView = document.getElementById('eventDetailsView');
    const detailsTokenId = document.getElementById('detailsTokenId');
    const detailsSubject = document.getElementById('detailsSubject');
    const detailsContent = document.getElementById('detailsContent');
    const detailsComments = document.getElementById('detailsComments');
    const detailsProduct = document.getElementById('detailsProduct');
    const detailsAssignee = document.getElementById('detailsAssignee');
    const detailsStatus = document.getElementById('detailsStatus');
    const detailsImagesGroup = document.getElementById('detailsImagesGroup');
    const detailsImagesList = document.getElementById('detailsImagesList');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');

    // Upload Elements
    const imageUploadZone = document.getElementById('imageUploadZone');
    const attachedImagesPreview = document.getElementById('attachedImagesPreview');
    const imageFileInput = document.getElementById('imageFileInput');

    // Lightbox elements
    const lightboxOverlay = document.getElementById('lightboxOverlay');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxContentWrapper = document.getElementById('lightboxContentWrapper');
    const lightboxCounter = document.getElementById('lightboxCounter');

    // --- STATE MANAGER ---
    const state = {
        theme: localStorage.getItem('lms_portal_theme') || 'light',
        currentDate: new Date(), // Active month/year view
        events: [],              // All events loaded from backend
        products: [],            // List of available products
        activeFilter: 'all',     // Active color category filter
        selectedProductFilter: 'all', // Active product filter for day updates
        selectedDate: '',        // Stored date for create operation (YYYY-MM-DD)
        users: [],               // Cached list of registered users
        attachedImages: [],      // Base64 image strings currently attached to form
        newUpdateImages: [],     // Images attached to top Excel input row
        activeInlineId: null,    // ID of event currently edited inline, or 'NEW'
        updatingStatusIds: new Set() // Set of event IDs currently in-flight
    };

    // --- INITIALIZE VIEWS ---
    applyTheme(state.theme);
    if (userNameEl) userNameEl.textContent = currentUser.fullName || 'Admin';
    if (userRoleEl) userRoleEl.textContent = currentUser.role || 'Administrator';
    if (userAvatarEl) userAvatarEl.textContent = (currentUser.fullName || 'A').charAt(0).toUpperCase();

    // Initialize year Select options (10 years back and 10 years forward)
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        for (let y = currentYear - 10; y <= currentYear + 10; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }
    }

    // Change listeners for Month and Year Select dropdowns
    monthSelect?.addEventListener('change', () => {
        state.currentDate.setMonth(parseInt(monthSelect.value));
        renderCalendar();
    });

    yearSelect?.addEventListener('change', () => {
        state.currentDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar();
    });

    // Online Users panel collapsible toggle logic
    let onlineUsersCollapsed = true;
    toggleOnlineUsersBtn?.addEventListener('click', () => {
        onlineUsersCollapsed = !onlineUsersCollapsed;
        if (onlineUsersList) {
            onlineUsersList.style.display = onlineUsersCollapsed ? 'none' : 'flex';
        }
        if (onlineUsersChevron) {
            onlineUsersChevron.style.transform = onlineUsersCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
    });

    // --- THEME MANAGEMENT ---
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

    // --- CALENDAR RENDER LOGIC ---
    function renderCalendar() {
        if (!calendarDaysGrid) return;
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();

        // Update Month/Year Select Dropdowns
        if (monthSelect) monthSelect.value = month;
        if (yearSelect) yearSelect.value = year;

        // Clear grid days
        calendarDaysGrid.innerHTML = '';

        // Get first day of the month (0 = Sunday, 1 = Monday...)
        const firstDayIndex = new Date(year, month, 1).getDay();

        // Get total days in current month
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Get total days in previous month
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        // Padding days from previous month
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevMonthTotalDays - i + 1;
            const prevMonthDate = new Date(year, month - 1, dayNum);
            const dateStr = formatDateStr(prevMonthDate);
            const dayCell = createDayCell(dayNum, dateStr, false);
            calendarDaysGrid.appendChild(dayCell);
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = formatDateStr(dateObj);
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayCell = createDayCell(day, dateStr, true, isToday);
            calendarDaysGrid.appendChild(dayCell);
        }

        // Padding days from next month (fill up grid to 42 cells)
        const totalCellsSoFar = firstDayIndex + totalDays;
        const remainingCells = 42 - totalCellsSoFar;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(year, month + 1, day);
            const dateStr = formatDateStr(nextMonthDate);
            const dayCell = createDayCell(day, dateStr, false);
            calendarDaysGrid.appendChild(dayCell);
        }

        updateUpcomingEvents();
    }

    function formatDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function createDayCell(dayNum, dateStr, isCurrentMonth, isToday = false) {
        const cell = document.createElement('div');
        cell.classList.add('calendar-day');
        if (!isCurrentMonth) cell.classList.add('other-month');
        if (isToday) cell.classList.add('today');

        // Day Cell header markup
        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');

        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.classList.add('day-number');
        dayNumberSpan.textContent = dayNum;

        dayHeader.appendChild(dayNumberSpan);
        cell.appendChild(dayHeader);

        // Filter events for this day
        const todayStr = formatDateStr(new Date());
        const dayEvents = state.events.filter(e => {
            const evDate = e.event_date || e.eventDate || '';
            if (e.status === 'completed') {
                return evDate === dateStr;
            } else { // progress
                if (evDate >= todayStr) {
                    return evDate === dateStr;
                } else {
                    return dateStr === todayStr;
                }
            }
        });

        // Add a clean, vibrant blue marker dot only on the current date (today) to indicate the current date
        if (isToday) {
            const dot = document.createElement('div');
            dot.className = 'calendar-event-dot';
            dot.style.width = '7px';
            dot.style.height = '7px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = '#2563eb';
            dot.style.margin = '6px auto 0 auto';
            dot.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.35)';
            dot.style.display = 'block';
            cell.appendChild(dot);
        }

        // Grid day cell click handler -> opens Day Updates full page view
        cell.addEventListener('click', () => {
            openDayUpdatesModal(dateStr);
        });

        return cell;
    }

    // --- NAVIGATION EVENTS ---
    prevMonthBtn?.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn?.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCalendar();
    });

    // --- CATEGORY FILTERS ---
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.activeFilter = btn.dataset.filter;
            renderCalendar();
        });
    });

    // --- PROGRESS EVENTS SIDEBAR LOGIC (Grouped by Product & Clickable Filter) ---
    function updateUpcomingEvents() {
        if (!upcomingEventsList) return;
        upcomingEventsList.innerHTML = '';

        // Filter progress events
        const progressEvents = state.events.filter(e => e.status === 'progress');

        if (progressEvents.length === 0 && state.products.length === 0) {
            upcomingEventsList.appendChild(createNoUpcomingListItem('No progress events'));
            return;
        }

        // Map counts by product
        const productCounts = {};
        state.products.forEach(p => {
            productCounts[p.id] = { id: p.id, name: p.name, count: 0 };
        });

        let unassignedCount = 0;

        progressEvents.forEach(evt => {
            const pId = evt.product_id != null ? evt.product_id : evt.productId;
            const pName = evt.product_name || evt.productName;

            if (pId && productCounts[pId]) {
                productCounts[pId].count++;
            } else if (pName) {
                const found = state.products.find(p => p.name === pName);
                if (found) {
                    productCounts[found.id].count++;
                } else {
                    unassignedCount++;
                }
            } else {
                unassignedCount++;
            }
        });

        const productItems = Object.values(productCounts);

        if (productItems.length === 0 && unassignedCount === 0) {
            upcomingEventsList.appendChild(createNoUpcomingListItem('No progress events'));
            return;
        }

        const isDayViewActive = dayViewContainer && dayViewContainer.style.display !== 'none';

        productItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'upcoming-item';
            li.dataset.productId = String(item.id);

            const isSelected = isDayViewActive && (String(state.selectedProductFilter) === String(item.id));

            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            li.style.padding = '0.55rem 0.5rem';
            li.style.cursor = isDayViewActive ? 'pointer' : 'default';
            li.style.borderRadius = '6px';
            li.style.transition = 'all 0.15s ease';
            li.style.marginBottom = '3px';
            li.style.border = 'none';

            if (isSelected) {
                li.style.background = 'rgba(37, 99, 235, 0.18)';
                li.style.borderLeft = '3px solid #2563eb';
                li.style.paddingLeft = '0.4rem';
            } else {
                li.style.background = 'transparent';
                li.style.borderBottom = '1px solid var(--border)';
            }

            li.innerHTML = `
                <div style="font-weight: 600; color: ${isSelected ? '#2563eb' : 'var(--text)'}; font-size: 0.92rem;">${escapeHtml(item.name)}</div>
                <div style="font-weight: 800; color: ${isSelected ? '#2563eb' : 'var(--accent)'}; background: ${isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(96, 165, 250, 0.15)'}; padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 1.05rem; min-width: 30px; text-align: center; white-space: nowrap;">
                    ${item.count}
                </div>
            `;

            // Hover effect only when in updates page
            li.addEventListener('mouseenter', () => {
                const dayViewOpen = dayViewContainer && dayViewContainer.style.display !== 'none';
                if (dayViewOpen && String(state.selectedProductFilter) !== String(item.id)) {
                    li.style.background = 'rgba(148, 163, 184, 0.1)';
                }
            });
            li.addEventListener('mouseleave', () => {
                const dayViewOpen = dayViewContainer && dayViewContainer.style.display !== 'none';
                if (dayViewOpen && String(state.selectedProductFilter) !== String(item.id)) {
                    li.style.background = 'transparent';
                }
            });

            // Click listener -> Filter updates by this product ONLY when in day updates page
            li.addEventListener('click', () => {
                const dayViewOpen = dayViewContainer && dayViewContainer.style.display !== 'none';
                if (!dayViewOpen) return; // Product filter only works inside the update page

                const targetId = String(item.id);
                if (state.selectedProductFilter === targetId) {
                    state.selectedProductFilter = 'all';
                    if (productFilterSelect) productFilterSelect.value = 'all';
                } else {
                    state.selectedProductFilter = targetId;
                    if (productFilterSelect) productFilterSelect.value = targetId;
                }

                renderDayUpdatesList(state.selectedDate);
                updateUpcomingEvents();
            });

            upcomingEventsList.appendChild(li);
        });

        if (unassignedCount > 0) {
            const li = document.createElement('li');
            li.className = 'upcoming-item';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            li.style.padding = '0.55rem 0.5rem';
            li.style.background = 'transparent';
            li.style.border = 'none';
            li.style.borderBottom = '1px solid var(--border)';
            li.style.marginBottom = '0';
            li.style.borderRadius = '0';

            li.innerHTML = `
                <div style="font-weight: 600; color: var(--muted); font-size: 0.92rem;">Unassigned Product</div>
                <div style="font-weight: 800; color: var(--muted); background: rgba(148, 163, 184, 0.15); padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 1.05rem; min-width: 30px; text-align: center; white-space: nowrap;">
                    ${unassignedCount}
                </div>
            `;

            upcomingEventsList.appendChild(li);
        }
    }

    function createNoUpcomingListItem(text) {
        const li = document.createElement('li');
        li.classList.add('subtitle');
        li.style.paddingLeft = '0.5rem';
        li.id = 'noUpcomingText';
        li.textContent = text || 'No progress events';
        return li;
    }

    // --- MODAL UTILITIES ---
    function openModal() {
        if (eventModalOverlay) eventModalOverlay.classList.add('active');
    }

    function closeModal() {
        if (eventModalOverlay) eventModalOverlay.classList.remove('active');
        if (eventForm) eventForm.reset();
        if (eventIdInput) eventIdInput.value = '';
        state.attachedImages = [];
        renderAttachedImagesPreviews();
    }

    modalCloseBtn?.addEventListener('click', closeModal);
    cancelEventBtn?.addEventListener('click', closeModal);
    closeDetailsBtn?.addEventListener('click', closeModal);

    // Close modal by clicking outside
    eventModalOverlay?.addEventListener('click', (e) => {
        if (e.target === eventModalOverlay) {
            closeModal();
        }
    });

    // --- FILE UPLOADS & PASTE LOGIC ---
    imageUploadZone?.addEventListener('click', () => imageFileInput?.click());

    imageFileInput?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                addAttachedImage(event.target.result);
            };
            reader.readAsDataURL(file);
        });
        imageFileInput.value = ''; // Reset file input
    });

    // Window level clipboard paste event listener
    window.addEventListener('paste', (e) => {
        const inlineRow = document.querySelector('.excel-new-update-row');
        const isModalActive = eventModalOverlay && eventModalOverlay.classList.contains('active') && eventDetailsView && eventDetailsView.classList.contains('hidden');

        if (!inlineRow && !isModalActive) {
            return;
        }

        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (inlineRow) {
                        state.newUpdateImages.push(event.target.result);
                        renderExcelNewPreviews();
                    } else {
                        addAttachedImage(event.target.result);
                    }
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    function addAttachedImage(base64Str) {
        const img = new Image();
        img.onload = () => {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            state.attachedImages.push(optimizedBase64);
            renderAttachedImagesPreviews();
        };
        img.onerror = () => {
            state.attachedImages.push(base64Str);
            renderAttachedImagesPreviews();
        };
        img.src = base64Str;
    }

    function renderAttachedImagesPreviews() {
        if (!attachedImagesPreview) return;
        attachedImagesPreview.innerHTML = '';
        state.attachedImages.forEach((img, idx) => {
            const container = document.createElement('div');
            container.className = 'preview-img-container';

            const image = document.createElement('img');
            image.src = img;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-preview-btn';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.attachedImages.splice(idx, 1);
                renderAttachedImagesPreviews();
            });

            container.appendChild(image);
            container.appendChild(deleteBtn);
            attachedImagesPreview.appendChild(container);
        });
    }

    // --- LIGHTBOX CONTROLLER ---
    let lightboxImages = [];
    let currentLightboxIndex = 0;

    function openLightbox(images, startIndex = 0) {
        if (!lightboxContentWrapper || !lightboxOverlay) return;
        lightboxImages = images;
        currentLightboxIndex = startIndex;

        // Generate slides HTML
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

        // Scroll immediately to the selected slide
        setTimeout(() => {
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollLeft = startIndex * slideWidth;
        }, 50);
    }

    function closeLightbox() {
        if (lightboxOverlay) lightboxOverlay.classList.remove('active');
    }

    function updateLightboxCounter() {
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
        }
    }

    // Scroll snap tracking to update counter and current index
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

    // Lightbox Controls
    lightboxClose?.addEventListener('click', closeLightbox);

    lightboxPrev?.addEventListener('click', () => {
        if (currentLightboxIndex > 0) {
            currentLightboxIndex--;
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollTo({
                left: currentLightboxIndex * slideWidth,
                behavior: 'smooth'
            });
            updateLightboxCounter();
        }
    });

    lightboxNext?.addEventListener('click', () => {
        if (currentLightboxIndex < lightboxImages.length - 1) {
            currentLightboxIndex++;
            const slideWidth = lightboxContentWrapper.clientWidth;
            lightboxContentWrapper.scrollTo({
                left: currentLightboxIndex * slideWidth,
                behavior: 'smooth'
            });
            updateLightboxCounter();
        }
    });

    // Close lightbox by clicking backdrop
    lightboxContentWrapper?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget || e.target.classList.contains('lightbox-slide')) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (!lightboxOverlay || !lightboxOverlay.classList.contains('active')) return;
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            lightboxPrev?.click();
        } else if (e.key === 'ArrowRight') {
            lightboxNext?.click();
        }
    });

    // --- DAY UPDATES FULL PAGE VIEW & INLINE EDITING ---
    function openDayUpdatesModal(dateStr) {
        state.selectedDate = dateStr;
        state.selectedProductFilter = 'all';
        if (productFilterSelect) productFilterSelect.value = 'all';

        // Format date string for title (e.g. August 25, 2026)
        const dateObj = new Date(dateStr + 'T00:00:00');
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }) : dateStr;
        if (dayUpdatesTitle) dayUpdatesTitle.textContent = `Updates for ${formattedDate}`;

        state.activeInlineId = null;

        // Toggle view container visibilities FIRST
        if (calendarViewContainer) calendarViewContainer.style.display = 'none';
        if (dayViewContainer) {
            dayViewContainer.style.display = 'block';
            dayViewContainer.scrollTop = 0;
        }

        updateProductFilterDropdown();
        updateUpcomingEvents();
        renderDayUpdatesList(dateStr);
    }

    function closeDayUpdatesModal() {
        if (calendarViewContainer) calendarViewContainer.style.display = 'flex';
        if (dayViewContainer) dayViewContainer.style.display = 'none';
        state.activeInlineId = null;
        state.selectedProductFilter = 'all';
        if (productFilterSelect) productFilterSelect.value = 'all';
        updateUpcomingEvents();
        renderCalendar();
    }

    backToCalendarBtn?.addEventListener('click', closeDayUpdatesModal);

    function navigateDay(offset) {
        let curDateStr = state.selectedDate;
        if (!curDateStr) {
            curDateStr = formatDateStr(new Date());
        }
        let currentDate;
        const parts = curDateStr.split('-');
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            currentDate = new Date(y, m - 1, d);
        } else {
            const parsed = new Date(curDateStr);
            currentDate = !isNaN(parsed.getTime()) ? parsed : new Date();
        }
        currentDate.setDate(currentDate.getDate() + offset);
        const newDateStr = formatDateStr(currentDate);

        // Keep month/year dropdowns and active month state synchronized
        state.currentDate = new Date(currentDate);
        if (monthSelect) monthSelect.value = String(currentDate.getMonth());
        if (yearSelect) yearSelect.value = String(currentDate.getFullYear());

        openDayUpdatesModal(newDateStr);
    }

    window.navigateDay = navigateDay;
    prevDayBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateDay(-1);
    });
    nextDayBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateDay(1);
    });

    function renderExcelNewPreviews() {
        const previewContainer = document.getElementById('excelNewImagesPreview');
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        state.newUpdateImages.forEach((img, idx) => {
            const container = document.createElement('div');
            container.className = 'preview-img-container';
            container.style.width = '32px';
            container.style.height = '32px';
            const image = document.createElement('img');
            image.src = img;
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-preview-btn';
            deleteBtn.style.width = '14px';
            deleteBtn.style.height = '14px';
            deleteBtn.style.fontSize = '10px';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.newUpdateImages.splice(idx, 1);
                renderExcelNewPreviews();
            });
            container.appendChild(image);
            container.appendChild(deleteBtn);
            previewContainer.appendChild(container);
        });
    }

    // Auto-save update when clicking Add + and prepare next new update row
    let isNewUpdateSaving = false;

    function resetSaveButtonStates() {
        isNewUpdateSaving = false;
        const addHeaderBtn = document.getElementById('tableHeaderAddBtn');
        const topAddBtn = document.getElementById('addUpdateBtn');
        const addRowBtn = document.getElementById('excelNewAddRowBtn');

        if (addHeaderBtn) {
            addHeaderBtn.disabled = false;
            addHeaderBtn.textContent = 'ADD +';
        }
        if (topAddBtn) {
            topAddBtn.disabled = false;
            const span = topAddBtn.querySelector('span');
            if (span) span.textContent = 'Add Update';
        }
        if (addRowBtn) {
            addRowBtn.disabled = false;
            addRowBtn.textContent = '+ Add';
        }
    }

    async function handleAutoSaveAndAdd() {
        // Immediate synchronous lock check to ignore rapid successive Enter presses or clicks
        if (isNewUpdateSaving) return;

        const inputTr = document.querySelector('.excel-new-update-row:not([data-is-edit="true"])');
        if (inputTr && inputTr.dataset.isSaving === 'true') return;

        const taskInp = document.getElementById('excelNewTask');
        const commentsInp = document.getElementById('excelNewComments');
        const assignSel = document.getElementById('excelNewAssign');
        const statusSel = document.getElementById('excelNewStatus');
        const productSel = document.getElementById('excelNewProduct');

        if (!taskInp || !assignSel || !statusSel || !productSel) return;

        // Reset previous validation borders
        taskInp.style.borderColor = '';
        if (commentsInp) commentsInp.style.borderColor = '';
        assignSel.style.borderColor = '';
        productSel.style.borderColor = '';

        const content = taskInp.value.trim();
        const comments = commentsInp ? commentsInp.value.trim() : '';
        const memberId = assignSel.value;
        const status = statusSel.value || 'progress';
        const productId = productSel.value;
        const attachedImages = state.newUpdateImages || [];

        const missing = [];
        if (!content) {
            missing.push('Task');
            taskInp.style.borderColor = '#ef4444';
        }
        if (!memberId) {
            missing.push('Assign To');
            assignSel.style.borderColor = '#ef4444';
        }
        if (!productId) {
            missing.push('Product');
            productSel.style.borderColor = '#ef4444';
        }

        if (missing.length > 0) {
            alert(`Please fill in mandatory fields: ${missing.join(', ')}.`);
            if (!content) taskInp.focus();
            else if (!memberId) assignSel.focus();
            else if (!productId) productSel.focus();
            return;
        }

        // Duplicate check: do not allow exact duplicate tickets
        const isDuplicate = state.events.some(e => {
            const evDate = e.event_date || e.eventDate || '';
            const pId = e.product_id != null ? String(e.product_id) : (e.productId != null ? String(e.productId) : '');
            const desc = (e.description || e.title || '').trim();
            return evDate === state.selectedDate &&
                   pId === String(productId) &&
                   desc === content;
        });

        if (isDuplicate) {
            alert('A duplicate ticket with this exact content already exists for this date and product.');
            taskInp.style.borderColor = '#ef4444';
            taskInp.focus();
            return;
        }

        // IMMEDIATELY LOCK THE ROW SYNCHRONOUSLY BEFORE NETWORK ACTIVITY
        isNewUpdateSaving = true;
        if (inputTr) {
            inputTr.dataset.isSaving = 'true';
            inputTr.style.pointerEvents = 'none';
            inputTr.style.opacity = '0.6';
        }
        taskInp.disabled = true;
        if (commentsInp) commentsInp.disabled = true;
        assignSel.disabled = true;
        statusSel.disabled = true;
        productSel.disabled = true;

        const addHeaderBtn = document.getElementById('tableHeaderAddBtn');
        const topAddBtn = document.getElementById('addUpdateBtn');
        const addRowBtn = document.getElementById('excelNewAddRowBtn');
        if (addHeaderBtn) {
            addHeaderBtn.disabled = true;
            addHeaderBtn.textContent = 'Saving...';
        }
        if (topAddBtn) {
            topAddBtn.disabled = true;
            const span = topAddBtn.querySelector('span');
            if (span) span.textContent = 'Saving...';
        }
        if (addRowBtn) {
            addRowBtn.disabled = true;
            addRowBtn.textContent = 'Saving...';
        }

        const payload = {
            userId: currentUser.userId || currentUser.id || 1,
            title: content || 'Update',
            description: content,
            comments: comments,
            tokenId: '',
            memberId: parseInt(memberId),
            status: status,
            productId: parseInt(productId),
            eventDate: state.selectedDate,
            images: JSON.stringify(attachedImages)
        };

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();
            if (!response.ok) throw new Error(res.error || 'Failed to save update.');

            // Clear input row state
            state.newUpdateImages = [];

            // Directly update state.events with the newly saved event (from response or constructed)
            const savedItem = res.data;
            if (savedItem && typeof savedItem === 'object' && savedItem.id) {
                state.events.unshift(savedItem);
            } else {
                const assignedUser = state.users.find(u => String(u.id) === String(memberId));
                const selectedProd = state.products.find(p => String(p.id) === String(productId));
                const newEventObj = {
                    id: (savedItem && savedItem.id) ? savedItem.id : (typeof savedItem === 'number' ? savedItem : Date.now()),
                    user_id: currentUser.userId || currentUser.id || 1,
                    userId: currentUser.userId || currentUser.id || 1,
                    title: content || 'Update',
                    description: content,
                    comments: comments,
                    tokenId: '',
                    member_id: parseInt(memberId),
                    memberId: parseInt(memberId),
                    product_id: parseInt(productId),
                    productId: parseInt(productId),
                    product_name: selectedProd ? selectedProd.name : 'General',
                    productName: selectedProd ? selectedProd.name : 'General',
                    status: status,
                    event_date: state.selectedDate,
                    eventDate: state.selectedDate,
                    images: JSON.stringify(attachedImages),
                    created_at: new Date().toISOString()
                };
                state.events.unshift(newEventObj);
            }

            // Immediately render updated table with new empty row ready at top (ZERO extra network roundtrips)
            renderCalendar();
            updateUpcomingEvents();
            renderDayUpdatesList(state.selectedDate);
            resetSaveButtonStates();

            setTimeout(() => {
                const newTaskInp = document.getElementById('excelNewTask');
                if (newTaskInp) newTaskInp.focus();
            }, 30);
        } catch (err) {
            // Unlock row on error so user can edit and retry
            if (inputTr) {
                inputTr.dataset.isSaving = 'false';
                inputTr.style.pointerEvents = 'auto';
                inputTr.style.opacity = '1';
            }
            taskInp.disabled = false;
            if (commentsInp) commentsInp.disabled = false;
            assignSel.disabled = false;
            statusSel.disabled = false;
            productSel.disabled = false;
            alert(err.message || 'Error adding update.');
        } finally {
            resetSaveButtonStates();
        }
    }

    addUpdateBtn?.addEventListener('click', handleAutoSaveAndAdd);
    tableHeaderAddBtn?.addEventListener('click', handleAutoSaveAndAdd);

    function renderDayUpdatesList(dateStr) {
        if (!dayUpdatesTableBody) return;
        dayUpdatesTableBody.innerHTML = '';
        const todayStr = formatDateStr(new Date());

        const dayEvents = state.events.filter(e => {
            let matchesDate = false;
            const evDate = e.event_date || e.eventDate || '';
            if (e.status === 'completed') {
                matchesDate = (evDate === dateStr);
            } else { // progress
                if (evDate >= todayStr) {
                    matchesDate = (evDate === dateStr);
                } else {
                    matchesDate = (dateStr === todayStr);
                }
            }

            if (!matchesDate) return false;

            if (!state.selectedProductFilter || state.selectedProductFilter === 'all') {
                return true;
            }

            const pId = e.product_id != null ? String(e.product_id) : (e.productId != null ? String(e.productId) : '');
            const pName = e.product_name || e.productName || '';

            return pId === String(state.selectedProductFilter) || pName === state.selectedProductFilter;
        });

        // Build Member dropdown options
        let assignOptionsHtml = '<option value="">-- Select Member --</option>';
        state.users.forEach(u => {
            assignOptionsHtml += `<option value="${u.id}">${escapeHtml(u.full_name || u.fullName)}</option>`;
        });

        // Build Product dropdown options (pre-select active product filter if selected)
        let productOptionsHtml = '<option value="">-- Select Product --</option>';
        state.products.forEach(p => {
            const isSelected = (state.selectedProductFilter && state.selectedProductFilter !== 'all' && String(p.id) === String(state.selectedProductFilter)) ? 'selected' : '';
            productOptionsHtml += `<option value="${p.id}" ${isSelected}>${escapeHtml(p.name)}</option>`;
        });

        // 1. ALWAYS RENDER TOP EXCEL INPUT ROW FIRST
        const inputTr = document.createElement('tr');
        inputTr.className = 'excel-new-update-row';
        inputTr.innerHTML = `
            <!-- 1. Task Column -->
            <td>
                <textarea id="excelNewTask" class="excel-cell-input" placeholder="Enter update details here..."></textarea>
                <div id="excelNewImagesPreview" class="attached-images-preview inline-images-preview" style="margin-top: 2px; display: flex; flex-wrap: wrap; gap: 4px;"></div>
            </td>

            <!-- 2. Status Column -->
            <td>
                <select id="excelNewStatus" class="excel-cell-select">
                    <option value="progress" selected>In Progress</option>
                    <option value="completed">Completed</option>
                </select>
            </td>

            <!-- 3. Assign to Column -->
            <td>
                <select id="excelNewAssign" class="excel-cell-select">
                    ${assignOptionsHtml}
                </select>
            </td>

            <!-- 4. Product Column -->
            <td>
                <select id="excelNewProduct" class="excel-cell-select">
                    ${productOptionsHtml}
                </select>
            </td>

            <!-- 5. Comments Column (Textarea Input Box) -->
            <td>
                <textarea id="excelNewComments" class="excel-cell-input excel-comment-input" placeholder="Add comment..."></textarea>
            </td>

            <!-- 6. Actions / Attachment Column -->
            <td style="text-align: center; vertical-align: middle;">
                <div class="excel-cell-attach" id="excelNewAttachBtn" title="Attach image or Paste (Ctrl+V)" style="width: 100%; height: 26px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Attach</span>
                    <input type="file" id="excelNewFileInput" multiple accept="image/*" style="display: none;">
                </div>
            </td>
        `;

        dayUpdatesTableBody.appendChild(inputTr);

        // Wire elements for input row
        const attachBtn = inputTr.querySelector('#excelNewAttachBtn');
        const fileInput = inputTr.querySelector('#excelNewFileInput');
        const taskTextarea = inputTr.querySelector('#excelNewTask');
        const commentsTextarea = inputTr.querySelector('#excelNewComments');
        const assignSelect = inputTr.querySelector('#excelNewAssign');
        const productSelect = inputTr.querySelector('#excelNewProduct');
        const statusSelect = inputTr.querySelector('#excelNewStatus');

        // Clear error borders on user typing / selecting & dynamically auto-expand height based on content
        taskTextarea?.addEventListener('input', () => {
            taskTextarea.style.borderColor = '';
            autoResizeTextarea(taskTextarea, 44, 140);
        });
        autoResizeTextarea(taskTextarea, 44, 140);

        commentsTextarea?.addEventListener('input', () => {
            commentsTextarea.style.borderColor = '';
            autoResizeTextarea(commentsTextarea, 44, 140);
        });
        autoResizeTextarea(commentsTextarea, 44, 140);

        assignSelect?.addEventListener('change', () => { assignSelect.style.borderColor = ''; });
        productSelect?.addEventListener('change', () => { productSelect.style.borderColor = ''; });

        attachBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    state.newUpdateImages.push(ev.target.result);
                    renderExcelNewPreviews();
                };
                reader.readAsDataURL(file);
            });
            fileInput.value = '';
        });

        // Enter key to auto-save on entire new update row (or fields inside it)
        inputTr.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.target.tagName === 'TEXTAREA' && e.shiftKey) {
                    return; // allow multiline when Shift+Enter is pressed
                }
                e.preventDefault();
                handleAutoSaveAndAdd();
            }
        });

        // Paste support for image in task textarea
        taskTextarea?.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;
            const items = clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        state.newUpdateImages.push(event.target.result);
                        renderExcelNewPreviews();
                    };
                    reader.readAsDataURL(blob);
                }
            }
        });

        renderExcelNewPreviews();

        // 2. RENDER EXISTING SAVED UPDATES BELOW THE INPUT ROW
        dayEvents.forEach(evt => {
            try {
                const tr = document.createElement('tr');
                tr.className = 'day-update-row';
                tr.dataset.eventId = String(evt.id);

                const statusClass = evt.status === 'completed' ? 'status-badge-completed' : 'status-badge-progress';
                const statusText = evt.status === 'completed' ? 'Completed' : 'In Progress';

                // Assignee info
                let assigneeHtml = '<span style="color: var(--muted); font-size: 0.82rem;">Unassigned</span>';
                const memberId = evt.member_id != null ? evt.member_id : evt.memberId;
                if (memberId) {
                    const assignedUser = state.users.find(u => u.id === memberId || String(u.id) === String(memberId));
                    if (assignedUser) {
                        const userName = assignedUser.full_name || assignedUser.fullName || 'User';
                        const initial = userName.charAt(0).toUpperCase();
                        assigneeHtml = `
                            <div style="display: flex; align-items: center; gap: 0.35rem;">
                                <div class="user-avatar-sm" style="width: 20px; height: 20px; font-size: 0.68rem; margin: 0; border-radius: 2px;">${initial}</div>
                                <span style="font-weight: 500; font-size: 0.83rem; color: var(--text);">${escapeHtml(userName)}</span>
                            </div>
                        `;
                    }
                }

                // Token ID
                const tokenId = evt.token_id || evt.tokenId || '';
                const tokenIdHtml = tokenId ? `<span style="font-weight: 700; color: var(--accent); font-size: 0.8rem; margin-bottom: 2px; display: inline-block;">${escapeHtml(tokenId)}</span>` : '';

                // Product
                const productText = evt.product_name || evt.productName || 'General';
                const productHtml = `<span style="font-size: 0.82rem; font-weight: 500; color: var(--text);">${escapeHtml(productText)}</span>`;

                // Parse images
                let imageList = [];
                if (evt.images) {
                    try {
                        imageList = typeof evt.images === 'string' ? JSON.parse(evt.images) : evt.images;
                    } catch (e) {
                        console.error("Failed to parse event images:", e);
                    }
                }

                let imagesHtml = '';
                if (Array.isArray(imageList) && imageList.length > 0) {
                    imagesHtml = '<div class="day-update-thumbnails" style="margin-top: 4px; gap: 4px;">';
                    imageList.forEach((img, idx) => {
                        imagesHtml += `<img src="${img}" class="day-update-thumb" data-index="${idx}" style="width: 32px; height: 32px; border-radius: 2px;">`;
                    });
                    imagesHtml += '</div>';
                }

                let contentBodyHtml = '';
                const titleStr = (evt.title || '').trim();
                const descStr = (evt.description || '').trim();
                const mainContent = descStr || titleStr || 'No details provided.';

                if (descStr && titleStr && descStr !== titleStr && titleStr.length <= 60 && titleStr !== 'Update') {
                    contentBodyHtml = `
                        <div style="font-weight: 600; font-size: 0.84rem; color: var(--text); margin-bottom: 1px;">${escapeHtml(titleStr)}</div>
                        <div style="font-size: 0.82rem; color: var(--muted); line-height: 1.35; white-space: pre-wrap;">${escapeHtml(descStr)}</div>
                    `;
                } else {
                    contentBodyHtml = `
                        <div style="font-size: 0.83rem; line-height: 1.35; color: var(--text); font-weight: 500; white-space: pre-wrap;">${escapeHtml(mainContent)}</div>
                    `;
                }

                const isCompleted = evt.status === 'completed';
                const radioColor = isCompleted ? '#10b981' : '#f59e0b';

                tr.innerHTML = `
                    <!-- 1. Task Column -->
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            ${tokenIdHtml}
                            ${contentBodyHtml}
                            ${imagesHtml}
                        </div>
                    </td>

                    <!-- 2. Status Column -->
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span class="day-update-status ${statusClass}" style="font-size: 0.74rem; padding: 2px 6px; border-radius: 2px;">${statusText}</span>
                            <span class="status-radio-circle-btn ${isCompleted ? 'is-completed' : 'is-progress'}" data-event-id="${evt.id}" role="button" tabindex="0" title="Click to toggle status (Yellow: In Progress | Green: Completed)" style="margin: 0; width: 18px; height: 18px; cursor: pointer;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none;">
                                    <circle cx="12" cy="12" r="9" stroke="${radioColor}" stroke-width="2.5" fill="none"/>
                                    <circle cx="12" cy="12" r="5" fill="${radioColor}"/>
                                </svg>
                            </span>
                        </div>
                    </td>

                    <!-- 3. Assign to Column -->
                    <td>
                        ${assigneeHtml}
                    </td>

                    <!-- 4. Product Column -->
                    <td>
                        ${productHtml}
                    </td>

                    <!-- 5. Comments Column (Textarea Input Box) -->
                    <td>
                        <textarea class="excel-cell-input row-comment-box" data-event-id="${evt.id}" placeholder="Add comment...">${escapeHtml(evt.comments || '')}</textarea>
                    </td>

                    <!-- 6. Actions Column -->
                    <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                            <button class="btn-icon btn-view" title="View Details" style="width: 24px; height: 24px; border-radius: 2px; padding: 0;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button class="btn-icon btn-edit" title="Edit Update" style="width: 24px; height: 24px; border-radius: 2px; padding: 0; color: var(--accent);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete-event" title="Delete Update" style="width: 24px; height: 24px; border-radius: 2px; padding: 0; color: var(--danger);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                        </div>
                    </td>
                `;

                // Wire status toggle radio button
                const radioBtn = tr.querySelector('.status-radio-circle-btn');
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
                        const todayStr = formatDateStr(new Date());
                        const completedDate = state.selectedDate || todayStr;

                        const evObj = state.events.find(ev => String(ev.id) === String(eventId));
                        if (evObj) {
                            evObj.status = newStatus;
                            if (newStatus === 'completed') {
                                evObj.event_date = completedDate;
                                evObj.eventDate = completedDate;
                            }
                        }

                        // In-place UI feedback on current row
                        const statusBadge = tr.querySelector('.day-update-status');
                        if (statusBadge) {
                            statusBadge.className = `day-update-status ${newStatus === 'completed' ? 'status-badge-completed' : 'status-badge-progress'}`;
                            statusBadge.textContent = newStatus === 'completed' ? 'Completed' : 'In Progress';
                        }
                        const radioColor = newStatus === 'completed' ? '#10b981' : '#f59e0b';
                        radioBtn.className = `status-radio-circle-btn ${newStatus === 'completed' ? 'is-completed' : 'is-progress'}`;
                        const svgCircles = radioBtn.querySelectorAll('circle');
                        if (svgCircles.length >= 2) {
                            svgCircles[0].setAttribute('stroke', radioColor);
                            svgCircles[1].setAttribute('fill', radioColor);
                        }

                        renderCalendar();
                        updateUpcomingEvents();

                        const statusUrl = `/api/events/${eventId}/status?status=${encodeURIComponent(newStatus)}${newStatus === 'completed' ? `&date=${encodeURIComponent(completedDate)}` : ''}`;

                        try {
                            const response = await fetch(statusUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    status: newStatus,
                                    date: completedDate
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
                                const idx = state.events.findIndex(ev => String(ev.id) === String(updated.id));
                                if (idx !== -1) {
                                    state.events[idx] = { ...state.events[idx], ...updated };
                                }
                            }
                            renderCalendar();
                            updateUpcomingEvents();
                            renderDayUpdatesList(state.selectedDate);
                        } catch (err) {
                            console.error('Status update failed:', err);
                            alert('Status update failed: ' + (err.message || err));
                            await fetchEvents(() => {
                                renderDayUpdatesList(state.selectedDate);
                            });
                        } finally {
                            state.updatingStatusIds.delete(eventId);
                        }
                    });
                }

                // Wire VIEW button
                const viewBtn = tr.querySelector('.btn-view');
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => openEditEventModal(evt));
                }

                // Wire row-level comment box auto-save
                const rowCommentBox = tr.querySelector('.row-comment-box');
                if (rowCommentBox) {
                    autoResizeTextarea(rowCommentBox, 44, 140);
                    rowCommentBox.addEventListener('input', () => {
                        autoResizeTextarea(rowCommentBox, 44, 140);
                    });

                    const saveCurrentRowComment = async () => {
                        const updatedVal = rowCommentBox.value.trim();
                        if (updatedVal === (evt.comments || '').trim()) return;

                        evt.comments = updatedVal;
                        const curMemberId = evt.member_id != null ? evt.member_id : evt.memberId;
                        const curProductId = evt.product_id != null ? evt.product_id : evt.productId;

                        rowCommentBox.style.borderColor = 'var(--accent)';
                        try {
                            const updatePayload = {
                                id: evt.id,
                                userId: currentUser.userId || currentUser.id || 1,
                                title: evt.title || evt.description || 'Update',
                                description: evt.description || evt.title || '',
                                comments: updatedVal,
                                tokenId: evt.token_id || evt.tokenId || '',
                                memberId: curMemberId ? parseInt(curMemberId) : null,
                                status: evt.status || 'progress',
                                productId: curProductId ? parseInt(curProductId) : null,
                                eventDate: evt.event_date || evt.eventDate || state.selectedDate,
                                images: typeof evt.images === 'string' ? evt.images : JSON.stringify(evt.images || [])
                            };

                            const response = await fetch('/api/events', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatePayload)
                            });

                            if (response.ok) {
                                rowCommentBox.style.borderColor = '#10b981';
                                setTimeout(() => { rowCommentBox.style.borderColor = ''; }, 1000);
                                const evIdx = state.events.findIndex(e => String(e.id) === String(evt.id));
                                if (evIdx !== -1) {
                                    state.events[evIdx].comments = updatedVal;
                                }
                            } else {
                                rowCommentBox.style.borderColor = '#ef4444';
                            }
                        } catch (err) {
                            console.error('Error auto-saving comment:', err);
                            rowCommentBox.style.borderColor = '#ef4444';
                        }
                    };

                    rowCommentBox.addEventListener('blur', saveCurrentRowComment);
                    rowCommentBox.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            rowCommentBox.blur();
                        }
                    });
                }

                // Wire EDIT button -> in-place inline edit with Save/Cancel
                const editBtn = tr.querySelector('.btn-edit');
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        const curMemberId = evt.member_id != null ? evt.member_id : evt.memberId;
                        const curProductId = evt.product_id != null ? evt.product_id : evt.productId;

                        // Parse existing images for this event into a mutable list
                        let editImagesList = [];
                        if (evt.images) {
                            try {
                                editImagesList = typeof evt.images === 'string' ? JSON.parse(evt.images) : evt.images;
                                if (!Array.isArray(editImagesList)) editImagesList = [];
                            } catch (e) {
                                editImagesList = [];
                            }
                        }

                        // Build Member options
                        let editAssignOptions = '<option value="">-- Select Member --</option>';
                        state.users.forEach(u => {
                            const isSel = String(u.id) === String(curMemberId) ? 'selected' : '';
                            editAssignOptions += `<option value="${u.id}" ${isSel}>${escapeHtml(u.full_name || u.fullName)}</option>`;
                        });

                        // Build Product options
                        let editProductOptions = '<option value="">-- Select Product --</option>';
                        state.products.forEach(p => {
                            const isSel = String(p.id) === String(curProductId) ? 'selected' : '';
                            editProductOptions += `<option value="${p.id}" ${isSel}>${escapeHtml(p.name)}</option>`;
                        });

                        const editTr = document.createElement('tr');
                        editTr.className = 'excel-new-update-row';
                        editTr.innerHTML = `
                            <td>
                                <textarea class="excel-cell-input edit-task-input">${escapeHtml(evt.description || evt.title || '')}</textarea>
                                <div class="edit-images-preview attached-images-preview inline-images-preview" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;"></div>
                            </td>
                            <td>
                                <select class="excel-cell-select edit-status-select">
                                    <option value="progress" ${evt.status === 'progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${evt.status === 'completed' ? 'selected' : ''}>Completed</option>
                                </select>
                            </td>
                            <td>
                                <select class="excel-cell-select edit-assign-select">
                                    ${editAssignOptions}
                                </select>
                            </td>
                            <td>
                                <select class="excel-cell-select edit-product-select">
                                    ${editProductOptions}
                                </select>
                            </td>
                            <td>
                                <textarea class="excel-cell-input edit-comments-input" placeholder="Add comment...">${escapeHtml(evt.comments || '')}</textarea>
                            </td>
                            <td style="text-align: center; vertical-align: middle;">
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
                                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                                        <button class="btn-save-edit" title="Save" style="background: #10b981; color: #fff; border: none; border-radius: 2px; padding: 2px 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">✓</button>
                                        <button class="btn-cancel-edit" title="Cancel" style="background: #64748b; color: #fff; border: none; border-radius: 2px; padding: 2px 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">✕</button>
                                    </div>
                                    <div class="excel-cell-attach edit-attach-btn" title="Attach or replace image (or Paste Ctrl+V)" style="width: 100%; height: 22px; font-size: 0.68rem; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center; gap: 2px; cursor: pointer;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        <span>Attach</span>
                                        <input type="file" class="edit-file-input" multiple accept="image/*" style="display: none;">
                                    </div>
                                </div>
                            </td>
                        `;

                        function renderEditImagesPreview() {
                            const previewContainer = editTr.querySelector('.edit-images-preview');
                            if (!previewContainer) return;
                            previewContainer.innerHTML = '';
                            editImagesList.forEach((img, idx) => {
                                const container = document.createElement('div');
                                container.className = 'preview-img-container';
                                container.style.position = 'relative';
                                container.style.width = '32px';
                                container.style.height = '32px';
                                container.style.display = 'inline-block';
                                container.style.borderRadius = '3px';
                                container.style.border = '1px solid var(--border)';
                                container.style.overflow = 'visible';

                                const image = document.createElement('img');
                                image.src = img;
                                image.style.width = '100%';
                                image.style.height = '100%';
                                image.style.objectFit = 'cover';
                                image.style.borderRadius = '2px';
                                image.style.display = 'block';

                                const deleteBtn = document.createElement('button');
                                deleteBtn.innerHTML = '&times;';
                                deleteBtn.type = 'button';
                                deleteBtn.className = 'delete-preview-btn';
                                deleteBtn.title = 'Remove this image';
                                deleteBtn.style.position = 'absolute';
                                deleteBtn.style.top = '-5px';
                                deleteBtn.style.right = '-5px';
                                deleteBtn.style.width = '14px';
                                deleteBtn.style.height = '14px';
                                deleteBtn.style.fontSize = '10px';
                                deleteBtn.style.lineHeight = '12px';
                                deleteBtn.style.background = '#ef4444';
                                deleteBtn.style.color = '#ffffff';
                                deleteBtn.style.border = 'none';
                                deleteBtn.style.borderRadius = '50%';
                                deleteBtn.style.cursor = 'pointer';
                                deleteBtn.style.display = 'flex';
                                deleteBtn.style.alignItems = 'center';
                                deleteBtn.style.justifyContent = 'center';
                                deleteBtn.style.padding = '0';
                                deleteBtn.style.zIndex = '10';

                                deleteBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    editImagesList.splice(idx, 1);
                                    renderEditImagesPreview();
                                });

                                container.appendChild(image);
                                container.appendChild(deleteBtn);
                                previewContainer.appendChild(container);
                            });
                        }

                        const editAttachBtn = editTr.querySelector('.edit-attach-btn');
                        const editFileInput = editTr.querySelector('.edit-file-input');
                        const editTaskInput = editTr.querySelector('.edit-task-input');
                        const editCommentsInput = editTr.querySelector('.edit-comments-input');

                        autoResizeTextarea(editTaskInput, 44, 140);
                        editTaskInput?.addEventListener('input', () => {
                            autoResizeTextarea(editTaskInput, 44, 140);
                        });

                        autoResizeTextarea(editCommentsInput, 44, 140);
                        editCommentsInput?.addEventListener('input', () => {
                            autoResizeTextarea(editCommentsInput, 44, 140);
                        });

                        editAttachBtn?.addEventListener('click', () => editFileInput?.click());

                        editFileInput?.addEventListener('change', (e) => {
                            const files = Array.from(e.target.files);
                            files.forEach(file => {
                                if (!file.type.startsWith('image/')) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    editImagesList.push(ev.target.result);
                                    renderEditImagesPreview();
                                };
                                reader.readAsDataURL(file);
                            });
                            editFileInput.value = '';
                        });

                        // Paste support for image in edit task textarea
                        editTaskInput?.addEventListener('paste', (e) => {
                            const clipboardData = e.clipboardData || window.clipboardData;
                            if (!clipboardData) return;
                            const items = clipboardData.items;
                            for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                    const blob = items[i].getAsFile();
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        editImagesList.push(event.target.result);
                                        renderEditImagesPreview();
                                    };
                                    reader.readAsDataURL(blob);
                                }
                            }
                        });

                        renderEditImagesPreview();

                        editTr.dataset.isEdit = 'true';

                        editTr.querySelector('.btn-cancel-edit').addEventListener('click', () => {
                            renderDayUpdatesList(state.selectedDate);
                        });

                        async function saveInlineEdit() {
                            if (editTr.dataset.isSaving === 'true') return;

                            const newContent = editTr.querySelector('.edit-task-input').value.trim();
                            const newComments = editTr.querySelector('.edit-comments-input') ? editTr.querySelector('.edit-comments-input').value.trim() : '';
                            const newMemberId = editTr.querySelector('.edit-assign-select').value;
                            const newStatus = editTr.querySelector('.edit-status-select').value;
                            const newProductId = editTr.querySelector('.edit-product-select').value;

                            if (!newMemberId || !newStatus || !newProductId) {
                                alert('Please select Member, Status, and Product.');
                                return;
                            }

                            // Duplicate check for inline edit
                            const isDuplicate = state.events.some(e => {
                                if (String(e.id) === String(evt.id)) return false;
                                const evDate = e.event_date || e.eventDate || '';
                                const pId = e.product_id != null ? String(e.product_id) : (e.productId != null ? String(e.productId) : '');
                                const desc = (e.description || e.title || '').trim();
                                return evDate === (evt.event_date || evt.eventDate || state.selectedDate) &&
                                       pId === String(newProductId) &&
                                       desc === newContent;
                            });

                            if (isDuplicate) {
                                alert('A duplicate ticket with this exact content already exists for this date and product.');
                                return;
                            }

                            // Lock edit row synchronously
                            editTr.dataset.isSaving = 'true';
                            editTr.style.pointerEvents = 'none';
                            editTr.style.opacity = '0.6';

                            const todayStr = formatDateStr(new Date());
                            let targetDate = evt.event_date || evt.eventDate || state.selectedDate;
                            if (newStatus === 'completed' && evt.status !== 'completed') {
                                targetDate = state.selectedDate || todayStr;
                            }

                            const updatePayload = {
                                id: evt.id,
                                userId: currentUser.userId || currentUser.id || 1,
                                title: newContent || 'Update',
                                description: newContent,
                                comments: newComments,
                                tokenId: evt.token_id || evt.tokenId || '',
                                memberId: parseInt(newMemberId),
                                status: newStatus,
                                productId: parseInt(newProductId),
                                eventDate: targetDate,
                                images: JSON.stringify(editImagesList)
                            };

                            try {
                                const res = await fetch('/api/events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(updatePayload)
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to update.');

                                const updatedItem = data.data;
                                const idx = state.events.findIndex(e => String(e.id) === String(evt.id));
                                if (idx !== -1) {
                                    if (updatedItem && typeof updatedItem === 'object' && updatedItem.id) {
                                        state.events[idx] = updatedItem;
                                    } else {
                                        const selectedProd = state.products.find(p => String(p.id) === String(newProductId));
                                        state.events[idx] = {
                                            ...state.events[idx],
                                            description: newContent,
                                            title: newContent || 'Update',
                                            comments: newComments,
                                            member_id: parseInt(newMemberId),
                                            memberId: parseInt(newMemberId),
                                            product_id: parseInt(newProductId),
                                            productId: parseInt(newProductId),
                                            product_name: selectedProd ? selectedProd.name : 'General',
                                            productName: selectedProd ? selectedProd.name : 'General',
                                            status: newStatus,
                                            images: JSON.stringify(editImagesList)
                                        };
                                    }
                                }

                                renderCalendar();
                                updateUpcomingEvents();
                                renderDayUpdatesList(state.selectedDate);
                            } catch (err) {
                                editTr.dataset.isSaving = 'false';
                                editTr.style.pointerEvents = 'auto';
                                editTr.style.opacity = '1';
                                alert(err.message || 'Error updating event.');
                            }
                        }

                        editTr.querySelector('.btn-save-edit').addEventListener('click', saveInlineEdit);

                        editTr.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                if (e.target.tagName === 'TEXTAREA' && e.shiftKey) return;
                                e.preventDefault();
                                saveInlineEdit();
                            }
                        });

                        tr.replaceWith(editTr);
                    });
                }

                // Wire DELETE button -> immediate alertless delete
                const delBtn = tr.querySelector('.btn-delete-event');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteEventImmediate(evt.id);
                    });
                }

                // Wire image thumbnails click -> lightbox
                tr.querySelectorAll('.day-update-thumb').forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const index = parseInt(thumb.getAttribute('data-index'));
                        openLightbox(imageList, index);
                    });
                });

                dayUpdatesTableBody.appendChild(tr);

                if (rowCommentBox) {
                    autoResizeTextarea(rowCommentBox, 44, 140);
                }
            } catch (renderErr) {
                console.error('Error rendering update row:', renderErr, evt);
            }
        });

        // Trigger auto-resize on all textareas once full DOM layout is ready
        setTimeout(() => {
            if (dayUpdatesTableBody) {
                dayUpdatesTableBody.querySelectorAll('textarea').forEach(ta => {
                    autoResizeTextarea(ta, 44, 140);
                });
            }
        }, 10);
    }

    function setModalMode(isReadOnly) {
        if (isReadOnly) {
            eventForm?.classList.add('hidden');
            eventDetailsView?.classList.remove('hidden');
        } else {
            eventForm?.classList.remove('hidden');
            eventDetailsView?.classList.add('hidden');
        }
    }

    // --- VIEW UPDATE DETAILS MODAL ---
    function openEditEventModal(eventObj) {
        if (!eventObj) return;
        if (modalTitle) modalTitle.textContent = "VIEW UPDATE DETAILS";
        if (eventIdInput) eventIdInput.value = eventObj.id;
        state.selectedDate = eventObj.event_date || eventObj.eventDate || '';

        // View Update Details mode
        setModalMode(true);

        if (detailsTokenId) detailsTokenId.textContent = eventObj.token_id || eventObj.tokenId || '';
        if (detailsSubject) detailsSubject.textContent = eventObj.title || '';
        if (detailsContent) detailsContent.textContent = eventObj.description || eventObj.title || 'No content details provided.';
        if (detailsComments) {
            const comStr = (eventObj.comments != null ? String(eventObj.comments).trim() : '');
            detailsComments.textContent = comStr || 'No comments provided.';
            detailsComments.style.color = comStr ? 'var(--text)' : 'var(--muted)';
        }
        if (eventCommentsInput) eventCommentsInput.value = eventObj.comments || '';

        // Find assignee name
        let assigneeName = 'Unassigned';
        const memberId = eventObj.member_id != null ? eventObj.member_id : eventObj.memberId;
        if (memberId) {
            const assignedUser = state.users.find(u => u.id === memberId || String(u.id) === String(memberId));
            if (assignedUser) {
                assigneeName = assignedUser.full_name || assignedUser.fullName || 'User';
            }
        }
        if (detailsAssignee) detailsAssignee.textContent = assigneeName;

        // Find product name
        let productName = eventObj.product_name || eventObj.productName || '';
        const prodId = eventObj.product_id != null ? eventObj.product_id : eventObj.productId;
        if (!productName && prodId && state.products) {
            const prod = state.products.find(p => p.id === prodId || String(p.id) === String(prodId));
            if (prod) productName = prod.name;
        }
        if (!productName) productName = 'General';
        if (detailsProduct) detailsProduct.textContent = productName;

        if (detailsStatus) detailsStatus.textContent = eventObj.status === 'completed' ? 'Completed' : 'In Progress';

        // Show images if any
        let imageList = [];
        if (eventObj.images) {
            try {
                imageList = typeof eventObj.images === 'string' ? JSON.parse(eventObj.images) : eventObj.images;
            } catch (e) {
                console.error("Failed to parse event images:", e);
            }
        }

        if (Array.isArray(imageList) && imageList.length > 0 && detailsImagesGroup && detailsImagesList) {
            detailsImagesGroup.style.display = 'flex';
            detailsImagesList.innerHTML = '';
            imageList.forEach((img, idx) => {
                const imgThumb = document.createElement('img');
                imgThumb.src = img;
                imgThumb.className = 'day-update-thumb';
                imgThumb.addEventListener('click', () => {
                    openLightbox(imageList, idx);
                });
                detailsImagesList.appendChild(imgThumb);
            });
        } else if (detailsImagesGroup) {
            detailsImagesGroup.style.display = 'none';
        }

        deleteEventBtn?.classList.add('hidden');
        openModal();
    }

    // --- EVENT SAVE ACTION (CREATE / UPDATE) ---
    eventForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = eventTitleInput?.value.trim() || '';
        const description = eventDescriptionInput?.value.trim() || '';
        const comments = eventCommentsInput?.value.trim() || '';
        const tokenId = eventTokenIdInput?.value.trim() || '';
        const memberId = eventMemberIdSelect ? eventMemberIdSelect.value : null;
        const status = eventStatusSelect ? eventStatusSelect.value : 'progress';
        const eventDate = state.selectedDate;

        const subject = '';
        const startTime = '';
        const endTime = '';
        const color = 'blue';
        const id = eventIdInput?.value;

        if (!title || !eventDate) {
            alert('Subject is required.');
            return;
        }

        if (!memberId) {
            alert('Assign field is required.');
            return;
        }

        if (!status) {
            alert('Status field is required.');
            return;
        }

        // Duplicate check for modal form
        const isDuplicate = state.events.some(e => {
            if (id && String(e.id) === String(id)) return false;
            const evDate = e.event_date || e.eventDate || '';
            const desc = (e.description || e.title || '').trim();
            const incoming = (description || title).trim();
            return evDate === eventDate && desc === incoming;
        });

        if (isDuplicate) {
            alert('A duplicate ticket with this exact content already exists for this date.');
            return;
        }

        const requestData = {
            userId: currentUser.userId || currentUser.id || 1,
            title,
            description,
            comments,
            tokenId,
            subject,
            memberId,
            status,
            eventDate,
            startTime,
            endTime,
            color,
            images: JSON.stringify(state.attachedImages)
        };

        if (id) {
            requestData.id = id;
            if (status === 'completed') {
                requestData.eventDate = eventDate;
            }
        }

        fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to save event.');
                return result;
            })
            .then(result => {
                closeModal();
                fetchEvents(() => {
                    openDayUpdatesModal(state.selectedDate);
                });
            })
            .catch(error => {
                alert(error.message);
            });
    });

    // --- EVENT DELETE ACTION (modal delete button) ---
    deleteEventBtn?.addEventListener('click', () => {
        const id = eventIdInput?.value;
        if (!id) return;

        fetch(`/api/events?id=${id}&userId=${currentUser.userId || currentUser.id || 1}`, {
            method: 'DELETE'
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to delete event.');
                return result;
            })
            .then(result => {
                closeModal();
                fetchEvents(() => {
                    openDayUpdatesModal(state.selectedDate);
                });
            })
            .catch(error => {
                alert(error.message);
            });
    });

    // --- IMMEDIATE CARD DELETE ---
    function deleteEventImmediate(eventId) {
        fetch(`/api/events?id=${eventId}&userId=${currentUser.userId || currentUser.id || 1}`, {
            method: 'DELETE'
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to delete event.');
                return result;
            })
            .then(() => {
                state.activeInlineId = null;
                // Directly remove from local state without extra roundtrips
                state.events = state.events.filter(e => String(e.id) !== String(eventId));
                renderCalendar();
                updateUpcomingEvents();
                renderDayUpdatesList(state.selectedDate);
            })
            .catch(error => {
                alert(error.message || 'Delete failed.');
            });
    }

    // --- API HANDLERS ---
    function updateProductFilterDropdown() {
        if (!productFilterSelect) return;
        const currentVal = state.selectedProductFilter || 'all';
        let html = '<option value="all">All Products</option>';
        state.products.forEach(p => {
            const isSelected = String(p.id) === String(currentVal) || p.name === currentVal ? 'selected' : '';
            html += `<option value="${p.id}" ${isSelected}>${escapeHtml(p.name)}</option>`;
        });
        productFilterSelect.innerHTML = html;
        productFilterSelect.value = currentVal;
    }

    productFilterSelect?.addEventListener('change', (e) => {
        state.selectedProductFilter = e.target.value;
        renderDayUpdatesList(state.selectedDate);
        updateUpcomingEvents();
    });

    function fetchProducts(callback) {
        fetch('/api/products')
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to fetch products.');
                return result;
            })
            .then(products => {
                state.products = Array.isArray(products) ? products : [];
                updateUpcomingEvents();
                updateProductFilterDropdown();
                if (typeof callback === 'function') {
                    callback();
                }
            })
            .catch(error => {
                console.error('Error fetching products:', error);
            });
    }

    function fetchEvents(callback) {
        fetch('/api/events')
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to fetch events.');
                return result;
            })
            .then(data => {
                state.events = Array.isArray(data) ? data : [];
                renderCalendar();
                updateUpcomingEvents();
                if (dayViewContainer && dayViewContainer.style.display !== 'none') {
                    renderDayUpdatesList(state.selectedDate);
                }
                if (typeof callback === 'function') {
                    callback();
                }
            })
            .catch(error => {
                console.error('Error fetching events:', error);
            });
    }

    function renderOnlineUsersList() {
        if (onlineUsersList) {
            onlineUsersList.innerHTML = '';
        }

        if (eventMemberIdSelect) {
            eventMemberIdSelect.innerHTML = '<option value="">-- Select Member --</option>';
        }

        state.users.forEach(user => {
            const isCurrentUser = user.id === (currentUser.userId || currentUser.id);
            const isOnline = isCurrentUser;
            const statusClass = isOnline ? 'status-online' : 'status-offline';
            const statusLabel = isOnline ? 'Online' : 'Offline';

            const userName = user.full_name || user.fullName || 'User';
            const initial = userName.charAt(0).toUpperCase();

            if (onlineUsersList) {
                const li = document.createElement('li');
                li.classList.add('online-user-item');
                li.innerHTML = `
                    <div class="user-avatar-sm" title="${statusLabel}">
                        ${initial}
                        <span class="status-dot ${statusClass}"></span>
                    </div>
                    <div class="user-details-sm">
                        <span class="user-name-sm">${escapeHtml(userName)} ${isCurrentUser ? '(You)' : ''}</span>
                        <span class="user-role-sm">${escapeHtml(user.role || 'Member')}</span>
                    </div>
                `;
                onlineUsersList.appendChild(li);
            }

            if (eventMemberIdSelect) {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${userName} (${user.role || 'Member'})` + (isCurrentUser ? ' - You' : '');
                eventMemberIdSelect.appendChild(option);
            }
        });
    }

    function fetchOnlineUsers(callback) {
        fetch('/api/users')
            .then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to fetch users.');
                return result;
            })
            .then(users => {
                state.users = Array.isArray(users) ? users : [];
                renderOnlineUsersList();
                renderCalendar();
                if (dayViewContainer && dayViewContainer.style.display !== 'none') {
                    renderDayUpdatesList(state.selectedDate);
                }
                if (typeof callback === 'function') {
                    callback();
                }
            })
            .catch(error => {
                console.error('Error loading online users:', error);
            });
    }

    async function fetchEvents(callback) {
        try {
            const response = await fetch(`/api/events?_t=${Date.now()}`);
            if (response.ok) {
                const events = await response.json();
                state.events = Array.isArray(events) ? events : [];
                renderCalendar();
                updateUpcomingEvents();
                if (dayViewContainer && dayViewContainer.style.display !== 'none') {
                    renderDayUpdatesList(state.selectedDate);
                }
                if (typeof callback === 'function') {
                    callback();
                }
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    }

    // --- INITIAL FETCHES (CONCURRENT IN PARALLEL) ---
    async function initApp() {
        try {
            const [productsRes, usersRes, eventsRes] = await Promise.all([
                fetch(`/api/products?_t=${Date.now()}`),
                fetch(`/api/users?_t=${Date.now()}`),
                fetch(`/api/events?_t=${Date.now()}`)
            ]);

            if (productsRes.ok) {
                const products = await productsRes.json();
                state.products = Array.isArray(products) ? products : [];
                updateProductFilterDropdown();
            }

            if (usersRes.ok) {
                const users = await usersRes.json();
                state.users = Array.isArray(users) ? users : [];
                renderOnlineUsersList();
            }

            if (eventsRes.ok) {
                const events = await eventsRes.json();
                state.events = Array.isArray(events) ? events : [];
                renderCalendar();
                updateUpcomingEvents();
            }
        } catch (err) {
            console.error('Initial load error:', err);
        }
    }

    initApp();
});
