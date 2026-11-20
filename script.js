/* =========================================================
   Thee-Slay-station — dynamic storefront
   Products are rendered from data; cart & wishlist are saved
   in localStorage; checkout sends the order to WhatsApp.
   ========================================================= */

/* ---------- 1. SETTINGS (edit these) ---------- */
const CONFIG = {
    currency: 'UGX',
    promoCode: 'SLAY25',
    freeDeliveryThreshold: 300000,
    // Set a number (e.g. 10000) to charge a fixed delivery fee.
    // Leave as null to show "Confirmed on WhatsApp" instead.
    deliveryFee: null,
    whatsappNumber: '256780478299', // international format, no "+"
    pageSize: 8                      // products shown before "Show More"
};

/* ---------- 2. PRODUCT DATA ---------- */
const IMG = {
    a: 'https://images.unsplash.com/photo-1594035910387-fea47794261f',
    b: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539',
    c: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad',
    d: 'https://images.unsplash.com/photo-1541643600914-78b084683601',
    e: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de',
    f: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f'
};

const WOMEN = [
    ['Midnight Rose', 120000, 'a'], ['Jasmine Dreams', 98000, 'b'], ['Vanilla', 200000, 'c'],
    ['Eclaire', 170000, 'd'], ['Club de Nuit Woman', 150000, 'e'], ['Mikaya', 140000, 'f'],
    ['Intense Woman', 250000, 'a'], ['Yara Pink', 100000, 'b'], ['Sublime', 300000, 'c'],
    ['Yara White', 450000, 'd'], ['Valentino', 900000, 'e'], ['Prada', 1200000, 'f'],
    ['Creed', 1500000, 'a'], ['Jadore', 2000000, 'b'], ['My Way', 2000000, 'c'],
    ['YSL', 1500000, 'd'], ['Vanilla Powder', 2000000, 'e'], ['Miss Dior', 800000, 'f'],
    ['Eclaire Prestige', 750000, 'a']
];

const MEN = [
    ['Cedar Noir', 135000, 'f'], ['Ocean Breeze', 85000, 'a'], ['Spice and Smoke', 145000, 'b'],
    ['Blue Horizon', 172000, 'c'], ['Intense Man', 250000, 'd'], ['Club de Nuit Man', 150000, 'e'],
    ['Dior Sauvage', 300000, 'f'], ['9PM', 180000, 'a'], ['Lattafa Asad', 250000, 'b'],
    ['9PM Rebel', 170000, 'c'], ['Stronger With You', 250000, 'd'], ['Amouage Epic Man', 1000000, 'e'],
    ['Winter Wonder', 1500000, 'f'], ['Azzaro Most Wanted', 900000, 'a'], ['Tom Ford', 800000, 'b'],
    ['James Bond', 700000, 'c'], ['Black Opium', 750000, 'd']
];

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const PRODUCTS = [
    ...WOMEN.map(([name, price, img], i) => ({ name, price, img: IMG[img], collection: 'women', order: i })),
    ...MEN.map(([name, price, img], i) => ({ name, price, img: IMG[img], collection: 'men', order: i }))
].map(p => ({ ...p, id: `${p.collection}-${slug(p.name)}`, tier: tierOf(p.price) }));

function tierOf(price) {
    if (price < 200000) return 'everyday';
    if (price < 700000) return 'signature';
    return 'luxury';
}

const TIER_LABEL = { everyday: 'Everyday', signature: 'Signature', luxury: 'Luxury' };
const COLLECTION_BLURB = {
    women: 'Elegant, captivating, and unforgettable — part of our Women\'s Collection, curated for the modern woman.',
    men: 'Bold, sophisticated, and commanding — part of our Men\'s Collection, curated for the distinguished gentleman.'
};

const byId = id => PRODUCTS.find(p => p.id === id);
const money = n => `${n.toLocaleString('en-US')} ${CONFIG.currency}`;
const imgUrl = (p, size = 400) => `${p.img}?w=${size}&h=${size}&fit=crop`;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- 3. STATE (persisted) ---------- */
const store = {
    get(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }
};

