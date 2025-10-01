// Main Application Controller
class IoTDashboard {
    constructor() {
        this.currentTab = 'home';
        this.components = {
            home: new HomeComponent(),
            profile: new ProfileComponent(),
            sensors: new SensorsComponent(),
            history: new HistoryComponent()
        };
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadComponent(this.currentTab);
        this.startLiveUpdates();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update components
        document.querySelectorAll('.component').forEach(component => {
            component.classList.remove('active');
        });
        document.getElementById(`${tabName}-component`).classList.add('active');

        // Load component content
        this.currentTab = tabName;
        this.loadComponent(tabName);
    }

    loadComponent(tabName) {
        const component = this.components[tabName];
        if (component && typeof component.render === 'function') {
            component.render();
        }
    }

    startLiveUpdates() {
        // Update sensor data every 5 seconds
        setInterval(() => {
            if (this.currentTab === 'home') {
                this.components.home.fetchSensorData();
            }
        }, 2000);

        // Update timestamp every second
        setInterval(() => {
            this.updateLiveIndicator();
        }, 1000);
    }

    updateLiveIndicator() {
        const liveDot = document.querySelector('.live-dot');
        if (liveDot) {
            liveDot.style.animation = 'pulse 2s infinite';
        }
    }
}

// CSS Animation for live indicator
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { opacity: 0.8; }
        50% { opacity: 0.3; }
        100% { opacity: 0.8; }
    }
`;
document.head.appendChild(style);

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.iotDashboard = new IoTDashboard();
});

// Global event handlers
window.addEventListener('resize', () => {
    // Handle responsive updates
    if (window.iotDashboard && window.iotDashboard.components.home) {
        window.iotDashboard.components.home.handleResize();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IoTDashboard;
}
