<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TwiCraftMC Store</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #1a202c; color: #e2e8f0; }
        .nav-link.active { background-color: #2d3748; color: #63b3ed; border-left: 4px solid #3182ce; }
        .hidden { display: none !important; }
    </style>
</head>
<body class="font-sans antialiased min-h-screen flex flex-col">
    <nav class="bg-gray-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center">
                    <span class="font-bold text-xl text-blue-400 tracking-wider">TwiCraftMC Store</span>
                </div>
                <div id="nav-user-info" class="hidden">
                    <span class="text-sm text-gray-300 mr-4 hidden sm:inline">Playing as <strong id="nav-username"></strong> (<span id="nav-account-type"></span>)</span>
                    <button onclick="logout()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition">Logout</button>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div id="login-gate" class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl mt-12 border border-gray-700 hidden">
            <h2 class="text-2xl font-bold mb-6 text-center text-white">Enter your Details</h2>
            <form onsubmit="login(event)">
                <div class="mb-4">
                    <label class="block text-gray-300 text-sm font-bold mb-2">Minecraft Username</label>
                    <input type="text" id="login-username" required class="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 bg-gray-900 text-white leading-tight focus:outline-none focus:border-blue-500" placeholder="e.g. Notch">
                </div>
                <div class="mb-6">
                    <label class="block text-gray-300 text-sm font-bold mb-2">Account Type</label>
                    <select id="login-type" class="shadow border border-gray-600 rounded w-full py-3 px-4 bg-gray-900 text-white leading-tight focus:outline-none focus:border-blue-500">
                        <option value="Premium">Premium</option>
                        <option value="Cracked">Cracked</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150">
                    Continue to Store
                </button>
            </form>
        </div>

        <div id="store-layout" class="flex flex-col md:flex-row gap-6 hidden">
            
            <div class="w-full md:w-1/4">
                <div class="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
                    <div class="bg-gray-900 px-4 py-3 border-b border-gray-700">
                        <h3 class="text-lg font-semibold text-white uppercase tracking-wide">Categories</h3>
                    </div>
                    <ul id="categories-list" class="divide-y divide-gray-700">
                        </ul>
                </div>
            </div>

            <div class="w-full md:w-1/2">
                <div id="api-error" class="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4 shadow-md hidden">
                    <strong>Offline:</strong> Unable to connect to the TCBilling API. Please ensure the Minecraft server is running.
                </div>
                <div id="packages-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    </div>
            </div>

            <div class="w-full md:w-1/4">
                <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 sticky top-4">
                    <div class="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-white uppercase tracking-wide">Your Cart</h3>
                        <span id="cart-count" class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">0</span>
                    </div>
                    <div class="p-4">
                        <div id="cart-empty" class="text-gray-500 text-center text-sm py-4 hidden">Your cart is empty.</div>
                        <ul id="cart-items" class="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                            </ul>
                        <div id="cart-footer" class="hidden">
                            <div class="border-t border-gray-700 pt-4 mb-4">
                                <div class="flex justify-between items-center text-lg font-bold text-white">
                                    <span>Total:</span>
                                    <span class="text-green-400">₱<span id="cart-total">0.00</span></span>
                                </div>
                            </div>
                            <button onclick="alert('Checkout integration is handled in-game! Login to TwiCraftMC and type /buy to view your cart and scan the GCash QR code.')" class="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-2 transition shadow">
                                Checkout Now
                            </button>
                            <button onclick="clearCart()" class="block w-full text-center bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded transition">
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    
    <footer class="bg-gray-900 py-6 text-center text-sm text-gray-500 mt-auto border-t border-gray-800">
        <p>&copy; 2026 TwiCraftMC Store. Not affiliated with Mojang AB.</p>
    </footer>

    <script>
        // --- CONFIGURATION ---
        // REPLACE THIS IP WITH YOUR MINECRAFT SERVER's PUBLIC IP
        const API_URL = "http://170.23.61.130:25894/api/store";
        // ---------------------

        let storeData = { categories: {}, packages: {} };
        let activeCategory = null;
        let cart = JSON.parse(localStorage.getItem('cart') || '{}');

        async function init() {
            checkLogin();
            await fetchStoreData();
        }

        function checkLogin() {
            const username = localStorage.getItem('username');
            const accountType = localStorage.getItem('account_type');
            
            if (username) {
                document.getElementById('login-gate').classList.add('hidden');
                document.getElementById('store-layout').classList.remove('hidden');
                document.getElementById('nav-user-info').classList.remove('hidden');
                document.getElementById('nav-username').textContent = username;
                document.getElementById('nav-account-type').textContent = accountType;
                renderCart();
            } else {
                document.getElementById('login-gate').classList.remove('hidden');
                document.getElementById('store-layout').classList.add('hidden');
                document.getElementById('nav-user-info').classList.add('hidden');
            }
        }

        function login(e) {
            e.preventDefault();
            localStorage.setItem('username', document.getElementById('login-username').value);
            localStorage.setItem('account_type', document.getElementById('login-type').value);
            localStorage.setItem('cart', '{}');
            cart = {};
            checkLogin();
        }

        function logout() {
            localStorage.removeItem('username');
            localStorage.removeItem('account_type');
            localStorage.removeItem('cart');
            checkLogin();
        }

        async function fetchStoreData() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error("Network response was not ok");
                storeData = await response.json();
                
                const catKeys = Object.keys(storeData.categories);
                if (catKeys.length > 0) activeCategory = catKeys[0];
                
                renderCategories();
                renderPackages();
            } catch (error) {
                console.error("API Fetch Error:", error);
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
            list.innerHTML = '';
            
            for (const [id, name] of Object.entries(storeData.categories)) {
                const isActive = activeCategory === id;
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" onclick="setCategory('${id}'); return false;" class="block px-4 py-3 hover:bg-gray-700 transition ${isActive ? 'nav-link active' : 'text-gray-300'}">${name}</a>`;
                list.appendChild(li);
            }
            if (Object.keys(storeData.categories).length === 0) {
                list.innerHTML = `<li class="px-4 py-3 text-gray-500 text-sm">No categories found.</li>`;
            }
        }

        function renderPackages() {
            const grid = document.getElementById('packages-grid');
            grid.innerHTML = '';
            let hasPackages = false;

            for (const [id, pkg] of Object.entries(storeData.packages)) {
                if (pkg.category == activeCategory) {
                    hasPackages = true;
                    grid.innerHTML += `
                        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 flex flex-col hover:border-gray-500 transition">
                            <div class="p-5 flex-grow">
                                <h4 class="text-xl font-bold text-white mb-1">${pkg.name}</h4>
                                <p class="text-blue-400 font-semibold text-lg mb-4">₱${pkg.price.toFixed(2)}</p>
                            </div>
                            <div class="bg-gray-900 p-4 mt-auto">
                                <button onclick="addToCart('${id}')" class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition">
                                    Add to Cart
                                </button>
                            </div>
                        </div>`;
                }
            }

            if (!hasPackages) {
                grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-12 bg-gray-800 rounded-lg border border-gray-700 shadow-inner">No packages available in this category.</div>`;
            }
        }

        function addToCart(id) {
            if (!cart[id]) cart[id] = 0;
            cart[id]++;
            saveCart();
        }

        function removeFromCart(id) {
            if (cart[id]) {
                cart[id]--;
                if (cart[id] <= 0) delete cart[id];
            }
            saveCart();
        }

        function clearCart() {
            cart = {};
            saveCart();
        }

        function saveCart() {
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
        }

        function renderCart() {
            const list = document.getElementById('cart-items');
            list.innerHTML = '';
            let total = 0;
            let count = 0;

            const isEmpty = Object.keys(cart).length === 0;
            document.getElementById('cart-empty').classList.toggle('hidden', !isEmpty);
            document.getElementById('cart-footer').classList.toggle('hidden', isEmpty);

            for (const [id, qty] of Object.entries(cart)) {
                const pkg = storeData.packages[id];
                if (!pkg) continue;
                
                total += pkg.price * qty;
                count += qty;

                list.innerHTML += `
                    <li class="flex justify-between items-center text-sm bg-gray-900 p-2 rounded border border-gray-700">
                        <div class="flex-1 truncate pr-2">
                            <span class="text-white font-medium block truncate">${pkg.name}</span>
                            <span class="text-gray-400 text-xs block">₱${pkg.price.toFixed(2)} x ${qty}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="removeFromCart('${id}')" class="text-red-400 hover:bg-red-900 font-bold px-2 py-1 bg-gray-800 rounded transition">-</button>
                        </div>
                    </li>`;
            }

            document.getElementById('cart-count').textContent = count;
            document.getElementById('cart-total').textContent = total.toFixed(2);
        }

        init();
    </script>
</body>
</html>
