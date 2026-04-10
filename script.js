/* File: script.js */
const API_URL = "https://api.twicraftmc.com/api/store";
let storeData = { categories: {}, packages: {} };
let activeCategory = null;
let cart = JSON.parse(localStorage.getItem('cart') || '{}');
let pollInterval = null;

async function init() {
    processUrlParams();
    checkLogin();
    await fetchStoreData();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'checkout') {
        setTimeout(() => {
            const sidebar = document.getElementById('cart-sidebar');
            if (sidebar) sidebar.classList.remove('translate-x-full');
        }, 400);
    }

    if (window.autoCheckout) {
        checkout();
        window.autoCheckout = false;
    }
}

function processUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUser = urlParams.get('user'), urlType = urlParams.get('type'), urlCart = urlParams.get('cart');
    if (urlUser && urlType && urlCart) {
        localStorage.setItem('username', urlUser);
        localStorage.setItem('account_type', urlType);
        try {
            let decodedCart;
            try { 
                decodedCart = decodeURIComponent(urlCart.replace(/\+/g, '%20')); 
                JSON.parse(decodedCart); 
            } 
            catch (e) { 
                decodedCart = atob(urlCart); 
            }
            localStorage.setItem('cart', decodedCart);
            cart = JSON.parse(decodedCart);
            window.autoCheckout = true;
        } catch (e) { 
            console.error("Invalid cart data."); 
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function checkLogin() {
    const username = localStorage.getItem('username'), accountType = localStorage.getItem('account_type');
    if (username) {
        document.getElementById('login-gate').classList.add('hidden');
        document.getElementById('store-layout').classList.remove('hidden');
        document.getElementById('nav-user-info').classList.replace('hidden', 'flex');
        document.getElementById('nav-username').textContent = username;
        document.getElementById('nav-account-type').textContent = accountType;
        document.getElementById('nav-avatar').src = accountType === 'Premium' ? `https://minotar.net/helm/${username}/40.png` : `https://minotar.net/helm/Steve/40.png`;
        renderCart();
    } else {
        document.getElementById('login-gate').classList.remove('hidden');
        document.getElementById('store-layout').classList.add('hidden');
        document.getElementById('nav-user-info').classList.replace('flex', 'hidden');
    }
}

function login(e) { e.preventDefault(); localStorage.setItem('username', document.getElementById('login-username').value); localStorage.setItem('account_type', document.getElementById('login-type').value); localStorage.setItem('cart', '{}'); cart = {}; checkLogin(); }
function logout() { localStorage.removeItem('username'); localStorage.removeItem('account_type'); localStorage.removeItem('cart'); checkLogin(); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('translate-x-full'); }
function copyIP() { navigator.clipboard.writeText(document.getElementById('server-ip').innerText); alert('IP Copied!'); }

function showSection(sectionId) {
    document.getElementById('section-home').classList.add('hidden');
    document.getElementById('section-packages').classList.add('hidden');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    if (sectionId === 'home') {
        document.getElementById('section-home').classList.remove('hidden');
        document.getElementById('nav-home').classList.add('active');
    } else {
        document.getElementById('section-packages').classList.remove('hidden');
        setCategory(sectionId);
    }
}

async function fetchStoreData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API Offline");
        storeData = await response.json();
        
        // Auto-select first category if available
        const catKeys = Object.keys(storeData.categories || {});
        if (catKeys.length > 0) activeCategory = catKeys[0];
        
        renderCategories();
        
        // If packages section is currently visible, render them
        if (!document.getElementById('section-packages').classList.contains('hidden')) {
            renderPackages();
        }
        renderCart();
    } catch (error) { 
        console.error(error);
        document.getElementById('api-error').classList.remove('hidden'); 
    }
}

function setCategory(id) { 
    activeCategory = id; 
    renderCategories(); 
    renderPackages(); 
}

function renderCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!storeData.categories || Object.keys(storeData.categories).length === 0) {
        list.innerHTML = `<li class="px-5 py-4 text-purple-400 text-sm italic">No categories found.</li>`;
        return;
    }

    for (const [id, name] of Object.entries(storeData.categories)) {
        const isActive = activeCategory === id && !document.getElementById('section-packages').classList.contains('hidden');
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" onclick="showSection('${id}'); return false;" 
               class="block px-3 py-2 hover:bg-purple-800/30 transition font-bold text-xs flex justify-between items-center rounded-lg ${isActive ? 'nav-link active' : 'text-purple-300'}">
                ${name}
                ${isActive ? '<i class="fa-solid fa-chevron-right text-[10px]"></i>' : ''}
            </a>`;
        list.appendChild(li);
    }
}

function renderPackages() {
    const grid = document.getElementById('packages-grid');
    const title = document.getElementById('active-category-title');
    
    if (!grid || !title || !storeData.packages) return;
    grid.innerHTML = ''; 
    let hasPackages = false;

    const catName = storeData.categories[activeCategory] || "Unknown Category";
    title.textContent = catName;

    // Restore your original robust matching logic
    const normalize = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeActiveId = normalize(activeCategory);
    const safeActiveName = normalize(catName);

    // Sort by price high to low just like your original code
    const sortedPackages = Object.entries(storeData.packages).sort((a, b) => b[1].price - a[1].price);

    for (const [id, pkg] of sortedPackages) {
        const safePkgCat = normalize(pkg.category || '');
        
        if (safePkgCat === safeActiveId || safePkgCat === safeActiveName) {
            hasPackages = true;
            grid.innerHTML += `
                <div class="flex items-center justify-between p-5 bg-purple-900/30 border border-purple-800/50 rounded-xl hover:bg-purple-800/40 transition">
                    <h4 class="text-sm font-bold text-purple-100 uppercase">${pkg.name}</h4>
                    <div class="flex items-center gap-6">
                        <span class="text-purple-300 font-black">₱${pkg.price.toFixed(2)}</span>
                        <button onclick="addToCart('${id}')" class="bg-purple-700 hover:bg-purple-600 text-white font-black py-2 px-6 rounded-lg text-[11px] border border-purple-600/50 shadow-sm">
                            ADD TO CART
                        </button>
                    </div>
                </div>`;
        }
    }

    if (!hasPackages) {
        grid.innerHTML = `
            <div class="w-full flex flex-col items-center justify-center py-12 rounded-xl border border-purple-800 border-dashed">
                <i class="fa-solid fa-ghost text-3xl text-purple-600 mb-2"></i>
                <span class="text-purple-400 font-medium text-sm">No packages available here.</span>
            </div>`;
    }
}

function addToCart(id) { cart[id] = (cart[id] || 0) + 1; saveCart(); }
function removeFromCart(id) { if (cart[id]) { cart[id]--; if (cart[id] <= 0) delete cart[id]; } saveCart(); }
function clearCart() { cart = {}; saveCart(); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); }

function renderCart() {
    const list = document.getElementById('cart-items'); 
    if (!list) return;
    list.innerHTML = '';
    
    let total = 0, count = 0;
    const isEmpty = Object.keys(cart).length === 0;
    
    const emptyMsg = document.getElementById('cart-empty');
    const footer = document.getElementById('cart-footer');
    if (emptyMsg) emptyMsg.classList.toggle('hidden', !isEmpty);
    if (footer) footer.classList.toggle('hidden', isEmpty);

    for (const [id, qty] of Object.entries(cart)) {
        const pkg = storeData.packages[id]; 
        if (!pkg) continue;
        
        total += pkg.price * qty; 
        count += qty;
        
        list.innerHTML += `
            <li class="p-4 flex flex-col gap-2 bg-purple-900/40 rounded-lg border border-purple-800/50 mb-1">
                <div class="flex justify-between items-start">
                    <span class="text-white font-bold text-xs uppercase">${pkg.name}</span>
                    <button onclick="removeFromCart('${id}')" class="text-purple-500 hover:text-red-400 transition"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="flex justify-between items-center text-[10px]">
                    <span class="text-purple-300 bg-purple-950 px-2 py-1 rounded">Qty: ${qty}</span>
                    <span class="text-purple-400 font-black">₱${(pkg.price * qty).toFixed(2)}</span>
                </div>
            </li>`;
    }
    
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

function checkout() { if (Object.keys(cart).length === 0) return; document.getElementById('checkout-modal').classList.remove('hidden'); }
function closeCheckout() { document.getElementById('checkout-modal').classList.add('hidden'); if (pollInterval) clearInterval(pollInterval); }

async function submitPhone(e) { 
    e.preventDefault(); 
    const phone = document.getElementById('checkout-phone').value;
    const total = document.getElementById('cart-total').textContent; 
    try { 
        await fetch(API_URL.replace('/api/store', '/api/checkout'), { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ phone, amount: parseFloat(total), cart }) 
        }); 
        document.getElementById('checkout-form-view').classList.add('hidden'); 
        document.getElementById('checkout-qr-view').classList.remove('hidden'); 
        document.getElementById('qr-amount-display').textContent = `₱${total}`; 
        document.getElementById('checkout-qr-img').src = API_URL.replace('/api/store', `/api/qr?amount=${total}`); 
        pollInterval = setInterval(() => checkStatus(phone), 3000); 
    } catch (err) { alert("Server Error."); } 
}

async function checkStatus(phone) { 
    try { 
        const res = await fetch(API_URL.replace('/api/store', `/api/status?phone=${phone}`)); 
        const data = await res.json(); 
        if (data.status === 'VERIFIED') { 
            clearInterval(pollInterval); 
            document.getElementById('checkout-qr-view').classList.add('hidden'); 
            document.getElementById('checkout-success-view').classList.remove('hidden'); 
            document.getElementById('verification-code-display').textContent = data.code; 
            clearCart(); 
        } 
    } catch (err) {} 
}

init();