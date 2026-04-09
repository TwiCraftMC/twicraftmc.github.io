<?php
session_start();

// --- CONFIGURATION ---
// Change "127.0.0.1" to your Minecraft server IP and "25894" to your webhook port.
$API_URL = "http://170.23.61.130:25894/api/store"; 
// ---------------------

// Handle Logout
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: index.php");
    exit;
}

// Handle Login (Username & Account Type)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $_SESSION['username'] = htmlspecialchars($_POST['username']);
    $_SESSION['account_type'] = htmlspecialchars($_POST['account_type']);
    $_SESSION['cart'] = [];
    header("Location: index.php");
    exit;
}

// Handle Cart Actions
if (isset($_SESSION['username'])) {
    $active_cat_param = isset($_GET['category']) ? "&category=" . urlencode($_GET['category']) : "";
    
    if (isset($_GET['add'])) {
        $pkg = $_GET['add'];
        if (!isset($_SESSION['cart'][$pkg])) $_SESSION['cart'][$pkg] = 0;
        $_SESSION['cart'][$pkg]++;
        header("Location: index.php?" . ltrim($active_cat_param, '&'));
        exit;
    }
    if (isset($_GET['remove'])) {
        $pkg = $_GET['remove'];
        if (isset($_SESSION['cart'][$pkg])) {
            $_SESSION['cart'][$pkg]--;
            if ($_SESSION['cart'][$pkg] <= 0) unset($_SESSION['cart'][$pkg]);
        }
        header("Location: index.php?" . ltrim($active_cat_param, '&'));
        exit;
    }
    if (isset($_GET['clear'])) {
        $_SESSION['cart'] = [];
        header("Location: index.php?" . ltrim($active_cat_param, '&'));
        exit;
    }
}

// Fetch Live Data from TCBilling Java Plugin
$data = ['categories' => [], 'packages' => []];
$json_data = @file_get_contents($API_URL);
if ($json_data) {
    $data = json_decode($json_data, true);
}

// Determine Active Category (Fallback to the first one available)
$categories = $data['categories'] ?? [];
$packages = $data['packages'] ?? [];
$active_category = $_GET['category'] ?? (count($categories) > 0 ? array_key_first($categories) : null);

// Calculate Cart Total
$cart_total = 0;
$cart_count = 0;
if (isset($_SESSION['cart'])) {
    foreach ($_SESSION['cart'] as $pkg_id => $qty) {
        $cart_total += ($packages[$pkg_id]['price'] ?? 0) * $qty;
        $cart_count += $qty;
    }
}
?>
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
    </style>
