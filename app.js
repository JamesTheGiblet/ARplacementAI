import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// ============================================
// JamesTheGiblet - ARplacementAI v2.0
// Enterprise AR Product Placement Platform
// Built by James - "I build what I want"
// ============================================

class ARplacementAI {
    constructor() {
        // Core Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.reticle = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        
        // Product Management
        this.products = [];
        this.activeProducts = new Map();
        this.productLabels = new Map();
        this.gltfLoader = null;
        this.dracoLoader = null;
        
        // Analytics & Tracking
        this.analytics = {
            placements: 0,
            impressions: {},
            interactions: {},
            conversions: {},
            sessionStart: Date.now(),
            gazeTracking: {},
            heatmapData: []
        };
        
        // AI & Context
        this.conversationContext = [];
        this.userPreferences = this.loadUserPreferences();
        this.conversationHistory = [];
        this.aiEngine = new EnhancedContextualAI();
        this.recommendationEngine = new RecommendationEngine();
        
        // APIs & Services
        this.brandAPI = new BrandAPI();
        this.paymentProcessor = new PaymentProcessor();
        this.inventoryAPI = new InventoryAPI();
        this.userProfile = null;
        
        // UI State
        this.isSessionActive = false;
        this.currentViewMode = 'ar'; // 'ar', 'catalog', 'cart'
        this.cart = [];
        this.wishlist = [];
        
        // Performance
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 0;
        
        // Initialize
        this.productCatalog = [];
        this.initLoaders();
    }
    
    initLoaders() {
        // GLTF Loader with Draco compression
        this.gltfLoader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/libs/draco/');
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
    
    async init() {
        try {
            // Load session first to populate user data
            await this.loadUserSession();
            
            // Setup UI immediately so we have a loading screen
            this.setupUI();

        // Check for WebXR support
        const webxrSupported = await this.checkWebXRSupport();
        const startBtn = document.getElementById('startAR');

        if (webxrSupported) {
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-camera"></i> Start AR Experience';
            }
        } else if (startBtn) {
                startBtn.disabled = true;
                startBtn.innerHTML = '<i class="fas fa-ban"></i> AR Not Supported';
                startBtn.style.background = '#555';
                startBtn.style.cursor = 'not-allowed';
        }

        await this.fetchProductCatalog();
        this.setupEventListeners();

        // Initialize brand API with demo data
        await this.brandAPI.initialize({
            apiKey: 'demo_key_' + Date.now(),
            userId: this.userProfile?.id || 'guest_' + Math.random().toString(36).substring(2, 11)
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }
    
async checkWebXRSupport() {
    if ('xr' in navigator && typeof navigator.xr.isSessionSupported === 'function') {
        try {
            return await navigator.xr.isSessionSupported('immersive-ar');
        } catch (e) {
            console.warn('WebXR check failed:', e);
        }
    }
    return false;
}
    
    async loadUserSession() {
        // Load or create user profile
        const savedProfile = localStorage.getItem('arplacementai_user');
        if (savedProfile) {
            this.userProfile = JSON.parse(savedProfile);
        } else {
            this.userProfile = {
                id: 'user_' + Date.now(),
                name: 'Guest User',
                preferences: {
                    priceRange: { min: 0, max: 1000 },
                    categories: [],
                    brandPreferences: []
                },
                history: {
                    viewed: [],
                    purchased: [],
                    searched: []
                },
                sessionCount: 0
            };
            localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
        }
        
        this.userProfile.sessionCount++;
        localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
    }
    
    async fetchProductCatalog() {
        try {
            // Try to fetch from API first
            const apiCatalog = await this.brandAPI.fetchProducts();
            
            if (apiCatalog && apiCatalog.length > 0) {
                this.productCatalog = apiCatalog;
            } else {
                // Fallback to demo catalog
                this.productCatalog = this.initDemoCatalog();
            }
            
            // Preload 3D models for top products
            await this.preloadModels();
            
        } catch (error) {
            console.warn('Using demo catalog:', error);
            this.productCatalog = this.initDemoCatalog();
        }
    }
    
    initDemoCatalog() {
        return [
            {
                id: 'coffee_machine_pro',
                name: 'Barista Pro Espresso Machine',
                brand: 'LuxBrew',
                category: 'kitchen',
                price: 499.99,
                discount: 15,
                rating: 4.8,
                stock: 42,
                description: 'Professional-grade espresso machine with smart connectivity',
                tags: ['coffee', 'espresso', 'smart', 'kitchen', 'premium'],
                triggers: ['coffee', 'tired', 'morning', 'caffeine', 'energy', 'brew', 'wake up'],
                modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF/CesiumMan.gltf',
                dimensions: { x: 0.15, y: 0.25, z: 0.20 },
                scale: 0.5,
                colors: ['#8B4513', '#D2691E', '#A0522D'],
                features: ['WiFi Connected', 'App Control', '15 Bar Pressure'],
                reviews: 128,
                shipping: { free: true, days: 2 }
            },
            {
                id: 'smart_garden',
                name: 'HydraSmart Indoor Garden',
                brand: 'GreenLife',
                category: 'home',
                price: 179.99,
                discount: 20,
                rating: 4.6,
                stock: 89,
                description: 'Self-watering smart garden with grow lights',
                tags: ['plant', 'garden', 'smart', 'home', 'sustainable'],
                triggers: ['plant', 'garden', 'green', 'nature', 'grow', 'sustainable', 'home'],
                modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
                dimensions: { x: 0.30, y: 0.15, z: 0.30 },
                scale: 0.3,
                colors: ['#228B22', '#32CD32', '#006400'],
                features: ['Auto Watering', 'LED Grow Lights', 'App Monitoring'],
                reviews: 256,
                shipping: { free: true, days: 3 }
            },
            {
                id: 'pro_tool_set',
                name: 'MasterCraft Pro Tool Kit',
                brand: 'ToolTech',
                category: 'tools',
                price: 299.99,
                discount: 10,
                rating: 4.9,
                stock: 23,
                description: '156-piece professional tool set with lifetime warranty',
                tags: ['tools', 'diy', 'professional', 'repair', 'construction'],
                triggers: ['fix', 'repair', 'build', 'maintenance', 'broken', 'diy', 'tools'],
                modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
                dimensions: { x: 0.40, y: 0.25, z: 0.30 },
                scale: 0.4,
                colors: ['#FF4500', '#FF6347', '#DC143C'],
                features: ['Lifetime Warranty', 'Professional Grade', '156 Pieces'],
                reviews: 512,
                shipping: { free: true, days: 1 }
            },
            {
                id: 'ergo_standing_desk',
                name: 'AeroStand Pro Desk',
                brand: 'ErgoWorks',
                category: 'office',
                price: 699.99,
                discount: 25,
                rating: 4.7,
                stock: 15,
                description: 'Smart standing desk with health tracking',
                tags: ['desk', 'ergonomic', 'office', 'standing', 'health'],
                triggers: ['back', 'posture', 'desk', 'ergonomic', 'work', 'office', 'health'],
                modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
                dimensions: { x: 0.60, y: 0.02, z: 0.40 },
                scale: 0.25,
                colors: ['#8B7355', '#D2B48C', '#A0522D'],
                features: ['Health Tracking', 'Memory Presets', 'Wireless Charging'],
                reviews: 89,
                shipping: { free: false, cost: 49.99, days: 5 }
            },
            {
                id: 'quantum_headphones',
                name: 'Quantum Sound Pro X',
                brand: 'AudioMax',
                category: 'electronics',
                price: 349.99,
                discount: 0,
                rating: 4.9,
                stock: 67,
                description: 'Noise-cancelling headphones with spatial audio',
                tags: ['audio', 'headphones', 'music', 'wireless', 'premium'],
                triggers: ['music', 'sound', 'focus', 'travel', 'audio', 'noise'],
                modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
                dimensions: { x: 0.20, y: 0.15, z: 0.20 },
                scale: 0.5,
                colors: ['#000000', '#1A1A1A', '#333333'],
                features: ['Active Noise Cancelling', '30hr Battery', 'Spatial Audio'],
                reviews: 1024,
                shipping: { free: true, days: 2 }
            }
        ];
    }
    
    async preloadModels() {
        // Preload first 3 models for better UX
        const modelsToPreload = this.productCatalog.slice(0, 3);
        
        for (const product of modelsToPreload) {
            try {
                await this.loadModel(product.modelUrl);
                console.log(`Preloaded model: ${product.name}`);
            } catch (error) {
                console.warn(`Failed to preload ${product.name}:`, error);
            }
        }
    }
    
    setupScene() {
        // Three.js scene setup
        this.scene = new THREE.Scene();
        this.scene.background = null;
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.01, 
            100
        );
        
        // Renderer with advanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            precision: 'highp'
        });
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        document.body.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Reticle for surface detection
        const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const reticleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        this.reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
        
        // Floor grid for reference
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
        gridHelper.position.y = -1.5;
        gridHelper.visible = false; // Hidden in AR mode
        this.scene.add(gridHelper);
    }
    
