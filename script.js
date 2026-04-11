// Files changed: script.js

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

async function login(e) { 
    e.preventDefault(); 
    
    const username = document.getElementById('login-username').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : "Login";
    
    // UI Feedback while checking the database
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Verifying...';
        btn.disabled = true;
    }
    
    try {
        // Query the PlayerDB API (The industry standard for web-based CORS lookups)
        const res = await fetch(`https://playerdb.co/api/player/minecraft/${username}`);
        
        // If the API finds the player, res.ok is true (Premium). 
        // If the username doesn't exist on Mojang, it throws a 404 (Cracked).
        const actualAccountType = res.ok ? "Premium" : "Cracked";
        
        localStorage.setItem('username', username);
        localStorage.setItem('account_type', actualAccountType);
        localStorage.setItem('cart', '{}'); 
        cart = {}; 
        checkLogin();
        
    } catch (err) {
        // Fallback in case the API goes down completely or the user has no internet
        console.warn("Verification API offline. Defaulting to Cracked.");
        localStorage.setItem('username', username);
        localStorage.setItem('account_type', "Cracked");
        localStorage.setItem('cart', '{}'); 
        cart = {}; 
        checkLogin();
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}
function logout() { localStorage.removeItem('username'); localStorage.removeItem('account_type'); localStorage.removeItem('cart'); checkLogin(); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('translate-x-full'); }
function copyIP() { navigator.clipboard.writeText(document.getElementById('server-ip').innerText); alert('IP Copied!'); }

