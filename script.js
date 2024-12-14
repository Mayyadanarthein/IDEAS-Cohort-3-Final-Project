// Global variables
let model = null;
let charts = {};
let isModelLoaded = false;

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

// AWS S3 Configuration
const AWS_CONFIG = {
    modelUrl: 'https://model-backet.s3.us-east-2.amazonaws.com/model.json',
    weightsUrl: 'https://model-backet.s3.us-east-2.amazonaws.com/weights.bin'
};

// Model Loading
async function loadModel() {
    try {
        console.log('Loading model from AWS S3...');
        model = await tf.loadLayersModel(AWS_CONFIG.modelUrl);

        // Load weights if separate
        const weightsResponse = await fetch(AWS_CONFIG.weightsUrl);
        if (weightsResponse.ok) {
            const weightsArrayBuffer = await weightsResponse.arrayBuffer();
            const weights = new Float32Array(weightsArrayBuffer);
            await model.loadWeights(weights);
        }

        console.log('Model loaded successfully');
        isModelLoaded = true;
        elements.analyzeBtn.disabled = false;
        showMessage('Ready to analyze news!');
    } catch (error) {
        console.error('Model loading error:', error);
        showError('Unable to load analysis model. Using fallback analysis.');
        // Enable button anyway to use fallback analysis
        elements.analyzeBtn.disabled = false;
    }
}

// Text preprocessing
function preprocessText(text) {
    // Basic text cleaning
    text = text.toLowerCase();
    text = text.replace(/[^\w\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();

    // Convert to word array
    const words = text.split(' ');

    // Create fixed-size input vector (100 dimensions)
    const maxLength = 100;
    const inputVector = new Array(maxLength).fill(0);

    // Fill vector with word information
    words.slice(0, maxLength).forEach((_, index) => {
        inputVector[index] = 1;
    });

    return tf.tensor2d([inputVector]);
}
// Helper functions for analysis
function calculateWordCount(text) {
    return text.toLowerCase().split(/\s+/).filter(word => word.length > 0).length;
}

function calculateSentiment(text) {
    // Simple sentiment analysis based on word patterns
    const positiveWords = ['success', 'good', 'great', 'win', 'winning', 'support', 'backed', 'free', 'freed', 'help'];
    const negativeWords = ['fake', 'false', 'wrong', 'trapped', 'demands', 'against', 'failed', 'attack', 'conflict'];

    const words = text.toLowerCase().split(/\s+/);
    let sentiment = 0;

    words.forEach(word => {
        if (positiveWords.includes(word)) sentiment += 1;
        if (negativeWords.includes(word)) sentiment -= 1;
    });

    return sentiment / words.length; // Normalize by text length
}

function analyzeSubject(text) {
    const subjects = {
        politics: ['trump', 'gop', 'democrat', 'senator', 'election', 'candidate', 'vote', 'political'],
        world: ['syria', 'france', 'islamic', 'international', 'foreign', 'global', 'world'],
        technology: ['tech', 'cyber', 'digital', 'internet', 'software', 'online', 'AI'],
        health: ['health', 'medical', 'disease', 'treatment', 'doctor', 'hospital', 'vaccine']
    };

    const words = text.toLowerCase().split(/\s+/);
    let counts = { politics: 0, world: 0, technology: 0, health: 0 };

    words.forEach(word => {
        for (let [subject, keywords] of Object.entries(subjects)) {
            if (keywords.some(keyword => word.includes(keyword))) {
                counts[subject]++;
            }
        }
    });

    // Convert to percentages
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.values(counts).map(count => count / total);
}

async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    if (!text) {
        showError('Please enter news text to analyze');
        return;
    }

    try {
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        // Calculate various metrics
        const wordCount = calculateWordCount(text);
        const sentiment = calculateSentiment(text);
        const subjectDist = analyzeSubject(text);

        // Credibility factors
        let credibilityScore = 0.5; // Base score

        // Word count factor (penalize very short or very long articles)
        const idealLength = 500;
        const lengthFactor = Math.min(1, Math.exp(-Math.pow(wordCount - idealLength, 2) / 200000));
        credibilityScore += lengthFactor * 0.2;

        // Sentiment factor (extreme sentiment might indicate bias)
        const sentimentFactor = 1 - Math.abs(sentiment);
        credibilityScore += sentimentFactor * 0.2;

        // Subject clarity factor (clear topic focus might indicate legitimacy)
        const maxSubject = Math.max(...subjectDist);
        credibilityScore += maxSubject * 0.1;

        // Caps lock and punctuation analysis
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > 0.3) credibilityScore -= 0.1;

        // Excessive punctuation check
        const exclamationRatio = (text.match(/!/g) || []).length / text.length;
        if (exclamationRatio > 0.01) credibilityScore -= 0.1;

        // Ensure score is between 0 and 1
        credibilityScore = Math.max(0, Math.min(1, credibilityScore));

        // Calculate sentiment distribution
        const sentimentDist = [
            Math.max(0, sentiment), // Positive
            1 - Math.abs(sentiment), // Neutral
            Math.max(0, -sentiment)  // Negative
        ].map(v => Math.abs(v));

        // Normalize sentiment distribution
        const sentimentSum = sentimentDist.reduce((a, b) => a + b, 0);
        const normalizedSentiment = sentimentDist.map(v => v / sentimentSum);

        displayResults({
            credibility_score: credibilityScore,
            subject_distribution: subjectDist,
            sentiment_distribution: normalizedSentiment
        });

    } catch (error) {
        console.error('Analysis error:', error);
        showError('Analysis error occurred. Please try again.');
    } finally {
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.textContent = 'Analyze News';
    }
}