const state = {
    cart: store.get('slay_cart', {}),          // { productId: qty }
    wishlist: store.get('slay_wishlist', []),  // [productId]
    promo: store.get('slay_promo', null),      // 'SLAY25' or null
    view: {
        women: { tier: 'all', sort: 'featured', shown: CONFIG.pageSize },
        men:   { tier: 'all', sort: 'featured', shown: CONFIG.pageSize }
    }
};

// Drop anything saved that no longer exists in the catalogue
Object.keys(state.cart).forEach(id => { if (!byId(id)) delete state.cart[id]; });
state.wishlist = state.wishlist.filter(byId);

function save() {
    store.set('slay_cart', state.cart);
    store.set('slay_wishlist', state.wishlist);
    store.set('slay_promo', state.promo);
}

/* ---------- 4. PRODUCT GRID ---------- */
function productCard(p, delay = 0) {
    const wished = state.wishlist.includes(p.id);
    return `
    <article class="product-card" data-id="${p.id}" style="animation-delay:${delay}ms">
        <div class="product-media" data-action="quick-view">
            <img src="${imgUrl(p)}" alt="${p.name}" class="product-image" loading="lazy">
            <span class="tier-tag ${p.tier}">${TIER_LABEL[p.tier]}</span>
            <button class="quick-view" data-action="quick-view"><i class="fas fa-eye"></i> Quick View</button>
        </div>
        <button class="wish-toggle ${wished ? 'active' : ''}" data-action="wish" aria-label="Add ${p.name} to wishlist">
            <i class="${wished ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="product-info">
            <h3>${p.name}</h3>
            <div class="price">${money(p.price)}</div>
            <button class="add-to-cart" data-action="add"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
        </div>
    </article>`;
}

function renderCollection(collection) {
    const v = state.view[collection];
    let list = PRODUCTS.filter(p => p.collection === collection && (v.tier === 'all' || p.tier === v.tier));

    const sorters = {
        'featured': (a, b) => a.order - b.order,
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        'name': (a, b) => a.name.localeCompare(b.name)
    };
    list.sort(sorters[v.sort]);

    const grid = $(`#${collection}Grid`);
    const visible = list.slice(0, v.shown);
    grid.innerHTML = visible.length
        ? visible.map((p, i) => productCard(p, (i % CONFIG.pageSize) * 50)).join('')
        : `<p class="empty-state">No fragrances in this price range yet.</p>`;

    const toolbar = $(`.toolbar[data-collection="${collection}"]`);
    $('.result-count', toolbar).textContent = `Showing ${visible.length} of ${list.length}`;

    const more = $(`.load-more[data-collection="${collection}"]`);
    more.hidden = v.shown >= list.length;
}

function setupToolbars() {
    $$('.toolbar').forEach(toolbar => {
        const collection = toolbar.dataset.collection;
        const v = state.view[collection];

        toolbar.addEventListener('click', e => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            $$('.chip', toolbar).forEach(c => c.classList.toggle('active', c === chip));
            v.tier = chip.dataset.tier;
            v.shown = CONFIG.pageSize;
            renderCollection(collection);
        });

        $('.sort-select', toolbar).addEventListener('change', e => {
            v.sort = e.target.value;
            renderCollection(collection);
        });
    });

    $$('.load-more').forEach(btn => btn.addEventListener('click', () => {
        const collection = btn.dataset.collection;
        state.view[collection].shown += CONFIG.pageSize;
        renderCollection(collection);
    }));
}

// One click handler for every product action anywhere on the page
document.addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const holder = actionEl.closest('[data-id]');
    const id = holder?.dataset.id;
    if (!id) return;

    switch (actionEl.dataset.action) {
        case 'add':
            addToCart(id, 1);
            flashAdded(actionEl);
            break;
        case 'wish':
            toggleWish(id);
            break;
        case 'quick-view':
            openQuickView(id);
            break;
        case 'inc': changeQty(id, 1); break;
        case 'dec': changeQty(id, -1); break;
        case 'remove': removeFromCart(id); break;
        case 'wish-to-cart':
            addToCart(id, 1);
            toggleWish(id);
            break;
    }
});