function showSection(sectionId) {
    document.getElementById('section-home').classList.add('hidden');
    document.getElementById('section-packages').classList.add('hidden');
    
    // Remove the highlight from static links (like the Homepage button)
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    if (sectionId === 'home') {
        document.getElementById('section-home').classList.remove('hidden');
        document.getElementById('nav-home').classList.add('active');
        
        // Force the dynamic category list to refresh and remove its highlight
        renderCategories(); 
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
        renderRecentPurchases();
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
        
        const baseClasses = "block px-4 py-3 mb-2 transition-all duration-200 font-bold text-xs flex justify-between items-center rounded-xl border shadow-sm transform hover:-translate-y-1 hover:shadow-md";
        const activeClasses = isActive 
            ? "bg-purple-600 border-purple-400 text-white shadow-purple-600/30" 
            : "bg-purple-950/50 border-purple-800 text-purple-300 hover:bg-purple-800/80 hover:border-purple-500 hover:text-white";

        li.innerHTML = `
            <a href="#" onclick="showSection('${id}'); return false;" class="${baseClasses} ${activeClasses}">
                <span>${name}</span>
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

    const normalize = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeActiveId = normalize(activeCategory);
    const safeActiveName = normalize(catName);

    // 1. Get all packages that belong to the current active category
    let categoryPackages = Object.entries(storeData.packages).filter(([id, pkg]) => {
        const safePkgCat = normalize(pkg.category || '');
        return safePkgCat === safeActiveId || safePkgCat === safeActiveName;
    });

    if (categoryPackages.length > 0) hasPackages = true;

    // Helper to generate the package HTML block
    const generatePackageHTML = (id, pkg) => `
        <div class="flex items-center justify-between p-5 bg-purple-900/30 border border-purple-800/50 rounded-xl hover:bg-purple-800/40 transition">
            <h4 class="text-sm font-bold text-purple-100 uppercase">${pkg.name}</h4>
            <div class="flex items-center gap-6">
                <span class="text-purple-300 font-black">₱${formatMoney(pkg.price)}</span>
                <button onclick="addToCart('${id}')" class="bg-purple-700 hover:bg-purple-600 text-white hover:text-[#FFD700] font-black py-2 px-6 rounded-lg text-[11px] border border-purple-600/50 shadow-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] group">
                    <i class="fa-solid fa-cart-plus mr-1 transition-colors duration-300 group-hover:text-[#FFD700]"></i> ADD TO CART
                </button>
            </div>
        </div>`;

    // 2. Custom Grouping Logic for "Keys" Category
    if (safeActiveName.includes("key") || safeActiveId.includes("key")) {
        
        // Separate the keys into their specific groups
        let twicraftKeys = categoryPackages.filter(([id, pkg]) => pkg.name.toLowerCase().includes("twicraftmc"));
        let godKeys = categoryPackages.filter(([id, pkg]) => pkg.name.toLowerCase().includes("god"));
        let otherKeys = categoryPackages.filter(([id, pkg]) => !pkg.name.toLowerCase().includes("twicraftmc") && !pkg.name.toLowerCase().includes("god"));

        // Sort each group by price (High to Low)
        const sortByPrice = (a, b) => b[1].price - a[1].price;
        twicraftKeys.sort(sortByPrice);
        godKeys.sort(sortByPrice);
        otherKeys.sort(sortByPrice);

        // Render God Keys Group
        if (godKeys.length > 0) {
            grid.innerHTML += `<div class="col-span-1 mt-4 mb-1"><h3 class="text-purple-400 font-bold uppercase text-[10px] tracking-widest border-b border-purple-800/50 pb-2">God Keys</h3></div>`;
            godKeys.forEach(([id, pkg]) => grid.innerHTML += generatePackageHTML(id, pkg));
        }

        // Render TwiCraftMC Keys Group
        if (twicraftKeys.length > 0) {
            grid.innerHTML += `<div class="col-span-1 mt-2 mb-1"><h3 class="text-purple-400 font-bold uppercase text-[10px] tracking-widest border-b border-purple-800/50 pb-2">TwiCraftMC Keys</h3></div>`;
            twicraftKeys.forEach(([id, pkg]) => grid.innerHTML += generatePackageHTML(id, pkg));
        }

        // Render Any Leftover Keys Group
        if (otherKeys.length > 0) {
            grid.innerHTML += `<div class="col-span-1 mt-4 mb-1"><h3 class="text-purple-400 font-bold uppercase text-[10px] tracking-widest border-b border-purple-800/50 pb-2">Other Keys</h3></div>`;
            otherKeys.forEach(([id, pkg]) => grid.innerHTML += generatePackageHTML(id, pkg));
        }

    } else {
        // 3. Normal Rendering for all other categories (Sorted High to Low)
        categoryPackages.sort((a, b) => b[1].price - a[1].price);
        categoryPackages.forEach(([id, pkg]) => {
            grid.innerHTML += generatePackageHTML(id, pkg);
        });
    }

    // 4. Handle Empty Categories
    if (!hasPackages) {
        grid.innerHTML = `
            <div class="w-full flex flex-col items-center justify-center py-12 rounded-xl border border-purple-800 border-dashed">
                <i class="fa-solid fa-ghost text-3xl text-purple-600 mb-2"></i>
                <span class="text-purple-400 font-medium text-sm">No packages available here.</span>
            </div>`;
    }
}

let toastTimeout;

function addToCart(id) { 
    cart[id] = (cart[id] || 0) + 1; 
    saveCart(); 
    showToast(id);
}

function showToast(id) {
    const pkg = storeData.packages[id];
    if (!pkg) return;

    const container = document.getElementById('toast-container');
    if (!container) return;

    // 1. Create a brand new toast element for this specific click
    const toast = document.createElement('div');
    
    // Start it slightly lower and invisible for the slide-up effect
    toast.className = "bg-purple-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-purple-400 transition-all duration-300 transform translate-y-10 opacity-0";
    
    toast.innerHTML = `
        <i class="fa-solid fa-circle-check text-2xl text-green-300"></i>
        <div>
            <p class="text-sm font-black tracking-wide">Added to Cart!</p>
            <p class="text-xs text-purple-200 uppercase font-bold mt-0.5">${pkg.name}</p>
        </div>
    `;

    // 2. Add it to the stack
    container.appendChild(toast);

    // 3. Trigger the entrance animation immediately after it's added
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });
    });

    // 4. Set a dedicated timer to fade out THIS specific toast after 3 seconds
    setTimeout(() => {
        // Trigger exit animation (fade out and shrink slightly)
        toast.classList.add('opacity-0', 'scale-95');
        
        // Wait for the CSS transition to finish (300ms) before physically deleting the code
        setTimeout(() => {
            if (container.contains(toast)) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}
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
                    <span class="text-purple-400 font-black">₱${formatMoney(pkg.price * qty)}</span>
                </div>
            </li>`;
    }
    
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = formatMoney(total);
}

function checkout() { if (Object.keys(cart).length === 0) return; document.getElementById('checkout-modal').classList.remove('hidden'); }
function closeCheckout() { 
    // Hide the modal and stop listening for the API
    document.getElementById('checkout-modal').classList.add('hidden'); 
    if (pollInterval) clearInterval(pollInterval); 

    // Reset the modal views back to their default state for the next time
    document.getElementById('checkout-form-view').classList.remove('hidden');
    document.getElementById('checkout-qr-view').classList.add('hidden');
    document.getElementById('checkout-success-view').classList.add('hidden');

    // Clear the phone number input
    document.getElementById('checkout-phone').value = '';
}

