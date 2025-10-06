// Datos de productos con URLs de imágenes reales
const products = [
    {
        id: 1,
        name: "IPA Artesanal",
        type: "IPA",
        price: 5500,
        description: "Cerveza IPA con intenso aroma a lúpulo y notas cítricas. Elaborada con maltas premium y lúpulos americanos.",
        image: "img/ipa-artesanal.jpg",
        alcohol: 6.5
    },
    {
        id: 2,
        name: "Stout Imperial",
        type: "Stout",
        price: 6200,
        description: "Stout robusta con notas de café tostado, chocolate negro y un final cremoso. Alta graduación alcohólica.",
        image: "img/stout-imperial.jpg",
        alcohol: 8.2
    },
    {
        id: 3,
        name: "Lager Premium",
        type: "Lager",
        price: 4800,
        description: "Lager suave y refrescante, perfecta para cualquier ocasión. Fermentación baja y sabor limpio.",
        image: "img/lager-premium.jpg",
        alcohol: 5.0
    },
    {
        id: 4,
        name: "Porter Achocolatada",
        type: "Porter",
        price: 5800,
        description: "Porter con fuertes notas de chocolate amargo y café. Cuerpo medio y final sedoso.",
        image: "img/porter-achocolatada.jpg",
        alcohol: 6.8
    },
    {
        id: 5,
        name: "Wheat Beer",
        type: "Wheat",
        price: 5200,
        description: "Cerveza de trigo con notas cítricas y especiadas. Refrescante con un característico turbio.",
        image: "img/wheat-beer.jpg",
        alcohol: 5.2
    },
    {
        id: 6,
        name: "Pale Ale",
        type: "Pale Ale",
        price: 5100,
        description: "Pale Ale equilibrada con aroma a lúpulo y maltas caramelizadas. Amargor medio y sabor complejo.",
        image: "img/pale-ale.jpg",
        alcohol: 5.5
    }
];

// Estado de la aplicación
let cart = [];
let currentPage = 1;
const productsPerPage = 6;
let filteredProducts = [...products];

// Usuarios de prueba para los escenarios Gherkin
const testUsers = {
    "cliente@craftbeer.cl": { 
        password: "Clave2025", 
        name: "Juan Pérez",
        loginAttempts: 0,
        blocked: false
    },
    "usuario@ejemplo.com": { 
        password: "Password123", 
        name: "María García",
        loginAttempts: 0,
        blocked: false
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    updateCart();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Navegación suave
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
            
            // Actualizar navegación activa
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Búsqueda con Enter
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// Mostrar sección específica
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Casos especiales
    if (sectionId === 'carrito') {
        toggleCart();
    }
}

// Cargar productos en el grid
function loadProducts() {
    const grid = document.getElementById('productsGrid');
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);

    grid.innerHTML = paginatedProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDMwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPuKfqCDin6gg4p+oPC90ZXh0Pgo8L3N2Zz4K'">
            <div class="product-content">
                <h3 class="product-title">${product.name}</h3>
                <span class="product-type">${product.type} • ${product.alcohol}% alcohol</span>
                <p>${product.description}</p>
                <div class="product-price">$${product.price.toLocaleString()} CLP</div>
                <button class="btn btn-primary" onclick="addToCart(${product.id})" style="width: 100%; margin-top: 10px;">
                    Añadir al Carrito
                </button>
            </div>
        </div>
    `).join('');

    updatePagination();
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    // Deshabilitar botones cuando sea necesario
    document.querySelector('.pagination-btn:first-child').disabled = currentPage === 1;
    document.querySelector('.pagination-btn:last-child').disabled = currentPage === totalPages;
}

// Cambiar página
function changePage(direction) {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    currentPage += direction;
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    loadProducts();
    window.scrollTo({ top: document.getElementById('catalogo').offsetTop - 100, behavior: 'smooth' });
}

// Manejar búsqueda
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (searchTerm.length < 3 && searchTerm.length > 0) {
        alert('Por favor ingresa al menos 3 caracteres para buscar');
        return;
    }
    
    filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.type.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    
    currentPage = 1;
    loadProducts();
    
    // Mostrar mensaje de resultados
    if (searchTerm && filteredProducts.length === 0) {
        document.getElementById('productsGrid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>No se encontraron productos</h3>
                <p>No hay resultados para "${searchTerm}". Intenta con otros términos.</p>
                <button class="btn btn-secondary" onclick="clearSearch()">Limpiar Búsqueda</button>
            </div>
        `;
    }
}

// Limpiar búsqueda
function clearSearch() {
    document.getElementById('searchInput').value = '';
    filteredProducts = [...products];
    currentPage = 1;
    loadProducts();
}

// Aplicar filtros
function applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    
    filteredProducts = products.filter(product => {
        const typeMatch = !typeFilter || product.type === typeFilter;
        const priceMatch = !priceFilter || product.price <= parseInt(priceFilter);
        return typeMatch && priceMatch;
    });
    
    currentPage = 1;
    loadProducts();
}

// Limpiar filtros
function clearFilters() {
    document.getElementById('typeFilter').value = '';
    document.getElementById('priceFilter').value = '';
    filteredProducts = [...products];
    currentPage = 1;
    loadProducts();
}

