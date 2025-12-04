const API_URL = "http://127.0.0.1:8000/api";
let cart = [];
let token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user"));
let currentFilter = '';

document.addEventListener("DOMContentLoaded", () => {
    updateUserDisplay();
    // fetchProducts(); // No cargamos productos al inicio para que el Home brille
    updateCartCount();
    if(token) showSection('home');
});

// --- UI HELPERS ---
function showToast(msg, type='success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<i class="bi ${type=='success'?'bi-check-circle-fill text-success':'bi-exclamation-triangle-fill text-danger'} me-2"></i> <strong>${msg}</strong>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- CATALOGO ---
async function fetchProducts(typeFilter = '') {
    currentFilter = typeFilter;
    let url = `${API_URL}/products?`;
    if(currentFilter) url += `type=${currentFilter}`;
    
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-warning"></div></div>';

    try {
        const res = await fetch(url);
        const products = await res.json();
        
        if(products.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-muted mt-5"><i class="bi bi-emoji-frown fs-1"></i><p>No hay cervezas aquí.</p></div>';
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="product-card">
                    <div class="product-img-wrapper">
                        <span class="badge-type">${p.type}</span>
                        <img src="${p.image}" class="product-img">
                    </div>
                    <div class="p-3">
                        <h6 class="fw-bold mb-1">${p.name}</h6>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="text-warning fw-bold">$${p.price.toLocaleString()}</span>
                            <button class="btn btn-dark btn-sm rounded-circle" onclick='addToCart(${JSON.stringify(p)})'>
                                <i class="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join("");
    } catch(e) {
        showToast("Error de conexión", "error");
        grid.innerHTML = '<p class="text-center text-danger">Error conectando al servidor</p>';
    }
}

function applyFilterType(type) {
    fetchProducts(type);
}

// --- CARRITO ---
function addToCart(p) {
    cart.push(p);
    updateCartCount();
    showToast("Agregado al carrito");
}

function updateCartCount() {
    const badge = document.getElementById("badgeCount");
    badge.innerText = cart.length;
    badge.style.display = cart.length > 0 ? 'block' : 'none';
    
    const container = document.getElementById("cartItems");
    let total = 0;
    
    if(cart.length === 0) {
        container.innerHTML = '<div class="text-center py-5 opacity-50"><i class="bi bi-cart-x fs-1"></i><p>Carrito vacío</p></div>';
    } else {
        container.innerHTML = cart.map((p, i) => {
            total += p.price;
            return `
                <div class="card mb-2 border-0 shadow-sm">
                    <div class="card-body p-2 d-flex align-items-center">
                        <img src="${p.image}" class="rounded-3 me-3" style="width: 50px; height: 50px; object-fit: cover;">
                        <div class="flex-grow-1">
                            <h6 class="mb-0 small fw-bold">${p.name}</h6>
                            <small class="text-muted">$${p.price.toLocaleString()}</small>
                        </div>
                        <i class="bi bi-trash text-danger" style="cursor:pointer" onclick="removeFromCart(${i})"></i>
                    </div>
                </div>`;
        }).join("");
    }
    document.getElementById("cartTotal").innerText = "$" + total.toLocaleString();
}

function removeFromCart(i) { cart.splice(i,1); updateCartCount(); }

async function proceedToCheckout() {
    if(cart.length === 0) return showToast("Carrito vacío", "error");
    if(!token) {
        showToast("Inicia sesión primero", "error");
        showSection('auth');
        return;
    }

    const orderData = {
        user_email: user.email,
        total_amount: cart.reduce((s,p) => s+p.price, 0),
        items: cart.map(p => ({ product_id: p.id || p._id, name: p.name, price: p.price, quantity: 1 }))
    };

    try {
        const res = await fetch(`${API_URL}/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(orderData)
        });
        if(res.ok) {
            const d = await res.json();
            showToast("¡Pedido Exitoso!");
            cart = []; updateCartCount(); loadMyOrders(); showSection('orders');
        }
    } catch(e) { showToast("Error en el servidor", "error"); }
}

// --- AUTH & ORDERS ---
function toggleAuthMode() {
    const login = document.getElementById("loginBlock");
    const reg = document.getElementById("registerBlock");
    if(login.style.display === "none") {
        login.style.display = "block"; reg.style.display = "none";
    } else {
        login.style.display = "none"; reg.style.display = "block";
    }
}

async function handleLogin() {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass })
        });
        const d = await res.json();
        if(res.ok) {
            token = d.access_token; user = d.user;
            localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user));
            updateUserDisplay(); showToast(`Hola ${user.name}`); showSection('home');
        } else { showToast(d.detail, "error"); }
    } catch(e) { showToast("Error de conexión", "error"); }
}

async function handleRegister() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPass").value;
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password: pass })
        });
        if(res.ok) { showToast("Cuenta creada"); toggleAuthMode(); }
    } catch(e) {}
}

function handleLogout() {
    token = null; user = null; localStorage.clear();
    updateUserDisplay(); showSection('home'); showToast("Adiós");
}

async function loadMyOrders() {
    if(!token) {
        document.getElementById("ordersList").innerHTML = '<div class="text-center mt-5"><p>Debes iniciar sesión</p></div>';
        return;
    }
    const res = await fetch(`${API_URL}/orders/me`, { headers: { "Authorization": `Bearer ${token}` }});
    const data = await res.json();
    document.getElementById("ordersList").innerHTML = data.length ? data.map(o => `
        <div class="card border-0 shadow-sm p-3">
            <div class="d-flex justify-content-between">
                <span class="fw-bold">Pedido #${o.id.slice(-4)}</span>
                <span class="badge bg-success text-white">Pagado</span>
            </div>
            <hr class="my-2">
            <div class="d-flex justify-content-between">
                <span class="text-muted">${o.items.length} items</span>
                <span class="fw-bold text-dark">$${o.total_amount.toLocaleString()}</span>
            </div>
        </div>
    `).join("") : '<div class="text-center p-4 text-muted">No tienes pedidos</div>';
}

// --- ADMIN ---
async function createProduct() {
    const p = {
        name: document.getElementById("prodName").value,
        type: document.getElementById("prodType").value,
        price: parseInt(document.getElementById("prodPrice").value),
        description: document.getElementById("prodDesc").value,
        image: document.getElementById("prodImg").value,
        alcohol: 5.0
    };
    await fetch(`${API_URL}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    showToast("Producto Creado"); fetchProducts(); showSection('catalog');
}

// --- NAVIGATION ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-section').classList.add('active');
    
    document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));
    const nav = document.getElementById('nav-' + id);
    if(nav) nav.classList.add('active');

    if(id === 'catalog') fetchProducts();
    if(id === 'orders') loadMyOrders();
    window.scrollTo(0,0);
}

function updateUserDisplay() {
    const disp = document.getElementById("userDisplay");
    const out = document.getElementById("logoutBtn");
    if(user) { disp.innerText = user.name; out.classList.remove("d-none"); }
    else { disp.innerText = "Invitado"; out.classList.add("d-none"); }
}