// js/app.js - VERSIÓN FINAL CONECTADA AL BACKEND

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Estado de la aplicación
let cart = [];
let products = []; // Se llenará desde el backend
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 6;

// Estado de usuario (Persistencia básica)
let currentToken = localStorage.getItem('accessToken') || null;
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

// ==========================================
// 1. FUNCIONES DE AYUDA PARA API
// ==========================================

async function apiRequest(endpoint, method = 'GET', body = null, requireAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    
    if (requireAuth && currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data: data };
    } catch (error) {
        console.error("Error de red:", error);
        return { ok: false, status: 500, data: { detail: "Error de conexión con el servidor" } };
    }
}

function showMessage(text, type) {
    // Busca el div de mensaje activo o crea uno flotante si no hay formulario
    let target = document.querySelector('.auth-form.active .message');
    
    if (!target) {
        alert(text); // Fallback simple
        return;
    }
    
    target.textContent = text;
    target.className = `message ${type}`;
    target.style.display = 'block';
    setTimeout(() => target.style.display = 'none', 5000);
}

// ==========================================
// 2. LÓGICA DE PRODUCTOS (CATÁLOGO)
// ==========================================

async function fetchProducts(queryParams = '') {
    const result = await apiRequest(`/products${queryParams}`, 'GET');
    
    if (result.ok) {
        products = result.data;
        filteredProducts = products; // Inicialmente son iguales
        currentPage = 1;
        renderProducts();
    } else {
        document.getElementById('productsGrid').innerHTML = 
            '<p style="text-align:center; grid-column: 1/-1; color: red">Error cargando productos. ¿El backend está encendido?</p>';
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const paginated = filteredProducts.slice(start, end);

    if (paginated.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No se encontraron productos.</p>';
        return;
    }

    grid.innerHTML = paginated.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x250?text=Cerveza'">
            <div class="product-content">
                <h3 class="product-title">${p.name}</h3>
                <span class="product-type">${p.type} • ${p.alcohol}%</span>
                <p>${p.description}</p>
                <div class="product-price">$${p.price.toLocaleString()} CLP</div>
                <button class="btn btn-primary" onclick="addToCart('${p.id}')" style="width: 100%; margin-top: 10px;">
                    Añadir al Carrito
                </button>
            </div>
        </div>
    `).join('');

    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = Math.ceil(filteredProducts.length / productsPerPage);
}

// Filtros y Búsqueda
function handleSearch() {
    const term = document.getElementById('searchInput').value;
    fetchProducts(`?search=${term}`);
}

function applyFilters() {
    const type = document.getElementById('typeFilter').value;
    const price = document.getElementById('priceFilter').value;
    let query = '?';
    if (type) query += `type=${type}&`;
    if (price) query += `max_price=${price}`;
    fetchProducts(query);
}

function changePage(dir) {
    const max = Math.ceil(filteredProducts.length / productsPerPage);
    currentPage += dir;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > max) currentPage = max;
    renderProducts();
}

// ==========================================
// 3. LÓGICA DE AUTENTICACIÓN
// ==========================================

async function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if(!name || !email || !password) return showMessage("Completa los campos", "error");

    const result = await apiRequest('/auth/register', 'POST', { name, email, password });

    if (result.ok) {
        showMessage("¡Registro exitoso! Ahora inicia sesión.", "success");
        setTimeout(() => showAuthTab(null, 'login'), 1500);
    } else {
        showMessage(`Error: ${result.data.detail}`, "error");
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if(!email || !password) return showMessage("Completa los campos", "error");

    const result = await apiRequest('/auth/login', 'POST', { email, password });

    if (result.ok) {
        currentToken = result.data.access_token;
        currentUser = result.data.user;
        localStorage.setItem('accessToken', currentToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showMessage("¡Bienvenido!", "success");
        updateAuthUI();
        setTimeout(() => showSection('catalogo'), 1000);
    } else {
        showMessage(result.data.detail, "error");
    }
}

function handleLogout() {
    currentToken = null;
    currentUser = null;
    localStorage.clear();
    location.reload();
}

function updateAuthUI() {
    const navLink = document.querySelector('a[href="#cuenta"]');
    if (currentUser) {
        navLink.textContent = `Hola, ${currentUser.name.split(' ')[0]}`;
        // Agregar botón de logout en la sección de cuenta si es necesario
    } else {
        navLink.textContent = "Mi Cuenta";
    }
}

// ==========================================
// 4. CARRITO Y CHECKOUT (CONECTADO)
// ==========================================

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if(product) {
        cart.push(product);
        updateCartUI();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cartCount').textContent = cart.length;
    
    const container = document.getElementById('cartContent');
    const totalElem = document.getElementById('cartTotal');
    
    if(cart.length === 0) {
        container.innerHTML = '<p class="text-center">Carrito vacío</p>';
        totalElem.textContent = '0';
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <div>
                <strong>${item.name}</strong><br>
                <small>$${item.price.toLocaleString()}</small>
            </div>
            <button onclick="removeFromCart(${index})" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + i.price, 0);
    totalElem.textContent = total.toLocaleString();
}

async function proceedToCheckout() {
    if(cart.length === 0) return alert("El carrito está vacío");
    
    if(!currentToken) {
        alert("Debes iniciar sesión para comprar.");
        showSection('cuenta');
        return;
    }

    const orderPayload = {
        user_email: currentUser.email,
        total_amount: cart.reduce((sum, i) => sum + i.price, 0),
        items: cart.map(i => ({
            product_id: i.id,
            name: i.name,
            price: i.price,
            quantity: 1
        }))
    };

    alert("🚀 Enviando pedido al servidor...");

    const result = await apiRequest('/checkout', 'POST', orderPayload, true);

    if (result.ok) {
        alert(`✅ ¡ÉXITO!\nID Pedido: ${result.data.order_id}\nGuardado en base de datos 'orders'.`);
        cart = [];
        updateCartUI();
        toggleCart(); // Cerrar carrito
    } else {
        alert(`❌ Error: ${result.data.detail}`);
    }
}

// ==========================================
// 5. UI Y EVENTOS GLOBALES
// ==========================================

function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    const active = document.getElementById(id);
    if(active) active.style.display = 'block';
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
}

// Tab handling for Auth
window.showAuthTab = function(e, tabName) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(tabName + 'Form').classList.add('active');
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    if(e) e.target.classList.add('active');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateAuthUI();
    
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if(link.classList.contains('cart-link')) return;
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            showSection(target);
        });
    });
});