function flashAdded(btn) {
    if (btn.classList.contains('added')) return;
    const original = btn.innerHTML;
    btn.classList.add('added');
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = original; }, 1500);
}

/* ---------- 5. CART ---------- */
const cartCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);
const subtotal = () => Object.entries(state.cart).reduce((sum, [id, q]) => sum + byId(id).price * q, 0);

function addToCart(id, qty = 1) {
    state.cart[id] = (state.cart[id] || 0) + qty;
    save();
    renderCart();
    bump('#cartCount');
    toast(`<i class="fas fa-shopping-bag"></i> ${byId(id).name} added to cart`);
}

function changeQty(id, delta) {
    state.cart[id] = (state.cart[id] || 0) + delta;
    if (state.cart[id] <= 0) delete state.cart[id];
    save();
    renderCart();
}

function removeFromCart(id) {
    delete state.cart[id];
    save();
    renderCart();
}

function deliveryInfo(sub) {
    const unlocked = state.promo === CONFIG.promoCode && sub >= CONFIG.freeDeliveryThreshold;
    if (unlocked) return { label: 'FREE', fee: 0 };
    if (typeof CONFIG.deliveryFee === 'number') return { label: money(CONFIG.deliveryFee), fee: CONFIG.deliveryFee };
    return { label: 'Confirmed on WhatsApp', fee: 0 };
}

