const API_URL = "http://127.0.0.1:8000/api";
let cart = [];
let token = localStorage.getItem("token");
let user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

let allProducts = [];
let filteredList = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

document.addEventListener("DOMContentLoaded", () => {
    updateUserDisplay(); 
    fetchProducts();
    updateCartCount();
    if(token) showSection('home');
});

// --- HISTORIAL DE PEDIDOS (ESTA ES LA PARTE QUE FALLABA) ---
async function loadMyOrders() {
    const list = document.getElementById("ordersList");
    if(!list) return;

    // Validar login
    if(!token) { 
        list.innerHTML='<div class="text-center mt-5 text-muted"><i class="bi bi-lock fs-1"></i><p>Inicia sesión para ver tus compras</p></div>'; 
        return; 
    }
    
    try {
        const res = await fetch(`${API_URL}/orders/me`, {headers:{"Authorization":`Bearer ${token}`}});
        const data = await res.json();
        
        if(data.length === 0) {
            list.innerHTML = '<div class="text-center p-5 text-muted"><p>Aún no has realizado compras.</p></div>';
            return;
        }

        list.innerHTML = data.map(o => {
            // Crear lista HTML de items dentro de la orden
            let itemsHtml = "";
            if(o.items && o.items.length > 0) {
                itemsHtml = o.items.map(i => `
                    <div class="d-flex justify-content-between small border-bottom py-2">
                        <span>${i.quantity}x ${i.name}</span>
                        <span class="fw-bold">$${i.price.toLocaleString()}</span>
                    </div>
                `).join('');
            }

            return `
            <div class="card border-0 shadow-sm p-3 mb-3 bg-white rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-dark">Orden #${o.id.slice(-4)}</span>
                    <span class="badge bg-success bg-opacity-25 text-success">PAGADO</span>
                </div>
                
                <div class="small text-muted mb-3">
                    <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${o.address || 'Retiro en Tienda'}
                </div>
                
                <div class="bg-light p-3 rounded-3 mb-3">
                    ${itemsHtml}
                </div>
                
                <div class="d-flex justify-content-between fw-bold fs-5 text-dark">
                    <span>Total</span>
                    <span>$${o.total_amount.toLocaleString()}</span>
                </div>
            </div>`;
        }).join("");

    } catch(e) {
        console.error(e);
        list.innerHTML = '<p class="text-danger text-center">Error cargando historial.</p>';
    }
}

// --- UI UPDATES (NOMBRE EN ESQUINA) ---
function updateUserDisplay() {
    const d = document.getElementById("userDisplay");
    const mName = document.getElementById("menuUserName");
    const mEmail = document.getElementById("menuUserEmail");
    
    if(user) { 
        if(d) d.innerText = user.name; 
        if(mName) mName.innerText = user.name; 
        if(mEmail) mEmail.innerText = user.email; 
    } else { 
        if(d) d.innerText = "Invitado"; 
        if(mName) mName.innerText = "Invitado"; 
        if(mEmail) mEmail.innerText = "Inicia sesión"; 
    }
}

// --- LOGIN ---
async function handleLogin() {
    const e = document.getElementById("loginEmail").value;
    const p = document.getElementById("loginPass").value;
    if(!e || !p) return showToast("Faltan datos", "error");

    try {
        const res = await fetch(`${API_URL}/auth/login`, { 
            method:"POST", headers:{"Content-Type":"application/json"}, 
            body:JSON.stringify({email:e, password:p})
        });
        const d = await res.json();

        if(res.ok) { 
            token=d.access_token; user=d.user; 
            localStorage.setItem("token",token); localStorage.setItem("user",JSON.stringify(user)); 
            updateUserDisplay(); // Actualizar nombre
            
            if(user.email === "admin@craft.cl") {
                showToast(`👑 ¡Bienvenido Jefe!`, "success");
                showSection('admin');
            } else {
                showToast(`¡Hola ${user.name}!`, "success"); 
                showSection('home'); 
            }
        } else showToast(d.detail || "Error login", "error");
    } catch(e) { showToast("Error conexión", "error"); }
}