    setupUI() {
        // Remove any existing UI
        const existingUI = document.getElementById('ui-overlay');
        if (existingUI) existingUI.remove();
        
        // Create main UI overlay
        const overlay = document.createElement('div');
        overlay.id = 'ui-overlay';
        overlay.innerHTML = this.getUIMarkup();
        document.body.appendChild(overlay);
        
        // Setup event listeners for UI elements
        this.setupUIEventListeners();
    }
    
    getUIMarkup() {
        return `
            <!-- Start Screen -->
            <div id="startScreen" class="screen">
                <div class="start-content">
                    <div class="logo">
                        <i class="fas fa-cube"></i>
                        <h1>ARplacementAI</h1>
                        <p class="tagline">See it in your space before you buy</p>
                    </div>
                    
                    <div class="user-welcome">
                        <div class="avatar">${this.userProfile?.name?.charAt(0) || 'G'}</div>
                        <h3>Welcome, ${this.userProfile?.name || 'Guest'}!</h3>
                        <p>Session #${this.userProfile?.sessionCount || 1}</p>
                    </div>
                    
                    <div class="quick-stats">
                        <div class="stat-card">
                            <i class="fas fa-box-open"></i>
                            <span>${this.productCatalog.length} Products</span>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-tags"></i>
                            <span>${this.getActiveBrands()} Brands</span>
                        </div>
                        <div class="stat-card">
                            <i class="fas fa-shipping-fast"></i>
                            <span>Free Shipping</span>
                        </div>
                    </div>
                    
                    <button id="startAR" class="btn-primary" disabled>
                        <i class="fas fa-circle-notch fa-spin"></i>
                        Checking Compatibility...
                    </button>
                    
                    <button id="viewCatalog" class="btn-secondary">
                        <i class="fas fa-th"></i>
                        Browse Catalog
                    </button>
                    
                    <div class="demo-tips">
                        <p><i class="fas fa-lightbulb"></i> Try saying: "I need coffee" or "My back hurts at work"</p>
                    </div>
                </div>
            </div>
            
            <!-- Loading Screen -->
            <div id="loading" class="screen">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h2>Loading ARplacementAI</h2>
                    <p>Initializing 3D engine...</p>
                </div>
            </div>
            
            <!-- AR Interface -->
            <div id="arInterface" class="screen" style="display: none;">
                <!-- Top Bar -->
                <div class="top-bar">
                    <button id="exitAR" class="icon-btn">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="session-info">
                        <span class="fps-counter">60 FPS</span>
                        <span class="product-count">0 Products</span>
                    </div>
                    <button id="toggleCatalog" class="icon-btn">
                        <i class="fas fa-th"></i>
                    </button>
                </div>
                
                <!-- Instructions -->
                <div id="instructions" class="instructions">
                    <div class="instruction-item">
                        <i class="fas fa-move"></i>
                        <span>Move to detect surfaces</span>
                    </div>
                    <div class="instruction-item">
                        <i class="fas fa-comment"></i>
                        <span>Speak or type to trigger AI</span>
                    </div>
                    <div class="instruction-item">
                        <i class="fas fa-hand-pointer"></i>
                        <span>Tap to place products</span>
                    </div>
                </div>
                
                <!-- AI Chat Interface -->
                <div id="chatInterface" class="chat-interface">
                    <div class="chat-header">
                        <i class="fas fa-robot"></i>
                        <span>AI Assistant</span>
                        <div class="confidence-indicator">
                            <div class="confidence-bar"></div>
                            <span class="confidence-value">--%</span>
                        </div>
                    </div>
                    <div class="chat-input-container">
                        <input type="text" id="chatInput" 
                               placeholder="What are you thinking about? Try: 'I need coffee' or 'My plant needs water'"
                               autocomplete="off">
                        <button id="voiceInput" class="icon-btn-small">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button id="sendChat" class="icon-btn-small">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div id="aiSuggestions" class="suggestions">
                        <!-- AI suggestions will appear here -->
                    </div>
                </div>
                
                <!-- Analytics Panel -->
                <div id="analyticsPanel" class="analytics-panel">
                    <div class="analytics-header">
                        <i class="fas fa-chart-line"></i>
                        <span>Live Analytics</span>
                        <button id="toggleAnalytics" class="icon-btn-small">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="analytics-content">
                        <div class="stat-row">
                            <span class="stat-label">Placements</span>
                            <span class="stat-value" id="statPlacements">0</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Impressions</span>
                            <span class="stat-value" id="statImpressions">0</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Interactions</span>
                            <span class="stat-value" id="statInteractions">0</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">AI Confidence</span>
                            <span class="stat-value" id="statConfidence">--%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Session Time</span>
                            <span class="stat-value" id="statSessionTime">0:00</span>
                        </div>
                    </div>
                </div>
                
                <!-- Product Catalog Sidebar -->
                <div id="catalogSidebar" class="catalog-sidebar">
                    <div class="catalog-header">
                        <h3><i class="fas fa-th"></i> Product Catalog</h3>
                        <button id="closeCatalog" class="icon-btn-small">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="catalog-filters">
                        <input type="text" placeholder="Search products..." class="search-input">
                        <select class="filter-select">
                            <option value="all">All Categories</option>
                            <option value="kitchen">Kitchen</option>
                            <option value="home">Home</option>
                            <option value="tools">Tools</option>
                            <option value="office">Office</option>
                            <option value="electronics">Electronics</option>
                        </select>
                    </div>
                    <div id="catalogItems" class="catalog-items">
                        <!-- Catalog items will be dynamically added -->
                    </div>
                </div>
                
                <!-- Cart Panel -->
                <div id="cartPanel" class="cart-panel">
                    <div class="cart-header">
                        <h3><i class="fas fa-shopping-cart"></i> Your Cart</h3>
                        <span class="cart-count">0</span>
                    </div>
                    <div id="cartItems" class="cart-items">
                        <!-- Cart items will be dynamically added -->
                    </div>
                    <div class="cart-footer">
                        <div class="cart-total">
                            <span>Total:</span>
                            <span class="total-amount">$0.00</span>
                        </div>
                        <button id="checkoutBtn" class="btn-checkout" disabled>
                            <i class="fas fa-lock"></i>
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
                
                <!-- Payment Modal -->
                <div id="paymentModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-credit-card"></i> Secure Checkout</h3>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="paymentForm">
                                <!-- Payment form will be dynamically added -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Error Toast -->
                <div id="errorToast" class="toast">
                    <i class="fas fa-exclamation-circle"></i>
                    <span class="toast-message"></span>
                    <button class="toast-close">&times;</button>
                </div>
                
                <!-- Success Toast -->
                <div id="successToast" class="toast success">
                    <i class="fas fa-check-circle"></i>
                    <span class="toast-message"></span>
                    <button class="toast-close">&times;</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('beforeunload', () => this.saveSessionData());
        
        // Device motion for better AR
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (e) => this.handleDeviceMotion(e));
        }
    }
    
    setupUIEventListeners() {
        // Start AR
        document.getElementById('startAR').addEventListener('click', () => this.startAR());
        
        // View Catalog
        document.getElementById('viewCatalog').addEventListener('click', () => this.showCatalog());
        
        // Chat input
        const chatInput = document.getElementById('chatInput');
        chatInput.addEventListener('input', (e) => this.handleInput(e.target.value));
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleInput(e.target.value);
        });
        
        document.getElementById('sendChat').addEventListener('click', () => {
            this.handleInput(chatInput.value);
            chatInput.value = '';
        });
        
        // Voice input
        document.getElementById('voiceInput').addEventListener('click', () => this.startVoiceInput());
        
        // Exit AR
        document.getElementById('exitAR').addEventListener('click', () => this.endSession());
        
        // Toggle catalog
        document.getElementById('toggleCatalog').addEventListener('click', () => this.toggleCatalog());
        document.getElementById('closeCatalog').addEventListener('click', () => this.hideCatalog());
        
        // Checkout
        document.getElementById('checkoutBtn').addEventListener('click', () => this.showPaymentModal());
        
        // Close modals
        document.querySelectorAll('.close-modal, .toast-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('paymentModal').classList.remove('show');
                document.getElementById('errorToast').classList.remove('show');
                document.getElementById('successToast').classList.remove('show');
            });
        });
    }
    
    async startAR() {
        try {
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('arInterface').style.display = 'block';
            
            // Request AR session
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'dom-overlay'],
                optionalFeatures: ['light-estimation', 'anchors'],
                domOverlay: { root: document.getElementById('arInterface') }
            });
            
            session.addEventListener('end', () => this.onSessionEnd());
            await this.renderer.xr.setSession(session);
            
            this.isSessionActive = true;
            this.analytics.sessionStart = Date.now();
            
            // Setup hit testing
            const viewerSpace = await session.requestReferenceSpace('viewer');
            this.hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
            
            // Setup select handler
            session.addEventListener('select', (event) => this.onSelect(event));
            
            // Start render loop
            this.renderer.setAnimationLoop((timestamp, frame) => this.render(timestamp, frame));
            
            // Populate catalog
            this.populateCatalog();
            
            // Show success toast
            this.showToast('AR session started successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to start AR:', error);
            this.showError(`Failed to start AR: ${error.message}`);
            this.endSession();
        }
    }
    
    async render(timestamp, frame) {
        // Update FPS counter
        this.frameCount++;
        const now = performance.now();
        if (now >= this.lastFPSUpdate + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
            
            const fpsCounter = document.querySelector('.fps-counter');
            if (fpsCounter) {
                fpsCounter.textContent = `${this.fps} FPS`;
                fpsCounter.style.color = this.fps > 30 ? '#00ff88' : this.fps > 15 ? '#ffaa00' : '#ff4444';
            }
        }
        
        // Update session timer
        const sessionTime = Math.floor((Date.now() - this.analytics.sessionStart) / 1000);
        const minutes = Math.floor(sessionTime / 60);
        const seconds = sessionTime % 60;
        document.getElementById('statSessionTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update product count
        document.querySelector('.product-count').textContent = `${this.products.length} Products`;
        
        if (frame && this.hitTestSource) {
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);
            
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);
                
                this.reticle.visible = true;
                this.reticle.matrix.fromArray(pose.transform.matrix);
                
                // Track gaze/heatmap data
                this.trackGazeData(pose.transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }
        
        // Update product labels position
        this.updateProductLabels();
        
        this.renderer.render(this.scene, this.camera);
    }
    
    handleInput(text) {
        if (!text.trim()) return;
        
        // Add to conversation history
        this.conversationContext.push(text.toLowerCase());
        this.conversationHistory.push({
            type: 'user',
            content: text,
            timestamp: Date.now()
        });
        
        // Update user profile with search history
        if (this.userProfile) {
            this.userProfile.history.searched.push({
                query: text,
                timestamp: Date.now()
            });
            localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
        }
        
        // AI analyzes context and suggests products
        const suggestions = this.aiEngine.analyzeContext(
            text.toLowerCase(), 
            this.productCatalog,
            this.userProfile
        );
        
        const suggestionsDiv = document.getElementById('aiSuggestions');
        const confidenceBar = document.querySelector('.confidence-bar');
        const confidenceValue = document.querySelector('.confidence-value');
        
        if (suggestions.length > 0) {
            const topSuggestion = suggestions[0];
            
            // Update confidence display
            const confidencePercent = Math.round(topSuggestion.confidence * 100);
            confidenceBar.style.width = `${confidencePercent}%`;
            confidenceValue.textContent = `${confidencePercent}%`;
            
            // Display suggestion
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item">
                    <i class="fas fa-lightbulb"></i>
                    <strong>AI suggests:</strong> ${topSuggestion.product.name}
                    <span class="suggestion-confidence">(${confidencePercent}% match)</span>
                </div>
                <div class="suggestion-details">
                    ${topSuggestion.product.description}
                    <div class="suggestion-price">$${topSuggestion.product.price}</div>
                </div>
            `;
            
            // Auto-suggest placement after 2 seconds if reticle is visible
            setTimeout(() => {
                if (this.reticle.visible && this.isSessionActive) {
                    this.placeProduct(topSuggestion.product);
                }
            }, 2000);
            
            // Send analytics to brand API
            this.brandAPI.trackSuggestion({
                query: text,
                suggestedProduct: topSuggestion.product.id,
                confidence: topSuggestion.confidence,
                timestamp: Date.now()
            });
            
        } else {
            suggestionsDiv.textContent = 'Try describing what you need... (e.g., "I need coffee", "My back hurts", "Help me fix something")';
            confidenceBar.style.width = '0%';
            confidenceValue.textContent = '--%';
        }
        