function renderCart() {
    const ids = Object.keys(state.cart);
    const body = $('#cartItems');
    const footer = $('#cartFooter');
    const count = cartCount();

    const badge = $('#cartCount');
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);

    if (!ids.length) {
        body.innerHTML = `
            <div class="drawer-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Your cart is empty.</p>
                <a href="#women" class="btn btn-outline close-link">Start Shopping</a>
            </div>`;
        footer.hidden = true;
        $('#freeShip').innerHTML = '';
        return;
    }

    footer.hidden = false;
    body.innerHTML = ids.map(id => {
        const p = byId(id), q = state.cart[id];
        return `
        <div class="line-item" data-id="${id}">
            <img src="${imgUrl(p, 140)}" alt="${p.name}">
            <div>
                <h4>${p.name}</h4>
                <div class="unit">${money(p.price)}</div>
                <div class="qty">
                    <button data-action="dec" aria-label="Decrease">−</button>
                    <span>${q}</span>
                    <button data-action="inc" aria-label="Increase">+</button>
                </div>
            </div>
            <div class="line-actions">
                <span class="line-total">${money(p.price * q)}</span>
                <button class="remove-btn" data-action="remove" aria-label="Remove"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }).join('');

    const sub = subtotal();
    const d = deliveryInfo(sub);
    $('#subtotal').textContent = money(sub);
    $('#delivery').textContent = d.label;
    $('#total').textContent = money(sub + d.fee);

    // Free-delivery progress bar
    const pct = Math.min(100, (sub / CONFIG.freeDeliveryThreshold) * 100);
    const remaining = CONFIG.freeDeliveryThreshold - sub;
    let msg;
    if (remaining > 0) msg = `Add <strong>${money(remaining)}</strong> more to qualify for free delivery.`;
    else if (state.promo === CONFIG.promoCode) msg = `<i class="fas fa-check-circle"></i> Free delivery unlocked!`;
    else msg = `You qualify for free delivery — apply code <strong>${CONFIG.promoCode}</strong> below.`;
    $('#freeShip').innerHTML = `${msg}<div class="progress"><span style="width:${pct}%"></span></div>`;

    updatePromoMsg();
}

function updatePromoMsg() {
    const el = $('#promoMsg');
    if (state.promo !== CONFIG.promoCode) { el.textContent = ''; el.className = 'promo-msg'; return; }
    const remaining = CONFIG.freeDeliveryThreshold - subtotal();
    if (remaining > 0) {
        el.textContent = `Code ${CONFIG.promoCode} saved — add ${money(remaining)} more to activate free delivery.`;
        el.className = 'promo-msg err';
    } else {
        el.textContent = `Code ${CONFIG.promoCode} applied — free delivery!`;
        el.className = 'promo-msg ok';
    }
}

function setupCart() {
    $('#promoForm').addEventListener('submit', e => {
        e.preventDefault();
        const code = $('#promoInput').value.trim().toUpperCase();
        if (!code) return;
        if (code === CONFIG.promoCode) {
            state.promo = code;
            $('#promoInput').value = '';
            save();
            renderCart();
        } else {
            $('#promoMsg').textContent = 'That code isn\'t valid.';
            $('#promoMsg').className = 'promo-msg err';
        }
    });

    $('#clearCart').addEventListener('click', () => {
        state.cart = {};
        save();
        renderCart();
    });

    $('#checkoutBtn').addEventListener('click', () => {
        const ids = Object.keys(state.cart);
        if (!ids.length) return;
        const sub = subtotal();
        const d = deliveryInfo(sub);
        const lines = ids.map(id => {
            const p = byId(id), q = state.cart[id];
            return `• ${p.name} (${p.collection === 'women' ? "Women's" : "Men's"}) x${q} — ${money(p.price * q)}`;
        });
        const message = [
            'Hello Thee-Slay-station! I would like to order:',
            '',
            ...lines,
            '',
            `Subtotal: ${money(sub)}`,
            `Delivery: ${d.label}`,
            state.promo ? `Promo code: ${state.promo}` : null,
            `Total: ${money(sub + d.fee)}`,
            '',
            'Name:',
            'Delivery location:'
        ].filter(l => l !== null).join('\n');

        window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    });
}

/* ---------- 6. WISHLIST ---------- */
function toggleWish(id) {
    const i = state.wishlist.indexOf(id);
    if (i >= 0) {
        state.wishlist.splice(i, 1);
    } else {
        state.wishlist.push(id);
        bump('#wishCount');
        toast(`<i class="fas fa-heart"></i> ${byId(id).name} saved to wishlist`);
    }
    save();
    renderWishlist();
    // Update every heart for this product on the page
    $$(`[data-id="${id}"] .wish-toggle`).forEach(btn => {
        const on = state.wishlist.includes(id);
        btn.classList.toggle('active', on);
        btn.innerHTML = `<i class="${on ? 'fas' : 'far'} fa-heart"></i>`;
    });
}

function renderWishlist() {
    const badge = $('#wishCount');
    badge.textContent = state.wishlist.length;
    badge.classList.toggle('show', state.wishlist.length > 0);

    const body = $('#wishItems');
    if (!state.wishlist.length) {
        body.innerHTML = `
            <div class="drawer-empty">
                <i class="far fa-heart"></i>
                <p>No favourites yet. Tap the heart on any fragrance to save it here.</p>
            </div>`;
        return;
    }
    body.innerHTML = state.wishlist.map(id => {
        const p = byId(id);
        return `
        <div class="line-item" data-id="${id}">
            <img src="${imgUrl(p, 140)}" alt="${p.name}">
            <div>
                <h4>${p.name}</h4>
                <div class="unit">${money(p.price)}</div>
            </div>
            <div class="line-actions">
                <button class="add-to-cart" data-action="wish-to-cart" style="padding:6px 12px;font-size:.8rem">
                    <i class="fas fa-cart-plus"></i>Move
                </button>
                <button class="remove-btn" data-action="wish" aria-label="Remove"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }).join('');
}

/* ---------- 7. DRAWERS, MODAL, SEARCH ---------- */
const backdrop = $('#backdrop');

function openDrawer(drawer) {
    closeAll();
    drawer.classList.add('open');
    backdrop.classList.add('show');
    document.body.classList.add('no-scroll');
}