async function submitPhone(e) { 
    e.preventDefault(); 
    const phone = document.getElementById('checkout-phone').value;
    const total = document.getElementById('cart-total').textContent; 
    try { 
        await fetch(API_URL.replace('/api/store', '/api/checkout'), { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ phone, amount: parseFloat(total.replace(/,/g, '')), cart }) 
        }); 
        document.getElementById('checkout-form-view').classList.add('hidden'); 
        document.getElementById('checkout-qr-view').classList.remove('hidden'); 
        document.getElementById('qr-amount-display').textContent = `₱${total}`; 
        document.getElementById('checkout-qr-img').src = API_URL.replace('/api/store', `/api/qr?amount=${total.replace(/,/g, '')}`); 
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
            
            // --- NEW: Save the purchase data ---
            const buyer = localStorage.getItem('username') || "Guest";
            const firstPkgId = Object.keys(cart)[0];
            const pkgName = storeData.packages[firstPkgId] ? storeData.packages[firstPkgId].name : "Store Item";
            
            recentPurchases.unshift({ player: buyer, package: pkgName });
            localStorage.setItem('recentPurchases', JSON.stringify(recentPurchases));
            renderRecentPurchases();
            // -----------------------------------

            clearCart(); 
        } 
    } catch (err) {} 
}

// Load saved local purchases or empty array
let recentPurchases = JSON.parse(localStorage.getItem('recentPurchases') || '[]');

function renderRecentPurchases() {
    const list = document.getElementById('recent-purchases-list');
    if (!list) return;

    // Prefers API data if you add it later, otherwise uses saved local data
    const dataToRender = storeData.recentPurchases || recentPurchases;

    if (!dataToRender || dataToRender.length === 0) {
        list.innerHTML = `<li class="text-purple-400 text-xs italic text-center py-4">None</li>`;
        return;
    }

    list.innerHTML = '';
    // Show up to 5 most recent purchases
    const displayList = dataToRender.slice(0, 5);

    for (const purchase of displayList) {
        list.innerHTML += `
            <li class="flex items-center gap-3 text-sm p-2 rounded-lg bg-purple-950/30 border border-purple-800/30">
                <img src="https://minotar.net/avatar/${purchase.player}/32" class="rounded bg-purple-800" alt="Player">
                <div>
                    <p class="font-bold text-purple-100">${purchase.player}</p>
                    <p class="text-[10px] text-purple-400 uppercase font-black">${purchase.package}</p>
                </div>
            </li>`;
    }
}

init();

// --- [ NUCLEAR ANTI-INSPECT SYSTEM ] ---
(function() {
    // 1. The Slap: Completely wipe the page and replace it
    function nukePage() {
        document.body.innerHTML = `
            <div style="height: 100vh; width: 100vw; background-color: #2e1065; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
                <h1 style="font-size: 3rem; font-weight: 900; margin-bottom: 10px; color: #ef4444;">ACCESS DENIED</h1>
                <p style="color: #d8b4fe; max-width: 400px; margin-bottom: 30px;">Developer tools are disabled to protect transaction integrity.</p>
                <button onclick="location.reload()" style="background-color: #9333ea; border: none; padding: 12px 24px; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Return to Store</button>
            </div>
        `;
    }

    // 2. Prevent Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    document.addEventListener('keydown', function(e) {
        if (
            e.key === "F12" || 
            (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) || 
            (e.ctrlKey && e.key === "U" || e.key === "u")
        ) {
            e.preventDefault();
            nukePage();
            return false;
        }
    });

    // 3. Prevent Right Click completely
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        nukePage();
    });

    // 4. The Aggressive Debugger Trap
    // This fires constantly. If DevTools is open, it freezes their browser.
    setInterval(function() {
        const before = performance.now();
        debugger; 
        const after = performance.now();
        if (after - before > 100) {
            nukePage(); // If it took too long, DevTools is open. Nuke it.
        }
    }, 500);

    // 5. Window Resize Detection
    // If DevTools opens docked to the side/bottom, the screen suddenly shrinks.
    const threshold = 160;
    setInterval(function() {
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            nukePage();
        }
    }, 1000);

    // 6. Console Spam
    // Blinds them if they manage to get the console open
    setInterval(function() {
        console.clear();
        console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold;");
        console.log("%cThis is a restricted area. Do not paste anything here.", "font-size: 18px;");
    }, 100);
})();
// --- [ END NUCLEAR ANTI-INSPECT ] ---

// --- Helper Function for Formatting Money ---
function formatMoney(amount) {
    return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}