</head>
<body class="font-sans antialiased min-h-screen flex flex-col">
    <nav class="bg-gray-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center">
                    <span class="font-bold text-xl text-blue-400 tracking-wider">TwiCraftMC Store</span>
                </div>
                <div>
                    <?php if(isset($_SESSION['username'])): ?>
                        <span class="text-sm text-gray-300 mr-4 hidden sm:inline">Playing as <strong><?= $_SESSION['username'] ?></strong> (<?= $_SESSION['account_type'] ?>)</span>
                        <a href="?logout=1" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition">Logout</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <?php if(!isset($_SESSION['username'])): ?>
            <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl mt-12 border border-gray-700">
                <h2 class="text-2xl font-bold mb-6 text-center text-white">Enter your Details</h2>
                <form method="POST" action="index.php">
                    <div class="mb-4">
                        <label class="block text-gray-300 text-sm font-bold mb-2">Minecraft Username</label>
                        <input type="text" name="username" required class="shadow appearance-none border border-gray-600 rounded w-full py-3 px-4 bg-gray-900 text-white leading-tight focus:outline-none focus:border-blue-500" placeholder="e.g. Notch">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-300 text-sm font-bold mb-2">Account Type</label>
                        <select name="account_type" class="shadow border border-gray-600 rounded w-full py-3 px-4 bg-gray-900 text-white leading-tight focus:outline-none focus:border-blue-500">
                            <option value="Premium">Premium</option>
                            <option value="Cracked">Cracked</option>
                        </select>
                    </div>
                    <button type="submit" name="login" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150">
                        Continue to Store
                    </button>
                </form>
            </div>
        <?php else: ?>
            <div class="flex flex-col md:flex-row gap-6">
                
                <div class="w-full md:w-1/4">
                    <div class="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
                        <div class="bg-gray-900 px-4 py-3 border-b border-gray-700">
                            <h3 class="text-lg font-semibold text-white uppercase tracking-wide">Categories</h3>
                        </div>
                        <ul class="divide-y divide-gray-700">
                            <?php foreach($categories as $id => $name): ?>
                                <li>
                                    <a href="?category=<?= urlencode($id) ?>" class="block px-4 py-3 hover:bg-gray-700 transition <?= $active_category == $id ? 'nav-link active' : 'text-gray-300' ?>">
                                        <?= htmlspecialchars($name) ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                            <?php if(empty($categories)): ?>
                                <li class="px-4 py-3 text-gray-500 text-sm">No categories found.</li>
                            <?php endif; ?>
                        </ul>
                    </div>
                </div>

                <div class="w-full md:w-1/2">
                    <?php if(!$json_data): ?>
                        <div class="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4 shadow-md">
                            <strong>Offline:</strong> Unable to connect to the TCBilling API. Please ensure the Minecraft server is running.
                        </div>
                    <?php endif; ?>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <?php 
                        $has_packages = false;
                        foreach($packages as $pkg_id => $pkg): 
                            // Matches the category ID directly from the config
                            if((string)$pkg['category'] === (string)$active_category):
                                $has_packages = true;
                        ?>
                            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 flex flex-col hover:border-gray-500 transition">
                                <div class="p-5 flex-grow">
                                    <h4 class="text-xl font-bold text-white mb-1"><?= htmlspecialchars($pkg['name']) ?></h4>
                                    <p class="text-blue-400 font-semibold text-lg mb-4">₱<?= number_format($pkg['price'], 2) ?></p>
                                </div>
                                <div class="bg-gray-900 p-4 mt-auto">
                                    <a href="?add=<?= urlencode($pkg_id) ?>&category=<?= urlencode($active_category) ?>" class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition">
                                        Add to Cart
                                    </a>
                                </div>
                            </div>
                        <?php 
                            endif;
                        endforeach; 
                        
                        if(!$has_packages && $json_data): ?>
                            <div class="col-span-full text-center text-gray-400 py-12 bg-gray-800 rounded-lg border border-gray-700 shadow-inner">
                                No packages available in this category.
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="w-full md:w-1/4">
                    <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 sticky top-4">
                        <div class="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                            <h3 class="text-lg font-semibold text-white uppercase tracking-wide">Your Cart</h3>
                            <span class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full"><?= $cart_count ?></span>
                        </div>
                        <div class="p-4">
                            <?php if(empty($_SESSION['cart'])): ?>
                                <p class="text-gray-500 text-center text-sm py-4">Your cart is empty.</p>
                            <?php else: ?>
                                <ul class="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                                    <?php foreach($_SESSION['cart'] as $pkg_id => $qty): ?>
                                        <li class="flex justify-between items-center text-sm bg-gray-900 p-2 rounded border border-gray-700">
                                            <div class="flex-1 truncate pr-2">
                                                <span class="text-white font-medium block truncate"><?= htmlspecialchars($packages[$pkg_id]['name'] ?? 'Unknown') ?></span>
                                                <span class="text-gray-400 text-xs block">₱<?= number_format($packages[$pkg_id]['price'] ?? 0, 2) ?> x <?= $qty ?></span>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <a href="?remove=<?= urlencode($pkg_id) ?>&category=<?= urlencode($active_category) ?>" class="text-red-400 hover:bg-red-900 font-bold px-2 py-1 bg-gray-800 rounded transition">-</a>
                                            </div>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                                <div class="border-t border-gray-700 pt-4 mb-4">
                                    <div class="flex justify-between items-center text-lg font-bold text-white">
                                        <span>Total:</span>
                                        <span class="text-green-400">₱<?= number_format($cart_total, 2) ?></span>
                                    </div>
                                </div>
                                <button onclick="alert('Checkout integration is handled in-game! Login to TwiCraftMC and type /buy to view your cart and scan the GCash QR code.')" class="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-2 transition shadow">
                                    Checkout Now
                                </button>
                                <a href="?clear=1&category=<?= urlencode($active_category) ?>" class="block w-full text-center bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded transition">
                                    Clear Cart
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

            </div>
        <?php endif; ?>
    </div>
    
    <footer class="bg-gray-900 py-6 text-center text-sm text-gray-500 mt-auto border-t border-gray-800">
        <p>&copy; 2026 TwiCraftMC Store. Not affiliated with Mojang AB.</p>
    </footer>
</body>
</html>