// Fallback analysis when model isn't available
function performFallbackAnalysis(text) {
    // Simple heuristics for fallback analysis
    const wordCount = text.split(' ').length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgWordLength = text.length / wordCount;

    // Calculate mock credibility based on basic metrics
    let credibility = 0.7; // Base credibility
    credibility += wordCount > 100 ? 0.1 : 0;
    credibility += sentenceCount > 5 ? 0.1 : 0;
    credibility += avgWordLength > 4 ? 0.1 : 0;
    credibility = Math.min(credibility, 1);

    return {
        credibility_score: credibility,
        subject_distribution: [0.4, 0.3, 0.2, 0.1],
        sentiment_distribution: [0.5, 0.3, 0.2]
    };
}

// Initialize charts
function initializeCharts() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

    charts.subject = new Chart(document.getElementById('subject-chart'), {
        type: 'bar',
        data: {
            labels: ['Politics', 'Technology', 'Science', 'Entertainment'],
            datasets: [{
                label: 'Subject Distribution',
                data: [0.25, 0.25, 0.25, 0.25],
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

    charts.sentiment = new Chart(document.getElementById('sentiment-chart'), {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [0.33, 0.33, 0.34],
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

// Display results
function displayResults(results) {
    elements.resultsSection.classList.remove('hidden');

    const scorePercentage = (results.credibility_score * 100).toFixed(1);
    elements.scoreValue.textContent = scorePercentage;

    charts.subject.data.datasets[0].data = results.subject_distribution;
    charts.subject.update();

    charts.sentiment.data.datasets[0].data = results.sentiment_distribution;
    charts.sentiment.update();

    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Theme handling
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
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

function updateChartsTheme() {
    const textColor = document.body.classList.contains('dark-mode') ? '#f8fafc' : '#1e293b';

    Object.values(charts).forEach(chart => {
        if (chart.config.type === 'bar') {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
        }
        chart.options.plugins.legend.labels.color = textColor;
        chart.update();
    });
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

// Share functionality
function initializeSharing() {
    elements.shareBtn?.addEventListener('click', () => {
        elements.shareMenu?.classList.toggle('hidden');
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

    elements.shareMenu?.classList.add('hidden');
}

// Notification functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    errorDiv.style.marginTop = '10px';
    document.querySelector('.analyzer-container').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.color = 'green';
    messageDiv.style.padding = '10px';
    messageDiv.style.marginTop = '10px';
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

    // Event listeners
    elements.themeToggle?.addEventListener('click', toggleTheme);
    elements.analyzeBtn?.addEventListener('click', analyzeNews);
    elements.newsInput?.addEventListener('input', () => {
        elements.analyzeBtn.disabled = !elements.newsInput.value.trim();
    });
});
