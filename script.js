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
        model = await tf.loadLayersModel('model.json');
        elements.analyzeBtn.disabled = false;
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Failed to load model. Please refresh the page.');
    }
}

// Preprocess text for model input
function preprocessText(text) {
    // Convert to lowercase
    text = text.toLowerCase();

    // Remove special characters and extra spaces
    text = text.replace(/[^\w\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();

    // Create a fixed-size input vector (100 dimensions)
    const words = text.split(' ');
    const inputVector = new Array(100).fill(0);

    for (let i = 0; i < Math.min(words.length, 100); i++) {
        inputVector[i] = 1; // Replace with actual word embedding/encoding
    }

    return tf.tensor2d([inputVector]);
}

// Initialize charts with theme support
function initializeCharts() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

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
            plugins: {
                legend: {
                    display: false
                }
            },
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

// Update charts theme
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

// Analyze news function
async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    if (!text) {
        showError('Please enter some text to analyze');
        return;
    }

    try {
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        // Preprocess and predict
        const inputTensor = preprocessText(text);
        const prediction = await model.predict(inputTensor).data();
        const credibilityScore = prediction[0];

        // Display results
        displayResults({
            credibility_score: credibilityScore,
            subject_distribution: [0.3, 0.2, 0.3, 0.2], // Update with actual analysis
            sentiment_distribution: [0.4, 0.3, 0.3] // Update with actual analysis
        });

    } catch (error) {
        console.error('Analysis error:', error);
        showError('Failed to analyze text. Please try again.');
    } finally {
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.textContent = 'Analyze News';
    }
}

// Display results function
function displayResults(data) {
    elements.resultsSection.classList.remove('hidden');
    elements.scoreValue.textContent = (data.credibility_score * 100).toFixed(1);

    // Update charts
    charts.subject.data.datasets[0].data = data.subject_distribution;
    charts.sentiment.data.datasets[0].data = data.sentiment_distribution;

    charts.subject.update();
    charts.sentiment.update();

    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Theme handling
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    updateThemeIcon(isDarkMode);
    updateChartsTheme();
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
    const text = 'Check out this news analysis!';

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
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

// Error and message handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.analyzer-container').appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    document.querySelector('.analyzer-container').appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadModel();
    initializeTheme();
    initializeNavigation();
    initializeCharts();
    initializeSharing();

    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.analyzeBtn.addEventListener('click', analyzeNews);
});