function closeAll() {
    $$('.drawer.open, .nav-links.open').forEach(el => el.classList.remove('open'));
    $('#navbar').classList.remove('menu-open');
    $('#modal').classList.remove('open');
    $('#searchOverlay').classList.remove('open');
    backdrop.classList.remove('show');
    document.body.classList.remove('no-scroll');
}

function openModal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').classList.add('open');
    document.body.classList.add('no-scroll');
}

function openQuickView(id) {
    const p = byId(id);
    const wished = state.wishlist.includes(id);
    closeAll();
    openModal(`
        <div class="qv" data-id="${p.id}">
            <img src="${imgUrl(p, 700)}" alt="${p.name}">
            <div class="qv-info">
                <span class="collection-label">${p.collection === 'women' ? "Women's" : "Men's"} Collection · ${TIER_LABEL[p.tier]}</span>
                <h2>${p.name}</h2>
                <div class="price">${money(p.price)}</div>
                <p>${COLLECTION_BLURB[p.collection]}</p>
                <div class="qv-actions">
                    <div class="qty">
                        <button type="button" id="qvDec" aria-label="Decrease">−</button>
                        <span id="qvQty">1</span>
                        <button type="button" id="qvInc" aria-label="Increase">+</button>
                    </div>
                    <button class="add-to-cart" id="qvAdd"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                    <button class="wish-toggle ${wished ? 'active' : ''}" data-action="wish" aria-label="Wishlist">
                        <i class="${wished ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
                <p style="font-size:.85rem"><i class="fas fa-truck" style="color:var(--accent)"></i>
                   Free delivery on orders over ${money(CONFIG.freeDeliveryThreshold)} with code <strong>${CONFIG.promoCode}</strong>.</p>
            </div>
        </div>`);

    let qty = 1;
    const qtyEl = $('#qvQty');
    $('#qvInc').onclick = () => { qty++; qtyEl.textContent = qty; };
    $('#qvDec').onclick = () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; };
    $('#qvAdd').onclick = e => { addToCart(id, qty); flashAdded(e.currentTarget); };
}

const INFO = {
    shipping: `
        <h2>Shipping Policy</h2>
        <p>We deliver around Kampala from our shop in Ntinda.</p>
        <ul>
            <li>Orders over ${money(CONFIG.freeDeliveryThreshold)} get <strong>free delivery</strong> with code <strong>${CONFIG.promoCode}</strong>.</li>
            <li>For other orders, the delivery cost depends on your location and is confirmed when we receive your order on WhatsApp.</li>
        </ul>`,
    returns: `
        <h2>Returns &amp; Exchanges</h2>
        <p>Not happy with your order? Call or WhatsApp us on <a href="tel:+256780478299">0780478299</a> and our team will help you with a return or exchange.</p>`,
    faq: `
        <h2>Frequently Asked Questions</h2>
        <p><strong>Where are you located?</strong><br>Ntinda, Kampala, Uganda.</p>
        <p><strong>When are you open?</strong><br>Mon – Sat 9:00 AM – 7:00 PM, Sun 10:00 AM – 5:00 PM.</p>
        <p><strong>How do I order?</strong><br>Add fragrances to your cart and tap "Checkout on WhatsApp". Your order is sent to us and we confirm payment and delivery with you.</p>
        <p><strong>How do I get free delivery?</strong><br>Spend over ${money(CONFIG.freeDeliveryThreshold)} and enter code <strong>${CONFIG.promoCode}</strong> in your cart.</p>`
};