// --- CHECKOUT ---
async function proceedToCheckout() {
    if(cart.length===0) return showToast("Carrito vacío", "error");
    if(!token) { showToast("Inicia sesión", "error"); showSection('auth'); return; }
    
    const addr = document.getElementById("deliveryAddress").value || "Retiro en tienda";
    const overlay = document.getElementById("paymentOverlay");
    overlay.style.display = "flex";

    setTimeout(async () => {
        const orderData = { 
            user_email: user.email, 
            address: addr,
            total_amount: cart.reduce((s,p)=>s+p.price,0), 
            items: cart.map(p=>({product_id: p.id||p._id, name:p.name, price:p.price, quantity:1})) 
        };
        try {
            const res = await fetch(`${API_URL}/checkout`, { 
                method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${token}`}, 
                body:JSON.stringify(orderData)
            });
            overlay.style.display = "none";
            if(res.ok) { 
                showToast("¡Pago Aprobado!"); 
                cart=[]; updateCartCount(); loadMyOrders(); showSection('orders'); 
            } else showToast("Error pago", "error");
        } catch(e){ overlay.style.display="none"; showToast("Error", "error"); }
    }, 2000);
}

// --- HELPER ESTRELLAS ---
function getStarsHTML(rating) {
    let stars = '';
    for(let i=1; i<=5; i++) {
        stars += i <= Math.round(rating) ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>';
    }
    return stars;
}

function showToast(msg, type='success') {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<i class="bi ${type=='success'?'bi-check-circle-fill text-success':'bi-exclamation-triangle-fill text-danger'} fs-5"></i> <strong>${msg}</strong>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- CATALOGO ---
async function fetchProducts(typeFilter = '') {
    const grid = document.getElementById("productsGrid");
    if(!grid) return;
    let url = `${API_URL}/products?`;
    if(typeFilter) url += `type=${typeFilter}`;
    try {
        const res = await fetch(url);
        allProducts = await res.json();
        filteredList = allProducts;
        currentPage = 1;
        renderPaginated();
    } catch(e) {}
}

function renderPaginated() {
    const grid = document.getElementById("productsGrid");
    const controls = document.getElementById("paginationControls");
    if(!grid) return;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filteredList.slice(start, end);
    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

    if(pageItems.length === 0) { grid.innerHTML = '<p class="text-center text-muted">Sin productos</p>'; controls.innerHTML=''; return; }

    grid.innerHTML = pageItems.map(p => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="product-card">
                <div class="product-img-wrap">
                    <span class="badge-type">${p.type}</span>
                    <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/400'">
                </div>
                <div class="p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div><h5 class="fw-bold mb-1">${p.name}</h5><div class="small">${getStarsHTML(p.rating||5)} <span class="text-muted">(${p.reviews||0})</span></div></div>
                        <span class="fs-5 fw-bold text-dark">$${p.price.toLocaleString()}</span>
                    </div>
                    <p class="text-muted small mb-3 mt-2">${p.description.substring(0,50)}...</p>
                    <button class="btn btn-dark w-100 rounded-pill py-2" onclick='addToCart(${JSON.stringify(p)})'>Agregar <i class="bi bi-cart-plus"></i></button>
                </div>
            </div>
        </div>
    `).join("");
    
    if(totalPages > 1) {
        controls.innerHTML = `<button class="page-btn" onclick="changePage(-1)" ${currentPage===1?'disabled':''}><</button><span class="mx-2">${currentPage}/${totalPages}</span><button class="page-btn" onclick="changePage(1)" ${currentPage===totalPages?'disabled':''}>></button>`;
    } else controls.innerHTML='';
}

function changePage(d) { currentPage+=d; renderPaginated(); window.scrollTo(0,0); }
function applyFilterType(t) { fetchProducts(t); }
function handleSearch() { fetchProducts(); }

// CARRITO
function addToCart(p) { cart.push(p); updateCartCount(); showToast("Añadido"); }
function updateCartCount() {
    const b = document.getElementById("badgeCount");
    if(b) { b.innerText = cart.length; b.style.display = cart.length>0?'block':'none'; }
    const c = document.getElementById("cartItems");
    let total=0;
    if(c) {
        if(cart.length===0) c.innerHTML='<div class="text-center py-5 opacity-50"><i class="bi bi-cart-x fs-1"></i><p>Vacío</p></div>';
        else c.innerHTML = cart.map((p,i)=>{ total+=p.price; return `<div class="card mb-2 p-2 shadow-sm d-flex justify-content-between align-items-center"><div class="d-flex align-items-center gap-3"><img src="${p.image}" class="rounded" style="width:40px;height:40px;object-fit:cover"><div><div class="fw-bold small">${p.name}</div><div class="text-muted small">$${p.price.toLocaleString()}</div></div></div><i class="bi bi-trash text-danger" onclick="removeFromCart(${i})" style="cursor:pointer"></i></div>`}).join("");
    }
    const t = document.getElementById("cartTotal");
    if(t) t.innerText = "$"+total.toLocaleString();
}
function removeFromCart(i) { cart.splice(i,1); updateCartCount(); }

// ADMIN & EXTRAS
async function loadAdminList() {
    const l = document.getElementById("adminProductList");
    if(!l) return;
    const res = await fetch(`${API_URL}/products`);
    const prods = await res.json();
    l.innerHTML = prods.map(p=>`<div class="card p-2 border-0 shadow-sm mb-2 d-flex flex-row justify-content-between align-items-center"><div class="d-flex align-items-center gap-2"><img src="${p.image}" style="width:30px;height:30px;object-fit:cover" class="rounded"><span class="small fw-bold">${p.name}</span></div><button class="btn btn-sm btn-outline-danger py-0" onclick="deleteProduct('${p.id||p._id}')">x</button></div>`).join("");
}
async function createProduct() {
    const p = { name:document.getElementById("prodName").value, type:document.getElementById("prodType").value, price:parseInt(document.getElementById("prodPrice").value), description:document.getElementById("prodDesc").value, image:document.getElementById("prodImg").value, alcohol:5.0 };
    await fetch(`${API_URL}/products`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p)});
    showToast("Creado"); fetchProducts(); loadAdminList(); showSection('catalog');
}
async function deleteProduct(id) { if(confirm("¿Borrar?")) { await fetch(`${API_URL}/products/${id}`, {method:"DELETE"}); showToast("Borrado"); loadAdminList(); fetchProducts(); } }

function toggleAuthMode() { const l=document.getElementById("loginBlock"), r=document.getElementById("registerBlock"); l.style.display=l.style.display==="none"?"block":"none"; r.style.display=r.style.display==="none"?"block":"none"; }
async function handleRegister() { const n=document.getElementById("regName").value, e=document.getElementById("regEmail").value, p=document.getElementById("regPass").value; const res = await fetch(`${API_URL}/auth/register`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:n, email:e, password:p})}); if(res.ok) { showToast("Creado"); toggleAuthMode(); } else showToast("Error", "error"); }
function handleLogout() { token=null; user=null; localStorage.clear(); updateUserDisplay(); showSection('home'); showToast("Adiós"); }
function closeMenu() { const el=document.getElementById('sideMenu'); const bs=bootstrap.Offcanvas.getInstance(el); if(bs) bs.hide(); }
function showSection(id) { document.querySelectorAll('.section').forEach(s => s.classList.remove('active')); document.getElementById(id+'-section').classList.add('active'); document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active')); const n = document.getElementById('nav-'+id); if(n) n.classList.add('active'); if(id==='catalog') fetchProducts(); if(id==='orders') loadMyOrders(); if(id==='admin') loadAdminList(); window.scrollTo(0,0); }