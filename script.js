// Model and charts variables
let model = null;
let charts = {};

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

// Initialize TensorFlow.js model
async function loadModel() {
    try {
        console.log('Starting model loading...');
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        // AWS S3 URLs
        const modelUrl = 'https://model-backet.s3.us-east-2.amazonaws.com/model.json';

        // Load the model
        model = await tf.loadLayersModel(modelUrl);
        console.log('Model loaded successfully');
        model.summary();

        elements.analyzeBtn.disabled = false;
        showMessage('Ready to analyze!');
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Model loading failed. Please refresh and try again.');
        elements.analyzeBtn.disabled = true;
    }
}

// Text preprocessing
function preprocessText(text) {
    try {
        // Basic text cleaning
        text = text.toLowerCase();
        text = text.replace(/[^\w\s]/g, '');
        text = text.replace(/\s+/g, ' ').trim();

        // Create word array
        const words = text.split(' ');
        console.log('Processing text of', words.length, 'words');

        // Create fixed-size input vector (100 dimensions)
        const inputVector = new Array(100).fill(0);
        for (let i = 0; i < Math.min(words.length, 100); i++) {
            inputVector[i] = 1;
        }

        // Create and return tensor
        return tf.tensor2d([inputVector]);
    } catch (error) {
        console.error('Preprocessing error:', error);
        throw new Error('Text preprocessing failed');
    }
}

// Initialize charts
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

// News analysis function
async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    if (!text) {
        showError('Please enter some text to analyze');
        return;
    }

    try {
        if (!model) {
            throw new Error('Model not ready. Please wait and try again.');
        }

        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        // Preprocess and predict
        console.log('Processing input text...');
        const inputTensor = preprocessText(text);

        console.log('Running prediction...');
        const prediction = await model.predict(inputTensor).data();
        const credibilityScore = prediction[0];
        console.log('Prediction result:', credibilityScore);

        // Generate mock distributions based on credibility score
        const subjectDist = [
            0.3 + (Math.random() * 0.2),
            0.2 + (Math.random() * 0.2),
            0.25 + (Math.random() * 0.2),
            0.25 + (Math.random() * 0.2)
        ].map(v => v * credibilityScore);

        const sentimentDist = [
            0.4 + (Math.random() * 0.2),
            0.3 + (Math.random() * 0.2),
            0.3 + (Math.random() * 0.2)
        ].map(v => v * credibilityScore);

        // Display results
        displayResults({
            credibility_score: credibilityScore,
            subject_distribution: subjectDist,
            sentiment_distribution: sentimentDist
        });

        // Cleanup tensors
        tf.dispose(inputTensor);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
    } finally {
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.textContent = 'Analyze News';
    }
}

// Display results
function displayResults(data) {
    elements.resultsSection.classList.remove('hidden');

    // Update score
    const scorePercentage = (data.credibility_score * 100).toFixed(1);
    elements.scoreValue.textContent = scorePercentage;

    // Update charts
    charts.subject.data.datasets[0].data = data.subject_distribution;
    charts.sentiment.data.datasets[0].data = data.sentiment_distribution;

    charts.subject.update();
    charts.sentiment.update();

    // Smooth scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Theme handling
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    updateThemeIcon(isDarkMode);
    if (Object.keys(charts).length > 0) {
        updateChartsTheme();
    }
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

// Navigation handling
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

// Share functionality
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

// Notifications
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

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    loadModel();
    initializeTheme();
    initializeNavigation();
    initializeCharts();
    initializeSharing();

    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.analyzeBtn.addEventListener('click', analyzeNews);
});

//fetch from awss3
async function loadModel() {
    try {
        const modelUrl = 'https://your-bucket-name.s3.your-region.amazonaws.com/model.json';
        model = await tf.loadLayersModel(modelUrl);
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Error loading the analysis model. Please try again later.');
    }
}