function setupOverlays() {
    $('#cartBtn').addEventListener('click', () => openDrawer($('#cartDrawer')));
    $('#wishlistBtn').addEventListener('click', () => openDrawer($('#wishDrawer')));
    $$('.close-drawer').forEach(b => b.addEventListener('click', closeAll));
    backdrop.addEventListener('click', closeAll);

    $('#modalClose').addEventListener('click', closeAll);
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeAll(); });

    $$('[data-info]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        openModal(`<div class="info-body">${INFO[a.dataset.info]}</div>`);
    }));

    // Links inside drawers (e.g. "Start Shopping") close the drawer
    document.addEventListener('click', e => { if (e.target.closest('.close-link')) closeAll(); });

    // Mobile menu
    $('#menuToggle').addEventListener('click', () => {
        const links = $('#navLinks');
        const opening = !links.classList.contains('open');
        closeAll();
        if (opening) {
            links.classList.add('open');
            $('#navbar').classList.add('menu-open');
            backdrop.classList.add('show');
        }
    });
    $$('#navLinks a').forEach(a => a.addEventListener('click', closeAll));

    // Search
    $('#searchBtn').addEventListener('click', () => {
        closeAll();
        $('#searchOverlay').classList.add('open');
        document.body.classList.add('no-scroll');
        renderSearch('');
        setTimeout(() => $('#searchInput').focus(), 100);
    });
    $('#closeSearch').addEventListener('click', closeAll);
    $('#searchInput').addEventListener('input', e => renderSearch(e.target.value));
    $('#searchResults').addEventListener('click', e => {
        const item = e.target.closest('.search-item');
        if (item) openQuickView(item.dataset.id);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAll();
        if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) {
            e.preventDefault();
            $('#searchBtn').click();
        }
    });
}

function renderSearch(query) {
    const q = query.trim().toLowerCase();
    const out = $('#searchResults');
    if (!q) {
        out.innerHTML = `<p class="search-hint">Start typing to search ${PRODUCTS.length} fragrances.</p>`;
        return;
    }
    const results = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) || p.collection.startsWith(q) || TIER_LABEL[p.tier].toLowerCase().startsWith(q)
    );
    if (!results.length) {
        out.innerHTML = `<p class="search-hint">No fragrances match “${escapeHtml(query)}”.</p>`;
        return;
    }
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    out.innerHTML = results.map(p => `
        <div class="search-item" data-id="${p.id}">
            <img src="${imgUrl(p, 120)}" alt="">
            <div>
                <h4>${p.name.replace(re, '<mark>$1</mark>')}</h4>
                <small>${p.collection === 'women' ? "Women's" : "Men's"} · ${TIER_LABEL[p.tier]}</small>
            </div>
            <span class="price">${money(p.price)}</span>
        </div>`).join('');
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 8. PAGE EFFECTS ---------- */
function toast(html) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('hide'); t.addEventListener('animationend', () => t.remove()); }, 2200);
}

function bump(sel) {
    const el = $(sel);
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
}

function setupScrollEffects() {
    const nav = $('#navbar');
    const toTop = $('#backToTop');
    const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
        toTop.classList.toggle('show', window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Highlight the nav link for the section in view
    const links = $$('#navLinks a');
    const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'women', 'men', 'about', 'contact'].forEach(id => spy.observe(document.getElementById(id)));

    // Fade-in on scroll
    const revealer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
        });
    }, { threshold: .15 });
    $$('.reveal').forEach(el => revealer.observe(el));
}

