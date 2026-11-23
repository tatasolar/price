(() => {
    const documentElement = document.documentElement;
    document.body?.classList.add('appear');
    const updateViewportSize = () => {
        const viewportWidth = documentElement.clientWidth;
        documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);
        documentElement.style.setProperty('--viewport-half-width', `${viewportWidth / 2}px`);
    };
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize, { passive: true });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
        documentElement.classList.add('js-motion');
        const revealItems = document.querySelectorAll(
            '.article-content .elementor-section, .resource-card, .content-card, .legal-document .motion-box'
        );
        revealItems.forEach((item) => {
            const bounds = item.getBoundingClientRect();
            if (bounds.top < window.innerHeight * 1.15) {
                item.classList.add('is-motion-visible');
            }
        });
        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-motion-visible');
                    observer.unobserve(entry.target);
                });
            }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
            revealItems.forEach((item) => revealObserver.observe(item));
        } else {
            revealItems.forEach((item) => item.classList.add('is-motion-visible'));
        }
    }

    document.querySelectorAll('[data-energy-gallery]').forEach((gallery) => {
        const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
        const toggle = gallery.querySelector('[data-gallery-toggle]');
        if (slides.length < 2 || !toggle) return;

        if (prefersReducedMotion) {
            slides.forEach((slide) => slide.setAttribute('aria-hidden', 'false'));
            return;
        }

        let activeIndex = 0;
        let timer = 0;
        const showSlide = (nextIndex) => {
            activeIndex = nextIndex;
            slides.forEach((slide, index) => {
                const active = index === activeIndex;
                slide.classList.toggle('is-active', active);
                slide.setAttribute('aria-hidden', String(!active));
            });
        };
        const start = () => {
            if (timer) return;
            toggle.textContent = 'Pause animation';
            toggle.setAttribute('aria-label', 'Pause illustration animation');
            toggle.setAttribute('aria-pressed', 'false');
            timer = window.setInterval(() => {
                showSlide((activeIndex + 1) % slides.length);
            }, 2600);
        };

        toggle.hidden = false;
        toggle.addEventListener('click', () => {
            if (timer) {
                window.clearInterval(timer);
                timer = 0;
                toggle.textContent = 'Resume animation';
                toggle.setAttribute('aria-label', 'Resume illustration animation');
                toggle.setAttribute('aria-pressed', 'true');
                return;
            }
            start();
        });

        if ('IntersectionObserver' in window) {
            const galleryObserver = new IntersectionObserver((entries, observer) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    start();
                    observer.disconnect();
                }
            }, { threshold: 0.2 });
            galleryObserver.observe(gallery);
        } else {
            start();
        }
    });

    const config = window.SOLAR_GUIDE_CONFIG || {};
    const apiBaseUrl = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.replace(/\/+$/, '') : '';
    const apiUrl = (endpoint) => {
        if (!apiBaseUrl || /^https?:\/\//i.test(endpoint)) return endpoint;
        return `${apiBaseUrl}/${endpoint.replace(/^\/+/, '')}`;
    };
    const requestHeaders = () => {
        const headers = { 'Content-Type': 'application/json' };
        const token = document.querySelector('meta[name="csrf-token"]')?.content;
        if (token) headers['X-CSRF-Token'] = token;
        return headers;
    };

    const backendBaseUrl = typeof config.backendBaseUrl === 'string'
        ? config.backendBaseUrl.replace(/\/+$/, '')
        : apiBaseUrl.replace(/\/api$/i, '');
    const adminUrl = config.adminUrl || (backendBaseUrl ? `${backendBaseUrl}/admin/index.php` : '/admin/index.php');
    document.querySelectorAll('[data-admin-link]').forEach((link) => {
        link.href = adminUrl;
    });

    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    document.querySelectorAll('.footer-social a[data-app-url]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (!isMobileDevice) return;
            event.preventDefault();
            const fallbackUrl = link.href;
            const appUrl = link.dataset.appUrl;
            const fallbackTimer = window.setTimeout(() => {
                window.location.assign(fallbackUrl);
            }, 1400);
            window.addEventListener('pagehide', () => window.clearTimeout(fallbackTimer), { once: true });
            window.location.assign(appUrl);
        });
    });

    const formatInr = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;
    const numberFrom = (id, fallback) => {
        const element = document.getElementById(id);
        const value = Number.parseFloat(element?.value ?? '');
        return Number.isFinite(value) ? value : fallback;
    };

    const stateInput = document.getElementById('stateSearchInput');
    if (stateInput) {
        const filterStates = () => {
            const query = stateInput.value.trim().toLocaleLowerCase();
            const rows = [...document.querySelectorAll('#stateTable tbody tr')];
            let visible = 0;
            rows.forEach((row) => {
                const match = row.textContent.toLocaleLowerCase().includes(query);
                row.hidden = !match;
                if (match) visible += 1;
            });
            const count = document.getElementById('stateCountBadge');
            const empty = document.getElementById('noStateFound');
            if (count) count.textContent = `${visible} locations`;
            if (empty) empty.hidden = visible !== 0;
        };
        stateInput.addEventListener('input', filterStates);
        window.filterStateTable = (value) => {
            stateInput.value = value;
            filterStates();
        };
        filterStates();
    }

    const calculatorInputs = ['calcBill', 'calcTariff', 'calcSystemType', 'calcCustomCapacity', 'calcSubsidyEligible'];
    const calculateSolar = () => {
        const bill = Math.max(0, numberFrom('calcBill', 3000));
        const tariff = Math.max(0.1, numberFrom('calcTariff', 7.5));
        const systemType = document.getElementById('calcSystemType')?.value || 'ongrid';
        const customCapacity = document.getElementById('calcCustomCapacity')?.value || 'auto';
        const subsidyEligible = document.getElementById('calcSubsidyEligible')?.checked ?? false;
        let capacity = customCapacity === 'auto'
            ? Math.round((bill / tariff / 130) * 2) / 2
            : Number.parseFloat(customCapacity);
        capacity = Math.min(10, Math.max(1, Number.isFinite(capacity) ? capacity : 3));

        let ratePerKw = capacity <= 1 ? 68000 : capacity <= 2 ? 64000 : capacity <= 3 ? 61500 : capacity <= 5 ? 57000 : 53000;
        if (systemType === 'hybrid') ratePerKw += 35000;
        if (systemType === 'offgrid') ratePerKw += 30000;
        const gross = capacity * ratePerKw;
        const subsidy = subsidyEligible && systemType !== 'offgrid'
            ? Math.min(78000, Math.min(capacity, 2) * 30000 + Math.max(0, Math.min(capacity - 2, 1)) * 18000)
            : 0;
        const net = Math.max(0, gross - subsidy);
        const monthlyGeneration = capacity * 130;
        const monthlySavings = Math.min(bill, monthlyGeneration * tariff);
        const annualSavings = monthlySavings * 12;
        const payback = annualSavings > 0 ? net / annualSavings : 0;
        const values = {
            resCapacity: `${capacity} kW`,
            resRoofSpace: `~${Math.round(capacity * 90)} sq.ft`,
            resGrossCost: formatInr(gross),
            resSubsidy: subsidy > 0 ? `-${formatInr(subsidy)}` : '₹0',
            resNetCost: formatInr(net),
            resMonthlyGen: `${Math.round(monthlyGeneration)} Units (kWh)`,
            resMonthlySave: formatInr(monthlySavings),
            resAnnualSave: formatInr(annualSavings),
            resPayback: payback > 0 ? `${payback.toFixed(1)} Years` : 'N/A',
            resLifetimeSave: formatInr(Math.max(0, annualSavings * 25 - net)),
        };
        Object.entries(values).forEach(([id, value]) => {
            const output = document.getElementById(id);
            if (output) output.textContent = value;
        });
    };
    calculatorInputs.forEach((id) => {
        const input = document.getElementById(id);
        input?.addEventListener('input', calculateSolar);
        input?.addEventListener('change', calculateSolar);
    });
    document.getElementById('calcResetBtn')?.addEventListener('click', () => {
        document.getElementById('calcBill').value = '3000';
        document.getElementById('calcTariff').value = '7.5';
        document.getElementById('calcSystemType').value = 'ongrid';
        document.getElementById('calcCustomCapacity').value = 'auto';
        document.getElementById('calcSubsidyEligible').checked = true;
        calculateSolar();
    });
    if (calculatorInputs.some((id) => document.getElementById(id))) calculateSolar();

    const subsidyInput = document.getElementById('subsidyKw');
    const calculateSubsidy = () => {
        const capacity = Math.min(3, Math.max(0, numberFrom('subsidyKw', 0)));
        const subsidy = Math.min(capacity, 2) * 30000 + Math.max(0, capacity - 2) * 18000;
        const result = document.getElementById('subsidyResult');
        if (result) result.textContent = capacity > 0 ? formatInr(subsidy) : '₹ --';
    };
    subsidyInput?.addEventListener('input', calculateSubsidy);
    subsidyInput?.closest('.sub-form')?.querySelector('button')?.addEventListener('click', calculateSubsidy);
    document.querySelectorAll('input[placeholder="Search for your State or UT..."]').forEach((input) => {
        const table = input.closest('.state-table-wrap')?.querySelector('table');
        input.addEventListener('input', () => {
            const query = input.value.trim().toLocaleLowerCase();
            table?.querySelectorAll('tbody tr').forEach((row) => {
                row.hidden = !row.textContent.toLocaleLowerCase().includes(query);
            });
        });
    });

    let roiType = 'ongrid';
    let roiSubsidyEnabled = true;
    const updateRoi = () => {
        const capacity = Math.max(1, numberFrom('roiKw', 5));
        const yieldPerDay = Math.max(1, numberFrom('roiState', 4.5));
        const bill = Math.max(0, numberFrom('roiBill', 4500));
        const multipliers = { ongrid: 1, offgrid: 1.6, hybrid: 1.9 };
        const total = capacity * 48000 * multipliers[roiType];
        const subsidy = roiSubsidyEnabled && roiType !== 'offgrid'
            ? Math.min(capacity, 2) * 30000 + Math.max(0, Math.min(capacity - 2, 1)) * 18000
            : 0;
        const net = Math.max(0, total - subsidy);
        const monthlyGeneration = capacity * yieldPerDay * 30;
        const monthlySavings = Math.min(bill, monthlyGeneration * Math.max(6, bill / Math.max(monthlyGeneration * .4, 1)));
        const annualSavings = monthlySavings * 12;
        const payback = net / Math.max(annualSavings, 1);
        const values = {
            kwDisplay: `${capacity} kW`,
            rTotalCost: formatInr(total),
            rSubCost: formatInr(net),
            rMonthlySave: formatInr(monthlySavings),
            rAnnualSave: formatInr(annualSavings),
            rPayback: `${payback.toFixed(1)} Years`,
            rLifetime: formatInr(annualSavings * 25 - net),
        };
        Object.entries(values).forEach(([id, value]) => {
            const output = document.getElementById(id);
            if (output) output.textContent = value;
        });
    };
    ['roiKw', 'roiState', 'roiBill'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateRoi);
        document.getElementById(id)?.addEventListener('change', updateRoi);
    });
    document.querySelectorAll('.calc-toggle button').forEach((button) => {
        button.addEventListener('click', () => {
            const label = button.textContent.toLocaleLowerCase();
            roiType = label.includes('hybrid') ? 'hybrid' : label.includes('off') ? 'offgrid' : 'ongrid';
            document.querySelectorAll('.calc-toggle button').forEach((item) => item.classList.toggle('active', item === button));
            updateRoi();
        });
    });
    const subsidyToggle = document.getElementById('subsidyToggle');
    const toggleRoiSubsidy = () => {
        roiSubsidyEnabled = !roiSubsidyEnabled;
        subsidyToggle.setAttribute('aria-checked', String(roiSubsidyEnabled));
        updateRoi();
    };
    if (subsidyToggle) {
        subsidyToggle.setAttribute('role', 'switch');
        subsidyToggle.setAttribute('tabindex', '0');
        subsidyToggle.setAttribute('aria-checked', 'true');
        subsidyToggle.addEventListener('click', toggleRoiSubsidy);
        subsidyToggle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleRoiSubsidy();
            }
        });
    }
    if (document.getElementById('roiKw')) updateRoi();

    document.querySelectorAll('.elementor-accordion-item').forEach((item) => {
        const title = item.querySelector('.elementor-tab-title');
        const contentId = title?.getAttribute('aria-controls');
        const content = contentId ? document.getElementById(contentId) : item.querySelector('.elementor-tab-content');
        if (!title || !content) return;
        title.setAttribute('aria-expanded', 'false');
        content.hidden = true;
        const toggle = () => {
            const expanded = title.getAttribute('aria-expanded') === 'true';
            title.setAttribute('aria-expanded', String(!expanded));
            content.hidden = expanded;
        };
        title.addEventListener('click', toggle);
        title.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
            }
        });
    });

    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.getElementById('primary-nav');
    menuButton?.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(open));
        navigation?.classList.toggle('is-open', open);
    });
    navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        menuButton?.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
    }));

    const leadForm = document.getElementById('lead-form');
    leadForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const status = document.getElementById('lead-status');
        const submit = leadForm.querySelector('button[type="submit"]');
        const data = new FormData(leadForm);
        const payload = Object.fromEntries(data.entries());
        payload.consent = data.get('consent') === 'on';
        if (status) {
            status.textContent = '';
            status.className = 'form-message';
        }
        submit.disabled = true;
        try {
            const response = await fetch(apiUrl(leadForm.dataset.endpoint), {
                method: 'POST',
                headers: requestHeaders(),
                credentials: apiBaseUrl ? 'omit' : 'same-origin',
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Your request could not be submitted.');
            leadForm.reset();
            if (status) {
                status.textContent = result.message;
                status.classList.add('is-success');
            }
        } catch (error) {
            if (status) {
                status.textContent = error instanceof Error ? error.message : 'Your request could not be submitted.';
                status.classList.add('is-error');
            }
        } finally {
            submit.disabled = false;
        }
    });

    document.querySelectorAll('.lead-magnet').forEach((box) => {
        const input = box.querySelector('input[type="email"]');
        const button = box.querySelector('button');
        if (!input || !button) return;
        input.required = true;
        input.setAttribute('aria-label', 'Work email address');
        button.type = 'button';
        button.textContent = 'Request free guide';
        const status = document.createElement('p');
        status.className = 'form-message';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        box.append(status);

        const requestGuide = async () => {
            if (!input.reportValidity()) return;
            button.disabled = true;
            status.textContent = '';
            status.className = 'form-message';
            try {
                const response = await fetch(apiUrl(document.body.dataset.guideEndpoint), {
                    method: 'POST',
                    headers: requestHeaders(),
                    credentials: apiBaseUrl ? 'omit' : 'same-origin',
                    body: JSON.stringify({ email: input.value.trim() }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Your request could not be submitted.');
                input.value = '';
                status.textContent = result.message;
                status.classList.add('is-success');
            } catch (error) {
                status.textContent = error instanceof Error ? error.message : 'Your request could not be submitted.';
                status.classList.add('is-error');
            } finally {
                button.disabled = false;
            }
        };
        button.addEventListener('click', requestGuide);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                requestGuide();
            }
        });
    });
})();
