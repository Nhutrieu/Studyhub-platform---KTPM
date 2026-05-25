// /HeThongChamSocCaKoi/assets/js/customer/salt-expert-config.js
// Expert System Configuration File
// VERSION: V2.0 - ADDED SAFETY CAPS

const SaltExpertConfig = {
    // Safety Configuration
    SAFETY: {
        // Absolute limits (DO NOT CHANGE WITHOUT EXPERT APPROVAL)
        MAX_ABSOLUTE: 0.7,          // Maximum allowed salinity (0.7% = 7‰) - Ngưỡng an toàn sinh học
        WARNING_THRESHOLD: 0.3,     // Oxygen warning threshold
        CRITICAL_THRESHOLD: 0.5,    // Critical threshold (requires special approval)
        
        // [NEW V2] Emergency Limits
        LETHAL_LIMIT: 0.9,          // Ngưỡng tử vong (9‰) -> Kích hoạt chế độ Cấp Cứu
        INPUT_CAP: 5.0,             // Giới hạn nhập liệu (50‰) -> Chặn dữ liệu rác (Nước biển ~3.5%)

        // Step limits
        MAX_DELTA_PER_STEP: 0.2,    // Maximum increase per step
        MAX_WATER_CHANGE_NORMAL: 0.3,  // Maximum water change per step (normal)
        MAX_WATER_CHANGE_FRAGILE: 0.25, // Maximum water change per step (fragile)
        
        // Fragile object limits
        FRY_MAX: 0.15,              // Maximum for fry
        PLANTS_MAX: 0.10,           // Maximum for plants
        BOTH_MAX: 0.10,             // Maximum for both fry and plants
        
        // Time intervals (hours)
        MIN_INTERVAL_NORMAL: 12,    // Minimum interval between steps (normal)
        MIN_INTERVAL_FRAGILE: 24,   // Minimum interval between steps (fragile)
        MAX_INTERVAL: 48,           // Maximum interval (safety check)
    },
    
    // Environmental Factors
    ENVIRONMENT: {
        // Temperature adjustments
        TEMP_HOT_THRESHOLD: 30,     // °C - Hot temperature threshold
        TEMP_COLD_THRESHOLD: 18,    // °C - Cold temperature threshold
        TEMP_HOT_ADJUSTMENT: -0.1,  // -10% adjustment for hot water
        TEMP_COLD_ADJUSTMENT: -0.15, // -15% adjustment for cold water
        
        // Oxygen requirements
        OXYGEN_MIN_SAFE: 5.0,       // mg/L - Minimum safe oxygen level
        OXYGEN_WARNING: 3.0,        // mg/L - Oxygen warning level
        OXYGEN_CRITICAL: 2.0,       // mg/L - Critical oxygen level
        
        // Weather impacts
        RAIN_ADJUSTMENT: +0.05,     // +5% adjustment for rain (dilution)
        HEAT_WAVE_ADJUSTMENT: -0.1, // -10% adjustment for heat waves
    },
    
    // Calculation Parameters
    CALCULATION: {
        // Salt calculation constants
        SALT_PER_PERCENT: 10,       // 10g salt per liter per 1% salinity
        ACCURACY_THRESHOLD: 0.001,  // Calculation accuracy threshold
        
        // Water change formula
        USE_ADVANCED_FORMULA: true, // Use advanced formula considering source water
        MIN_WATER_CHANGE: 0.05,     // Minimum water change (5%)
        MAX_WATER_CHANGE: 0.5,      // Maximum water change (50%)
    },
    
    // Feedback Loop Configuration
    FEEDBACK: {
        // Measurement validation
        ACCEPTABLE_DEVIATION: 10,   // Acceptable deviation percentage
        WARNING_DEVIATION: 20,      // Warning deviation percentage
        CRITICAL_DEVIATION: 30,     // Critical deviation percentage
        
        // Auto-adjustment
        AUTO_ADJUST_ENABLED: true,  // Enable automatic adjustment based on feedback
        MAX_AUTO_ADJUSTMENT: 0.1,   // Maximum auto-adjustment (10%)
        MIN_SAMPLES_FOR_ADJUST: 3,  // Minimum samples before auto-adjustment
        
        // Learning parameters
        LEARNING_RATE: 0.1,         // Learning rate for AI adjustments
        MEMORY_DAYS: 30,            // Number of days to remember patterns
    },
    
    // UI/UX Configuration
    UI: {
        // Toast notifications
        TOAST_DURATION_INFO: 3000,
        TOAST_DURATION_WARNING: 5000,
        TOAST_DURATION_DANGER: 8000,
        MAX_TOASTS: 5,
        
        // Colors
        COLOR_SAFE: '#27ae60',
        COLOR_WARNING: '#f39c12',
        COLOR_DANGER: '#e74c3c',
        COLOR_INFO: '#3498db',
        COLOR_PRIMARY: '#009fe3',
        
        // Animations
        ANIMATION_DURATION: 300,
        TRANSITION_EASING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    
    // System Behavior
    SYSTEM: {
        // Auto-save
        AUTO_SAVE_INTERVAL: 30000,  // Auto-save interval in ms (30 seconds)
        DRAFT_ENABLED: true,        // Enable draft saving
        
        // Validation
        REAL_TIME_VALIDATION: true, // Enable real-time validation
        SERVER_VALIDATION: true,    // Enable server-side validation
        CLIENT_VALIDATION: true,    // Enable client-side validation
        
        // Performance
        CACHE_ENABLED: true,        // Enable caching
        CACHE_DURATION: 300000,     // Cache duration in ms (5 minutes)
        DEBOUNCE_DELAY: 300,        // Debounce delay for inputs
    },
    
    // API Configuration
    API: {
        ENDPOINTS: {
            CREATE_PLAN: '/HeThongChamSocCaKoi/backend/api/customer/salt/create_plan.php',
            GET_PLAN: '/HeThongChamSocCaKoi/backend/api/customer/salt/get_plan.php',
            LIST_PLANS: '/HeThongChamSocCaKoi/backend/api/customer/salt/list_plans.php',
            MARK_DONE: '/HeThongChamSocCaKoi/backend/api/customer/salt/mark_done.php',
            MARK_STEP_DONE: '/HeThongChamSocCaKoi/backend/api/customer/salt/mark_step_done.php',
            CANCEL_PLAN: '/HeThongChamSocCaKoi/backend/api/customer/salt/cancel_plan.php',
            DELETE_PLAN: '/HeThongChamSocCaKoi/backend/api/customer/salt/delete_plan.php',
        },
        
        // Request configuration
        TIMEOUT: 30000,             // Request timeout in ms
        RETRY_ATTEMPTS: 3,          // Number of retry attempts
        RETRY_DELAY: 1000,          // Delay between retries in ms
    },
    
    // Logging Configuration
    LOGGING: {
        ENABLED: true,
        LEVEL: 'warn',              // 'debug', 'info', 'warn', 'error'
        CONSOLE_OUTPUT: true,
        SERVER_LOGGING: false,
        SERVER_ENDPOINT: '/HeThongChamSocCaKoi/backend/api/customer/salt/log.php',
    },
    
    // Export configuration
    getSafetyLimits: function() {
        return this.SAFETY;
    },
    
    getEnvironmentConfig: function() {
        return this.ENVIRONMENT;
    },
    
    getFeedbackConfig: function() {
        return this.FEEDBACK;
    },
    
    validateConfig: function() {
        const errors = [];
        
        // Validate safety limits
        if (this.SAFETY.MAX_ABSOLUTE > 1.0) {
            errors.push('MAX_ABSOLUTE cannot exceed 1.0%');
        }
        
        if (this.SAFETY.MAX_DELTA_PER_STEP > 0.5) {
            errors.push('MAX_DELTA_PER_STEP cannot exceed 0.5%');
        }
        
        // Validate environmental thresholds
        if (this.ENVIRONMENT.TEMP_HOT_THRESHOLD <= this.ENVIRONMENT.TEMP_COLD_THRESHOLD) {
            errors.push('TEMP_HOT_THRESHOLD must be greater than TEMP_COLD_THRESHOLD');
        }
        
        if (this.ENVIRONMENT.OXYGEN_MIN_SAFE <= this.ENVIRONMENT.OXYGEN_CRITICAL) {
            errors.push('OXYGEN_MIN_SAFE must be greater than OXYGEN_CRITICAL');
        }
        
        // Validate feedback thresholds
        if (this.FEEDBACK.ACCEPTABLE_DEVIATION >= this.FEEDBACK.WARNING_DEVIATION) {
            errors.push('ACCEPTABLE_DEVIATION must be less than WARNING_DEVIATION');
        }
        
        if (this.FEEDBACK.WARNING_DEVIATION >= this.FEEDBACK.CRITICAL_DEVIATION) {
            errors.push('WARNING_DEVIATION must be less than CRITICAL_DEVIATION');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    // Method to update configuration (with validation)
    updateConfig: function(section, key, value) {
        if (this[section] && this[section][key] !== undefined) {
            const oldValue = this[section][key];
            this[section][key] = value;
            
            // Validate the update
            const validation = this.validateConfig();
            if (!validation.valid) {
                this[section][key] = oldValue; // Revert if invalid
                return {
                    success: false,
                    error: 'Configuration update failed validation',
                    details: validation.errors
                };
            }
            
            return {
                success: true,
                message: `Updated ${section}.${key} from ${oldValue} to ${value}`
            };
        }
        
        return {
            success: false,
            error: `Configuration key ${section}.${key} not found`
        };
    }
};

// Make configuration available globally
window.SaltExpertConfig = Object.freeze(SaltExpertConfig);

// Initialize configuration validation
document.addEventListener('DOMContentLoaded', function() {
    const validation = SaltExpertConfig.validateConfig();
    if (!validation.valid) {
        console.error('SaltExpertConfig validation failed:', validation.errors);
        
        // Show error to user in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #e74c3c;
                color: white;
                padding: 10px;
                border-radius: 5px;
                z-index: 99999;
                max-width: 400px;
                font-family: monospace;
                font-size: 12px;
            `;
            errorDiv.innerHTML = `
                <strong>SaltExpertConfig Error:</strong><br>
                ${validation.errors.join('<br>')}
            `;
            document.body.appendChild(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 10000);
        }
    } else {
        console.log('SaltExpertConfig validated successfully');
    }
});