function setupHero() {
    // Fill in live numbers from the catalogue
    $$('[data-from]').forEach(el => {
        const prices = PRODUCTS.filter(p => p.collection === el.dataset.from).map(p => p.price);
        el.textContent = money(Math.min(...prices));
    });
    $$('[data-count-of]').forEach(el => {
        el.textContent = PRODUCTS.filter(p => p.collection === el.dataset.countOf).length;
    });

    // ---- Image slider ----
    const hero = $('#home');
    const slides = $$('.slide', hero);
    const dotsWrap = $('.slider-dots', hero);
    const bar = $('.slider-progress span', hero);
    let current = 0;

    dotsWrap.innerHTML = slides.map((_, i) => `<button role="tab" aria-label="Go to slide ${i + 1}"></button>`).join('');
    const dots = $$('button', dotsWrap);
    $('#slideTotal').textContent = String(slides.length).padStart(2, '0');

    function go(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((s, i) => {
            s.classList.toggle('active', i === current);
            s.setAttribute('aria-hidden', i !== current);
        });
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        $('#slideNum').textContent = String(current + 1).padStart(2, '0');
        // restart the progress bar — when it fills, we move to the next slide
        bar.classList.remove('run');
        void bar.offsetWidth;
        bar.classList.add('run');
    }

    bar.addEventListener('animationend', () => go(current + 1));
    $('.slider-arrow.prev', hero).addEventListener('click', () => go(current - 1));
    $('.slider-arrow.next', hero).addEventListener('click', () => go(current + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

    // Pause on hover and when the tab is hidden
    hero.addEventListener('mouseenter', () => hero.classList.add('paused'));
    hero.addEventListener('mouseleave', () => hero.classList.remove('paused'));
    document.addEventListener('visibilitychange', () => hero.classList.toggle('paused', document.hidden));

    // Swipe on phones
    let startX = null;
    hero.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', e => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
        startX = null;
    });

    // Arrow keys while the slider is on screen
    document.addEventListener('keydown', e => {
        if (document.body.classList.contains('no-scroll') || /input|textarea|select/i.test(document.activeElement.tagName)) return;
        if (window.scrollY > hero.offsetHeight * 0.6) return;
        if (e.key === 'ArrowRight') go(current + 1);
        if (e.key === 'ArrowLeft') go(current - 1);
    });

    go(0);

    // ---- Rotating top banner ----
    const messages = [
        `Complimentary delivery on orders over 300,000 UGX | Use code: <strong>${CONFIG.promoCode}</strong>`,
        `Visit us in Ntinda, Kampala — open 7 days a week`,
        `Order in seconds — checkout straight to <strong>WhatsApp</strong>`
    ];
    const banner = $('#bannerText');
    let m = 0;
    setInterval(() => {
        banner.classList.add('fade');
        setTimeout(() => { m = (m + 1) % messages.length; banner.innerHTML = messages[m]; banner.classList.remove('fade'); }, 400);
    }, 4500);
}

/* Footer shortcuts like "Men's Luxury 700K+" pre-select a filter */
function setupFooterFilters() {
    $$('[data-filter]').forEach(link => link.addEventListener('click', () => {
        const [collection, tier] = link.dataset.filter.split(':');
        $(`.toolbar[data-collection="${collection}"] .chip[data-tier="${tier}"]`).click();
    }));
}

/* Shows "Open now" / "Closed" using Kampala time (EAT, UTC+3) */
function updateOpenStatus() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Kampala', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type).value;
    const day = get('weekday');
    const mins = (+get('hour') % 24) * 60 + +get('minute');
    const [open, close] = day === 'Sun' ? [10 * 60, 17 * 60] : [9 * 60, 19 * 60];
    const isOpen = mins >= open && mins < close;

    let text;
    if (isOpen) {
        const left = close - mins;
        text = left <= 60 ? `Open now · closes in ${left} min` : 'Open now';
    } else {
        text = mins < open ? `Closed · opens at ${open / 60}:00 AM` : 'Closed now';
    }
    $$('.open-status').forEach(el => {
        el.className = `open-status ${isOpen ? 'open' : 'closed'}`;
        el.textContent = text;
    });
}

function setupNewsletter() {
    const form = $('#newsletterForm');
    const input = $('#newsletterEmail');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        input.classList.toggle('invalid', !ok);
        if (!ok) { toast('<i class="fas fa-exclamation-circle"></i> Please enter a valid email'); return; }
        const subs = store.get('slay_subscribers', []);
        subs.push(input.value.trim());
        store.set('slay_subscribers', subs);
        input.value = '';
        toast('<i class="fas fa-check-circle"></i> Thanks for subscribing!');
    });
    input.addEventListener('input', () => input.classList.remove('invalid'));
}

/* ---------- 9. INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();
    renderCollection('women');
    renderCollection('men');
    setupToolbars();
    renderCart();
    renderWishlist();
    setupCart();
    setupOverlays();
    setupScrollEffects();
    setupHero();
    setupFooterFilters();
    setupNewsletter();
    updateOpenStatus();
    setInterval(updateOpenStatus, 60000);
});
