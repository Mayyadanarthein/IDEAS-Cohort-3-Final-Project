// Global variables
let model = null;
let charts = {};
let isModelLoaded = false;

// AWS S3 Configuration
const AWS_CONFIG = {
    modelUrl: 'https://model-backet.s3.us-east-2.amazonaws.com/model.json',
    weightsUrl: 'https://model-backet.s3.us-east-2.amazonaws.com/weights.bin'
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    navLinks: document.querySelectorAll('.nav-link'),
    analyzeBtn: document.getElementById('analyze-btn'),
    newsInput: document.getElementById('news-input'),
    resultsSection: document.getElementById('results-section'),
    scoreValue: document.getElementById('score-value'),
    shareBtn: document.getElementById('share-btn'),
    shareMenu: document.getElementById('share-menu'),
    pages: {
        analyzer: document.getElementById('analyzer-page'),
        about: document.getElementById('about-page')
    }
};

// Model Loading and Analysis Functions
async function loadModel() {
    try {
        console.log('Loading model from AWS S3...');
        
        // Load model architecture and weights
        model = await tf.loadLayersModel(AWS_CONFIG.modelUrl);
        console.log('Model architecture loaded');

        // Load weights
        const weightsResponse = await fetch(AWS_CONFIG.weightsUrl);
        if (!weightsResponse.ok) {
            throw new Error('Failed to fetch weights');
        }
        const weightsArrayBuffer = await weightsResponse.arrayBuffer();
        const weights = new Float32Array(weightsArrayBuffer);
        
        // Set weights to model
        await model.loadWeights(weights);
        
        console.log('Model weights loaded successfully');
        isModelLoaded = true;
        elements.analyzeBtn.disabled = false;
        showMessage('Model ready for analysis!');
        
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Failed to load analysis model. Please refresh and try again.');
        elements.analyzeBtn.disabled = true;
    }
}

async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    
    if (!text) {
        showError('Please enter news text to analyze');
        return;
    }
    
    if (!isModelLoaded) {
        showError('Model is not ready. Please wait and try again.');
        return;
    }

    try {
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        // Preprocess and analyze
        const inputTensor = preprocessText(text);
        const predictions = await model.predict(inputTensor).data();
        
        // Process predictions
        const results = processModelPredictions(predictions);
        
        // Display results
        displayResults(results);

        // Cleanup
        tf.dispose(inputTensor);

    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze news. Please try again.');
    } finally {
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.textContent = 'Analyze News';
    }
}

function preprocessText(text) {
    try {
        // Text cleaning
        text = text.toLowerCase();
        text = text.replace(/[^\w\s]/g, '');
        text = text.replace(/\s+/g, ' ').trim();

        // Tokenization
        const words = text.split(' ');
        const maxLength = 100; // Adjust based on your model's input size
        
        // Create input vector
        const inputVector = new Array(maxLength).fill(0);
        words.slice(0, maxLength).forEach((_, index) => {
            inputVector[index] = 1;
        });

        return tf.tensor2d([inputVector]);
    } catch (error) {
        console.error('Preprocessing error:', error);
        throw new Error('Failed to process text input');
    }
}

function processModelPredictions(predictions) {
    // Extract credibility score (first output)
    const credibilityScore = Math.min(Math.max(predictions[0], 0), 1);
    
    // Extract subject distribution (next 4 outputs)
    const subjectDist = predictions.slice(1, 5).map(p => Math.max(0, Math.min(p, 1)));
    
    // Extract sentiment distribution (last 3 outputs)
    const sentimentDist = predictions.slice(5, 8).map(p => Math.max(0, Math.min(p, 1)));
    
    return {
        credibility_score: credibilityScore,
        subject_distribution: subjectDist,
        sentiment_distribution: sentimentDist
    };
}

// Chart Functions
function initializeCharts() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

    // Subject distribution chart
    charts.subject = new Chart(document.getElementById('subject-chart'), {
        type: 'bar',
        data: {
            labels: ['Politics', 'Technology', 'Science', 'Entertainment'],
            datasets: [{
                label: 'Subject Distribution',
                data: [0, 0, 0, 0],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor }
                },
                x: {
                    ticks: { color: textColor }
                }
            }
        }
    });

    // Sentiment chart
    charts.sentiment = new Chart(document.getElementById('sentiment-chart'), {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#22c55e', '#64748b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                }
            }
        }
    });
}

function updateChartsTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

    Object.values(charts).forEach(chart => {
        if (chart.config.type === 'bar') {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
        }
        chart.options.plugins.legend.labels.color = textColor;
        chart.update();
    });
}

// Results Display
function displayResults(results) {
    elements.resultsSection.classList.remove('hidden');
    
    // Update credibility score
    const scorePercentage = (results.credibility_score * 100).toFixed(1);
    elements.scoreValue.textContent = scorePercentage;
    
    // Update charts
    charts.subject.data.datasets[0].data = results.subject_distribution;
    charts.subject.update();
    
    charts.sentiment.data.datasets[0].data = results.sentiment_distribution;
    charts.sentiment.update();
    
    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Theme Handling
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    updateThemeIcon(isDarkMode);
}

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    updateThemeIcon(isDarkMode);
    updateChartsTheme();
}

function updateThemeIcon(isDarkMode) {
    elements.themeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '🌙' : '☀️';
}

// Navigation
function initializeNavigation() {
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetPage = link.dataset.page;
            switchPage(targetPage);
        });
    });
}

function switchPage(targetPage) {
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === targetPage);
    });

    Object.entries(elements.pages).forEach(([page, element]) => {
        element.classList.toggle('active', page === targetPage);
    });
}

// Share Functionality
function initializeSharing() {
    elements.shareBtn.addEventListener('click', () => {
        elements.shareMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.share-option').forEach(button => {
        button.addEventListener('click', () => shareResults(button.dataset.platform));
    });
}

function shareResults(platform) {
    const url = window.location.href;
    const text = `Check out this news analysis! Credibility Score: ${elements.scoreValue.textContent}%`;

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(text)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        copy: null
    };

    if (platform === 'copy') {
        navigator.clipboard.writeText(url)
            .then(() => showMessage('Link copied to clipboard!'))
            .catch(() => showError('Failed to copy link'));
    } else {
        window.open(shareUrls[platform], '_blank');
    }

    elements.shareMenu.classList.add('hidden');
}

// Notification Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.analyzer-container').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    document.querySelector('.analyzer-container').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    loadModel();
    initializeTheme();
    initializeNavigation();
    initializeCharts();
    initializeSharing();

    // Event listeners
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.analyzeBtn.addEventListener('click', analyzeNews);
    elements.newsInput.addEventListener('input', () => {
        elements.analyzeBtn.disabled = !elements.newsInput.value.trim() || !isModelLoaded;
    });
});