// ===== CARRITO =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    cart.push(product);
    updateCart();
    
    // Mostrar feedback
    showMessage(`✅ ${product.name} añadido al carrito`, 'success');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    // Actualizar contador
    const cartCount = document.getElementById('cartCount');
    cartCount.textContent = cart.length;
    document.querySelector('.cart-link').setAttribute('data-count', cart.length);
    
    // Actualizar contenido del carrito
    const cartContent = document.getElementById('cartContent');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartContent.innerHTML = '<p style="text-align: center; color: #666;">Tu carrito está vacío</p>';
        cartTotal.textContent = '0';
    } else {
        cartContent.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPuKfqDwvdGV4dD4KPC9N2Zz4K'">
                <div style="flex: 1;">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toLocaleString()} CLP</p>
                </div>
                <button onclick="removeFromCart(${index})" style="background: none; border: none; cursor: pointer; color: #d32f2f;">🗑️</button>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotal.textContent = total.toLocaleString();
    }
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showMessage('Tu carrito está vacío', 'error');
        return;
    }
    
    // Verificar si el usuario está logueado
    if (!localStorage.getItem('currentUser')) {
        showSection('cuenta');
        showAuthTab('login');
        showMessage('Por favor inicia sesión para continuar con la compra', 'error');
        toggleCart();
        return;
    }
    
    // Simular proceso de pago
    showMessage('🚀 Redirigiendo a Webpay...', 'success');
    setTimeout(() => {
        alert(`✅ Compra exitosa! Se ha generado tu boleta por $${document.getElementById('cartTotal').textContent} CLP`);
        cart = [];
        updateCart();
        toggleCart();
    }, 2000);
}

// ===== AUTENTICACIÓN =====
function showAuthTab(event, tabName) {
    // Ocultar todos los formularios
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Remover active de todas las pestañas
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar formulario seleccionado
    document.getElementById(tabName + 'Form').classList.add('active');
    event.target.classList.add('active');
}

// Escenario Gherkin: Login exitoso y fallido
function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');
    
    // Validar campos
    if (!email || !password) {
        showMessage('Por favor completa todos los campos', 'error', messageDiv);
        return;
    }
    
    // Verificar si el usuario existe
    const user = testUsers[email];
    
    if (!user) {
        // Escenario: Usuario no existe
        showMessage('❌ El usuario no existe', 'error', messageDiv);
        return;
    }
    
    if (user.blocked) {
        // Escenario: Cuenta bloqueada
        showMessage('🚫 Cuenta temporalmente bloqueada. Intenta nuevamente en 15 minutos.', 'error', messageDiv);
        return;
    }
    
    if (user.password === password) {
        // Escenario: Login exitoso
        user.loginAttempts = 0; // Resetear intentos
        localStorage.setItem('currentUser', JSON.stringify({ email, name: user.name }));
        showMessage('✅ ¡Inicio de sesión exitoso! Redirigiendo...', 'success', messageDiv);
        
        setTimeout(() => {
            showSection('catalogo');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[href="#catalogo"]').classList.add('active');
            updateAuthUI();
        }, 1500);
    } else {
        // Escenario: Contraseña incorrecta
        user.loginAttempts++;
        
        if (user.loginAttempts >= 3) {
            user.blocked = true;
            showMessage('🚫 Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.', 'error', messageDiv);
        } else {
            showMessage(`❌ Contraseña incorrecta. Te quedan ${3 - user.loginAttempts} intentos.`, 'error', messageDiv);
        }
    }
}

// Escenario Gherkin: Registro exitoso y con errores
function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const messageDiv = document.getElementById('registerMessage');
    
    // Validaciones
    if (!name || !email || !password) {
        showMessage('Por favor completa todos los campos', 'error', messageDiv);
        return;
    }
    
    if (password.length < 8) {
        showMessage('La contraseña debe tener al menos 8 caracteres', 'error', messageDiv);
        return;
    }
    
    if (testUsers[email]) {
        // Escenario: Email ya registrado
        showMessage('❌ Este email ya está registrado', 'error', messageDiv);
        return;
    }
    
    // Escenario: Registro exitoso
    testUsers[email] = { password, name, loginAttempts: 0, blocked: false };
    showMessage('✅ ¡Registro exitoso! Ahora puedes iniciar sesión.', 'success', messageDiv);
    
    // Limpiar formulario
    document.getElementById('registerForm').reset();
    
    // Cambiar a pestaña de login
    setTimeout(() => showAuthTab('login'), 2000);
}

// Escenario Gherkin: Recuperación de contraseña
function handleRecovery() {
    const email = document.getElementById('recoverEmail').value;
    const messageDiv = document.getElementById('recoverMessage');
    
    if (!email) {
        showMessage('Por favor ingresa tu email', 'error', messageDiv);
        return;
    }
    
    if (!testUsers[email]) {
        // Escenario: Email no registrado
        showMessage('❌ No existe una cuenta con este email', 'error', messageDiv);
        return;
    }
    
    // Escenario: Email de recuperación enviado
    showMessage('📧 ¡Enlace de recuperación enviado! Revisa tu bandeja de entrada.', 'success', messageDiv);
    
    // Simular envío de email
    setTimeout(() => {
        alert(`🔐 Token de recuperación para ${email}: RCVR-${Date.now().toString().slice(-6)} (Válido por 15 minutos)`);
    }, 1000);
}

function updateAuthUI() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        document.querySelector('.user-actions').innerHTML = `
            <span>Hola, ${currentUser.name}</span>
            <button class="btn btn-secondary" onclick="logout()">Cerrar Sesión</button>
        `;
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

// Utilidad para mostrar mensajes
function showMessage(text, type, element = null) {
    const target = element || document.activeElement.closest('form').querySelector('.message');
    target.textContent = text;
    target.className = `message ${type}`;
    target.style.display = 'block';
    
    setTimeout(() => {
        target.style.display = 'none';
    }, 5000);
}

// Verificar autenticación al cargar
if (localStorage.getItem('currentUser')) {
    updateAuthUI();
}