        // Update analytics
        document.getElementById('statConfidence').textContent = 
            suggestions.length > 0 ? `${Math.round(suggestions[0].confidence * 100)}%` : '--%';
    }
    
    async placeProduct(productData) {
        try {
            let productMesh;
            
            // Try to load 3D model
            if (productData.modelUrl) {
                productMesh = await this.loadModel(productData.modelUrl);
                productMesh.scale.set(productData.scale || 1, productData.scale || 1, productData.scale || 1);
            } else {
                // Fallback to primitive geometry
                const geometry = new THREE.BoxGeometry(
                    productData.dimensions?.x || 0.1,
                    productData.dimensions?.y || 0.1,
                    productData.dimensions?.z || 0.1
                );
                const material = new THREE.MeshPhongMaterial({ 
                    color: typeof productData.colors?.[0] === 'string' ? 
                        new THREE.Color(productData.colors[0]) : 0x00ff88
                });
                productMesh = new THREE.Mesh(geometry, material);
            }
            
            // Position at reticle
            productMesh.position.setFromMatrixPosition(this.reticle.matrix);
            
            // Add user data
            productMesh.userData = {
                productId: productData.id,
                productData: productData,
                placedAt: Date.now(),
                interactions: 0
            };
            
            // Add physics-like rotation
            productMesh.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(productMesh);
            this.products.push(productMesh);
            
            // Create interactive label
            this.createProductLabel(productMesh, productData);
            
            // Analytics
            this.analytics.placements++;
            if (!this.analytics.impressions[productData.id]) {
                this.analytics.impressions[productData.id] = 0;
            }
            this.analytics.impressions[productData.id]++;
            
            // Track placement with brand API
            this.brandAPI.trackPlacement({
                productId: productData.id,
                placementTime: Date.now(),
                position: productMesh.position.toArray()
            });
            
            // Update UI
            this.updateAnalytics();
            
            // Show success message
            this.showToast(`${productData.name} placed successfully!`, 'success');
            
        } catch (error) {
            console.error('Failed to place product:', error);
            this.showToast('Failed to place product. Trying fallback...', 'error');
            
            // Fallback: Create simple placeholder
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            const placeholder = new THREE.Mesh(geometry, material);
            placeholder.position.setFromMatrixPosition(this.reticle.matrix);
            
            placeholder.userData = {
                productId: productData.id,
                productData: productData,
                isPlaceholder: true
            };
            
            this.scene.add(placeholder);
            this.products.push(placeholder);
        }
    }
    
    async loadModel(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;

                    // Traverse and setup materials
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

                            // Improve material appearance
                            if (child.material) {
                                child.material.roughness = 0.8;
                                child.material.metalness = 0.2;
                            }
                        }
                    });

                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);

                    resolve(model);
                },
                (progress) => {
                    // Loading progress
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100);
                        if (percent <= 100) {
                            console.log(`Loading model: ${percent.toFixed(1)}%`);
                        } else {
                            console.log(`Loading model: ${(progress.loaded / 1024).toFixed(0)} KB`);
                        }
                    } else {
                        console.log(`Loading model: ${(progress.loaded / 1024).toFixed(0)} KB`);
                    }
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    createProductLabel(productMesh, productData) {
        const label = document.createElement('div');
        label.className = 'product-label';
        label.innerHTML = `
            <div class="product-label-header">
                <div>
                    <div class="product-label-name">${productData.name}</div>
                    <div class="product-label-brand">${productData.brand}</div>
                </div>
                <div class="product-label-price">$${productData.price}</div>
            </div>
            <div class="product-label-actions">
                <button class="btn-add-to-cart" data-product="${productData.id}">
                    <i class="fas fa-cart-plus"></i>
                    Add to Cart
                </button>
                <button class="btn-wishlist" data-product="${productData.id}">
                    <i class="far fa-heart"></i>
                    Wishlist
                </button>
            </div>
        `;
        
        // Add event listeners
        label.querySelector('.btn-add-to-cart').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToCart(productData);
            label.style.borderColor = '#00ccff';
            
            // Track interaction
            productMesh.userData.interactions++;
            this.trackInteraction(productData.id, 'add_to_cart');
        });
        
        label.querySelector('.btn-wishlist').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToWishlist(productData);
            
            // Track interaction
            productMesh.userData.interactions++;
            this.trackInteraction(productData.id, 'wishlist');
        });
        
        // Click on label for more info
        label.addEventListener('click', () => {
            this.showProductDetails(productData);
            
            // Track interaction
            productMesh.userData.interactions++;
            this.trackInteraction(productData.id, 'view_details');
        });
        
        document.getElementById('ui-overlay').appendChild(label);
        
        // Store reference
        this.productLabels.set(productMesh.uuid, {
            element: label,
            mesh: productMesh,
            productId: productData.id
        });
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (this.productLabels.has(productMesh.uuid)) {
                label.remove();
                this.productLabels.delete(productMesh.uuid);
            }
        }, 30000);
    }
    
    updateProductLabels() {
        if (!this.camera || !this.renderer) return;
        
        this.productLabels.forEach((labelData, uuid) => {
            const { element, mesh } = labelData;
            
            if (!mesh.parent || mesh.userData.isPlaceholder) {
                element.remove();
                this.productLabels.delete(uuid);
                return;
            }
            
            // Convert 3D position to screen position
            const screenPosition = new THREE.Vector3();
            mesh.getWorldPosition(screenPosition);
            screenPosition.project(this.camera);
            
            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(screenPosition.y * 0.5) + 0.5) * window.innerHeight;
            
            // Check if object is in front of camera
            if (screenPosition.z < 1 && 
                x > -50 && x < window.innerWidth + 50 && 
                y > -50 && y < window.innerHeight + 50) {
                
                element.style.left = `${x}px`;
                element.style.top = `${y}px`;
                element.style.display = 'block';
                
                // Adjust based on distance
                const distance = mesh.position.distanceTo(this.camera.position);
                const scale = Math.max(0.5, Math.min(1.5, 3 / distance));
                element.style.transform = `translate(-50%, -50%) scale(${scale})`;
                
            } else {
                element.style.display = 'none';
            }
        });
    }
    
    addToCart(productData) {
        // Check inventory
        if (productData.stock <= 0) {
            this.showToast('Product out of stock', 'error');
            return;
        }
        
        // Add to cart
        this.cart.push({
            ...productData,
            quantity: 1,
            addedAt: Date.now()
        });
        
        // Update cart UI
        this.updateCartUI();
        
        // Show success message
        this.showToast(`Added ${productData.name} to cart!`, 'success');
        
        // Track with brand API
        this.brandAPI.trackCartAdd({
            productId: productData.id,
            price: productData.price,
            timestamp: Date.now()
        });
    }
    
    updateCartUI() {
        const cartItems = document.getElementById('cartItems');
        const cartCount = document.querySelector('.cart-count');
        const totalAmount = document.querySelector('.total-amount');
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        // Update count
        cartCount.textContent = this.cart.length;
        
        // Calculate total
        let total = 0;
        this.cart.forEach(item => {
            total += item.price * item.quantity;
        });
        totalAmount.textContent = `$${total.toFixed(2)}`;
        
        // Enable/disable checkout
        checkoutBtn.disabled = this.cart.length === 0;
        
        // Update items list
        cartItems.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">$${item.price}</div>
                </div>
                <button class="remove-item" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Add remove listeners
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.cart.splice(index, 1);
                this.updateCartUI();
                this.showToast('Item removed from cart', 'error');
            });
        });
    }
    
    async showPaymentModal() {
        const modal = document.getElementById('paymentModal');
        const paymentForm = document.getElementById('paymentForm');
        
        // Calculate total
        const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        // Create payment form
        paymentForm.innerHTML = `
            <div class="payment-summary">
                <h4>Order Summary</h4>
                ${this.cart.map(item => `
                    <div class="summary-item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="summary-total">
                    <span>Total</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="payment-methods">
                <h4>Payment Method</h4>
                <div class="method-options">
                    <label class="method-option active">
                        <input type="radio" name="paymentMethod" value="card" checked>
                        <i class="fas fa-credit-card"></i>
                        <span>Credit Card</span>
                    </label>
                    <label class="method-option">
                        <input type="radio" name="paymentMethod" value="paypal">
                        <i class="fab fa-paypal"></i>
                        <span>PayPal</span>
                    </label>
                    <label class="method-option">
                        <input type="radio" name="paymentMethod" value="applepay">
                        <i class="fab fa-apple"></i>
                        <span>Apple Pay</span>
                    </label>
                </div>
            </div>
            
            <div class="card-details">
                <h4>Card Details</h4>
                <input type="text" placeholder="Card Number" class="card-input">
                <div class="card-row">
                    <input type="text" placeholder="MM/YY" class="card-input small">
                    <input type="text" placeholder="CVC" class="card-input small">
                </div>
                <input type="text" placeholder="Name on Card" class="card-input">
            </div>
            
            <button id="processPayment" class="btn-checkout">
                <i class="fas fa-lock"></i>
                Pay $${total.toFixed(2)}
            </button>
        `;
        
        // Add payment processing
        document.getElementById('processPayment').addEventListener('click', () => this.processPayment());
        
        modal.classList.add('show');
    }
    
    async processPayment() {
        try {
            // Show loading
            const processBtn = document.getElementById('processPayment');
            processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            processBtn.disabled = true;
            
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Process with Stripe (would be real in production)
            const paymentResult = await this.paymentProcessor.processPayment({
                amount: this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
                items: this.cart,
                user: this.userProfile
            });
            
            if (paymentResult.success) {
                // Track conversion
                this.cart.forEach(item => {
                    if (!this.analytics.conversions[item.id]) {
                        this.analytics.conversions[item.id] = 0;
                    }
                    this.analytics.conversions[item.id]++;
                    
                    // Update inventory
                    this.inventoryAPI.updateStock(item.id, -1);
                });
                
                // Clear cart
                this.cart = [];
                this.updateCartUI();
                
                // Close modal
                document.getElementById('paymentModal').classList.remove('show');
                
                // Show success
                this.showToast('Payment successful! Order confirmed.', 'success');
                
                // Send analytics
                this.brandAPI.trackPurchase({
                    orderId: paymentResult.orderId,
                    items: this.cart,
                    total: paymentResult.amount,
                    timestamp: Date.now()
                });
                
                // Save to user history
                if (this.userProfile) {
                    this.userProfile.history.purchased.push({
                        orderId: paymentResult.orderId,
                        items: this.cart.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price
                        })),
                        timestamp: Date.now()
                    });
                    localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
                }
                
            } else {
                throw new Error(paymentResult.error || 'Payment failed');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast(`Payment failed: ${error.message}`, 'error');
            
            // Reset button
            const total = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const processBtn = document.getElementById('processPayment');
            processBtn.innerHTML = `<i class="fas fa-lock"></i> Pay $${total.toFixed(2)}`;
            processBtn.disabled = false;
        }
    }
    
    trackInteraction(productId, action) {
        if (!this.analytics.interactions[productId]) {
            this.analytics.interactions[productId] = {};
        }
        if (!this.analytics.interactions[productId][action]) {
            this.analytics.interactions[productId][action] = 0;
        }
        this.analytics.interactions[productId][action]++;
        
        this.updateAnalytics();
        
        // Send to brand API
        this.brandAPI.trackInteraction({
            productId,
            action,
            timestamp: Date.now()
        });
    }
    
    updateAnalytics() {
        document.getElementById('statPlacements').textContent = this.analytics.placements;
        document.getElementById('statImpressions').textContent = 
            Object.values(this.analytics.impressions).reduce((a, b) => a + b, 0);
        document.getElementById('statInteractions').textContent = 
            Object.values(this.analytics.interactions).reduce((total, productInteractions) => {
                return total + Object.values(productInteractions).reduce((sum, count) => sum + count, 0);
            }, 0);
    }
    
    populateCatalog() {
        const catalogItems = document.getElementById('catalogItems');
        
        catalogItems.innerHTML = this.productCatalog.map(product => `
            <div class="catalog-item" data-product="${product.id}">
                <div class="item-header">
                    <div class="item-name">${product.name}</div>
                    <div>
                        <span class="item-price">$${product.price}</span>
                        ${product.discount ? `<span class="item-discount">$${(product.price * 100 / (100 - product.discount)).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div class="item-brand">${product.brand}</div>
                <div class="item-rating">
                    ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                    <span>(${product.reviews})</span>
                </div>
                <div class="item-tags">
                    ${product.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="item-stock" style="color: ${product.stock > 10 ? '#00ff88' : product.stock > 0 ? '#ffaa00' : '#ff4444'}">
                    ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        document.querySelectorAll('.catalog-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.product;
                const product = this.productCatalog.find(p => p.id === productId);
                
                if (product && this.reticle.visible) {
                    this.placeProduct(product);
                    this.hideCatalog();
                } else if (product) {
                    this.showToast('Move your device to detect a surface first', 'error');
                }
            });
        });
    }
    
    showCatalog() {
        document.getElementById('catalogSidebar').classList.add('show');
    }
    
    hideCatalog() {
        document.getElementById('catalogSidebar').classList.remove('show');
    }
    
    toggleCatalog() {
        const sidebar = document.getElementById('catalogSidebar');
        sidebar.classList.toggle('show');
    }
    
    showProductDetails(productData) {
        // In a full implementation, this would show a detailed modal
        console.log('Product details:', productData);
        this.showToast(`Viewing ${productData.name} details`, 'success');
    }
    
    addToWishlist(productData) {
        this.wishlist.push(productData);
        this.showToast(`Added ${productData.name} to wishlist`, 'success');
        
        // Update user preferences
        if (this.userProfile) {
            if (!this.userProfile.preferences.categories.includes(productData.category)) {
                this.userProfile.preferences.categories.push(productData.category);
            }
            localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
        }
    }
    
    startVoiceInput() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            recognition.start();
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('chatInput').value = transcript;
                this.handleInput(transcript);
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showToast('Voice input failed. Please try typing.', 'error');
            };
            
        } else {
            this.showToast('Voice input not supported in this browser', 'error');
        }
    }
    
    trackGazeData(matrix) {
        // Convert matrix to position
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        
        new THREE.Matrix4().fromArray(matrix).decompose(position, rotation, scale);
        
        // Store heatmap data
        this.analytics.heatmapData.push({
            x: position.x,
            y: position.y,
            z: position.z,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 points
        if (this.analytics.heatmapData.length > 1000) {
            this.analytics.heatmapData.shift();
        }
    }
    
    onSelect(event) {
        if (!this.reticle.visible || !this.isSessionActive) return;
        
        const lastInput = this.conversationContext[this.conversationContext.length - 1] || '';
        const suggestions = this.aiEngine.analyzeContext(lastInput, this.productCatalog, this.userProfile);
        
        if (suggestions.length > 0) {
            this.placeProduct(suggestions[0].product);
        } else {
            // Place a random product from catalog
            const randomProduct = this.productCatalog[
                Math.floor(Math.random() * this.productCatalog.length)
            ];
            this.placeProduct(randomProduct);
        }
    }
    
    onSessionEnd() {
        this.isSessionActive = false;
        this.renderer.setAnimationLoop(null);
        
        // Clean up labels
        this.productLabels.forEach(labelData => {
            labelData.element.remove();
        });
        this.productLabels.clear();
        
        // Remove products from scene
        this.products.forEach(product => {
            this.scene.remove(product);
            if (product.geometry) product.geometry.dispose();
            if (product.material) {
                if (Array.isArray(product.material)) {
                    product.material.forEach(m => m.dispose());
                } else {
                    product.material.dispose();
                }
            }
        });
        this.products = [];
        
        // Show start screen
        document.getElementById('arInterface').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
        
        // Log analytics
        console.log('Session Analytics:', this.analytics);
        
        // Send session data to brand API
        this.brandAPI.trackSessionEnd({
            sessionDuration: Date.now() - this.analytics.sessionStart,
            placements: this.analytics.placements,
            impressions: this.analytics.impressions,
            interactions: this.analytics.interactions,
            conversions: this.analytics.conversions,
            heatmap: this.analytics.heatmapData
        });
        
        this.showToast('AR session ended. Analytics saved.', 'success');
    }
    
    endSession() {
        if (this.renderer.xr.getSession()) {
            this.renderer.xr.getSession().end();
        } else {
            this.onSessionEnd();
        }
    }
    
    saveSessionData() {
        // Save user data
        if (this.userProfile) {
            localStorage.setItem('arplacementai_user', JSON.stringify(this.userProfile));
        }
        
        // Save session analytics
        const sessionData = {
            timestamp: Date.now(),
            analytics: this.analytics,
            cart: this.cart,
            wishlist: this.wishlist
        };
        
        const sessions = JSON.parse(localStorage.getItem('arplacementai_sessions') || '[]');
        sessions.push(sessionData);
        localStorage.setItem('arplacementai_sessions', JSON.stringify(sessions));
    }
    
    showToast(message, type = 'error') {
        const toast = document.getElementById(type === 'success' ? 'successToast' : 'errorToast');
        if (!toast) {
            alert(message);
            return;
        }
        const toastMessage = toast.querySelector('.toast-message');
        
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    handleDeviceMotion(event) {
        // Could be used for advanced AR features like surface normal detection
        // console.log('Device motion:', event);
    }
    
    loadUserPreferences() {
        return JSON.parse(localStorage.getItem('arplacementai_preferences') || '{}');
    }
    
    saveUserPreferences() {
        localStorage.setItem('arplacementai_preferences', JSON.stringify(this.userPreferences));
    }
    
    getActiveBrands() {
        const brands = new Set(this.productCatalog.map(p => p.brand));
        return brands.size;
    }
}

// ============================================
// ENHANCED CONTEXTUAL AI ENGINE
// ============================================

class EnhancedContextualAI {
    analyzeContext(input, catalog, userProfile = null) {
        const words = input.toLowerCase().split(/\s+/);
        const suggestions = [];
        
        catalog.forEach(product => {
            let score = 0;
            let matches = 0;
            let reason = '';
            
            // 1. Check trigger word matches
            product.triggers.forEach(trigger => {
                if (words.some(word => {
                    const wordMatch = word.includes(trigger) || trigger.includes(word);
                    const levenshteinDistance = this.calculateLevenshtein(word, trigger);
                    return wordMatch || levenshteinDistance <= 2;
                })) {
                    score += 2;
                    matches++;
                    reason = `Matched trigger word: ${trigger}`;
                }
            });
            
            // 2. Semantic similarity (simple implementation)
            const inputTokens = new Set(words);
            const productTokens = new Set([
                ...product.tags,
                ...product.name.toLowerCase().split(' '),
                ...product.category ? [product.category] : []
            ]);
            
            const intersection = [...inputTokens].filter(x => productTokens.has(x)).length;
            score += intersection * 1.5;
            
            // 3. User preference weighting
            if (userProfile) {
                // Boost products in preferred categories
                if (userProfile.preferences.categories.includes(product.category)) {
                    score *= 1.3;
                    reason = 'Matches your preferences';
                }
                
                // Boost previously viewed products
                if (userProfile.history.viewed.includes(product.id)) {
                    score *= 1.2;
                }
                
                // Boost brands the user likes
                if (userProfile.preferences.brandPreferences.includes(product.brand)) {
                    score *= 1.25;
                }
                
                // Price range consideration
                const userPriceRange = userProfile.preferences.priceRange || { min: 0, max: 1000 };
                if (product.price >= userPriceRange.min && product.price <= userPriceRange.max) {
                    score *= 1.1;
                } else {
                    score *= 0.8; // Penalize out of range
                }
            }
            
            // 4. Contextual boosting based on time, weather, etc.
            const hour = new Date().getHours();
            if (hour >= 6 && hour <= 10) {
                // Morning - boost coffee, breakfast items
                if (product.tags.includes('coffee') || product.tags.includes('breakfast')) {
                    score *= 1.4;
                    reason = 'Perfect for morning!';
                }
            } else if (hour >= 17 && hour <= 20) {
                // Evening - boost relaxation items
                if (product.tags.includes('relax') || product.tags.includes('home')) {
                    score *= 1.3;
                }
            }
            
            // 5. Stock and popularity factors
            if (product.stock <= 0) {
                score *= 0.5; // Penalize out of stock
            } else if (product.stock < 10) {
                score *= 1.2; // Boost low stock for urgency
                reason = 'Low stock - buy now!';
            }
            
            if (product.rating >= 4.5) {
                score *= 1.25; // Boost highly rated products
            }
            
            // 6. Discount boosting
            if (product.discount && product.discount > 15) {
                score *= 1.3;
                reason = `${product.discount}% off!`;
            }
            
            // Calculate confidence (0-1)
            const confidence = Math.min(1, score / 20);
            
            if (confidence > 0.1) { // Minimum confidence threshold
                suggestions.push({
                    product,
                    confidence,
                    matches,
                    reason,
                    score
                });
            }
        });
        
        // Sort by score
        return suggestions.sort((a, b) => b.score - a.score);
    }
    
    calculateLevenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a.charAt(j - 1) === b.charAt(i - 1) ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        return matrix[b.length][a.length];
    }
}

// ============================================
// RECOMMENDATION ENGINE
// ============================================

class RecommendationEngine {
    getRecommendations(userProfile, catalog, context = null) {
        let recommendations = [];
        
        // Collaborative filtering (simulated)
        if (userProfile.history.purchased.length > 0) {
            const purchasedCategories = userProfile.history.purchased
                .flatMap(order => order.items)
                .map(item => catalog.find(p => p.id === item.id)?.category)
                .filter(Boolean);
            
            const mostPurchasedCategory = this.getMostFrequent(purchasedCategories);
            
            if (mostPurchasedCategory) {
                recommendations = catalog
                    .filter(p => p.category === mostPurchasedCategory)
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 3);
            }
        }
        
        // Content-based filtering
        if (recommendations.length === 0 && context) {
            const ai = new EnhancedContextualAI();
            const suggestions = ai.analyzeContext(context, catalog, userProfile);
            recommendations = suggestions.slice(0, 3).map(s => s.product);
        }
        
        // Popular items fallback
        if (recommendations.length === 0) {
            recommendations = catalog
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 3);
        }
        
        return recommendations;
    }
    
    getMostFrequent(arr) {
        return arr.sort((a, b) =>
            arr.filter(v => v === a).length - arr.filter(v => v === b).length
        ).pop();
    }
}

// ============================================
// BRAND API INTEGRATION
// ============================================

class BrandAPI {
    constructor() {
        this.baseUrl = 'https://api.arplacementai.com/v1'; // Demo URL
        this.apiKey = null;
        this.userId = null;
        this.sessionId = null;
    }
    
    async initialize(config) {
        this.apiKey = config.apiKey;
        this.userId = config.userId;
        this.sessionId = 'session_' + Date.now();
        
        // Initialize session
        await this.trackSessionStart();
        
        return true;
    }
    
    async fetchProducts() {
        try {
            // In production, this would be a real API call
            // For demo, we simulate network delay and return null to use local catalog
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Simulate API response
            // return await fetch(`${this.baseUrl}/products?userId=${this.userId}`, {
            //     headers: { 'Authorization': `Bearer ${this.apiKey}` }
            // }).then(res => res.json());
            
            return null; // Use local catalog for demo
            
        } catch (error) {
            console.warn('Brand API fetch failed:', error);
            return null;
        }
    }
    
    async trackSessionStart() {
        const data = {
            sessionId: this.sessionId,
            userId: this.userId,
            startTime: Date.now(),
            userAgent: navigator.userAgent,
            platform: navigator.platform
        };
        
        // In production: send to analytics endpoint
        // await fetch(`${this.baseUrl}/analytics/session/start`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data)
        // });
        
        console.log('Session started:', data);
    }
    
    async trackSessionEnd(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data,
            endTime: Date.now()
        };
        
        // In production: send to analytics endpoint
        // await fetch(`${this.baseUrl}/analytics/session/end`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(payload)
        // });
        
        console.log('Session ended:', payload);
    }
    
    async trackSuggestion(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };
        
        console.log('AI suggestion tracked:', payload);
    }
    
    async trackPlacement(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };
        
        console.log('Product placement tracked:', payload);
    }
    
    async trackInteraction(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };
        
        console.log('Interaction tracked:', payload);
    }
    
    async trackCartAdd(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };
        
        console.log('Cart add tracked:', payload);
    }
    
    async trackPurchase(data) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
        };
        
        console.log('Purchase tracked:', payload);
        
        // In production, would update inventory and trigger order processing
    }
}

// ============================================
// PAYMENT PROCESSOR
// ============================================

class PaymentProcessor {
    constructor() {
        // In production, this would be initialized with real Stripe keys
        // this.stripe = Stripe('pk_test_your_key_here');
    }
    
    async processPayment(paymentData) {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In production, this would:
        // 1. Create a payment intent with Stripe
        // 2. Handle 3D Secure authentication
        // 3. Confirm payment
        // 4. Return result
        
        return {
            success: true,
            orderId: 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            amount: paymentData.amount,
            transactionId: 'TX_' + Date.now(),
            timestamp: Date.now()
        };
    }
}

// ============================================
// INVENTORY API
// ============================================

class InventoryAPI {
    constructor() {
        this.baseUrl = 'https://api.arplacementai.com/v1/inventory';
    }
    
    async updateStock(productId, quantityDelta) {
        // In production, this would update inventory in real-time
        console.log(`Inventory update: ${productId} changed by ${quantityDelta}`);
        
        // Simulate API call
        // await fetch(`${this.baseUrl}/${productId}`, {
        //     method: 'PATCH',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ quantityDelta })
        // });
    }
    
    async checkStock(productId) {
        // In production, this would check real-time stock
        return 10; // Demo stock
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    // Add WebXR polyfill if needed
    if (!('xr' in navigator) && typeof WebXRPolyfill !== 'undefined') {
        new WebXRPolyfill();
    }
    
    // Initialize app
    window.app = new ARplacementAI();
    window.app.init();
});

// Service Worker for offline capability (basic implementation)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.log('ServiceWorker registration failed:', err);
    });
}