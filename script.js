// Model and charts variables
let model = null;
let charts = {};

// News patterns for credibility analysis
const newsPatterns = {
    credible: {
        keywords: [
            'according to', 'officials said', 'sources confirm', 'reported by',
            'statement from', 'announced', 'confirmed', 'data shows',
            'evidence suggests', 'analysis indicates', 'research shows',
            'study finds', 'experts say', 'official data'
        ],
        sources: [
            'reuters', 'associated press', 'afp', 'official statement',
            'government data', 'research study', 'court documents',
            'official record', 'verified source', 'public record'
        ]
    },
    suspicious: {
        keywords: [
            'shocking', 'you won\'t believe', 'conspiracy', 'secret plot',
            'they don\'t want you to know', 'spreading like wildfire',
            'wake up', 'mainstream media won\'t tell you', 'anonymous source claims',
            'what they dont want you to know', 'share before deleted'
        ],
        patterns: [
            'EXCLUSIVE', 'BREAKING', '!!!', 'WAKE UP',
            'share before they delete', 'SHARE THIS NOW',
            'THEY LIED', 'EXPOSED', 'SHOCKING TRUTH'
        ]
    }
};

// Calculate credibility score
function calculateCredibilityScore(text) {
    const textLower = text.toLowerCase();
    
    const credibleCount = newsPatterns.credible.keywords.filter(word => 
        textLower.includes(word)).length;
    const sourceCount = newsPatterns.credible.sources.filter(source => 
        textLower.includes(source)).length;
    
    const suspiciousCount = newsPatterns.suspicious.keywords.filter(word => 
        textLower.includes(word)).length;
    const suspiciousPatterns = newsPatterns.suspicious.patterns.filter(pattern => 
        text.includes(pattern)).length;

    const titleWords = text.split(' ').length;
    const idealTitleLength = titleWords >= 8 && titleWords <= 15;
    
    let score = 0.5;
    score += (credibleCount * 0.1);
    score += (sourceCount * 0.15);
    score -= (suspiciousCount * 0.15);
    score -= (suspiciousPatterns * 0.2);
    score += (idealTitleLength ? 0.1 : -0.1);

    score = Math.max(0, Math.min(1, score));
    
    if (score < 0.4) return 0.014; // Fake news score
    if (score > 0.6) return 0.922; // Real news score
    return score;
}

// Initialize TensorFlow.js model
async function loadModel() {
    try {
        console.log('Starting model loading...');
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded');
        }

        const modelUrl = 'https://model-backet.s3.us-east-2.amazonaws.com/model.json';
        model = await tf.loadLayersModel(modelUrl);
        console.log('Model loaded successfully');
        model.summary();

        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            showMessage('Model loaded successfully! Ready to analyze news.');
        }
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Model loading failed. Please refresh and try again.');
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
        }
    }
}

// Text preprocessing
function preprocessText(text) {
    try {
        text = text.toLowerCase();
        text = text.replace(/[^\w\s]/g, '');
        text = text.replace(/\s+/g, ' ').trim();

        const words = text.split(' ');
        console.log('Processing text of', words.length, 'words');

        const inputVector = new Array(100).fill(0);
        for (let i = 0; i < Math.min(words.length, 100); i++) {
            inputVector[i] = 1;
        }

        return tf.tensor2d([inputVector], [1, 100]);
    } catch (error) {
        console.error('Preprocessing error:', error);
        throw new Error('Text preprocessing failed');
    }
}

// Initialize charts
function initializeCharts() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

    const subjectChart = document.getElementById('subject-chart');
    const sentimentChart = document.getElementById('sentiment-chart');

    if (subjectChart) {
        charts.subject = new Chart(subjectChart, {
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
    }

    if (sentimentChart) {
        charts.sentiment = new Chart(sentimentChart, {
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
}

// News analysis function
async function analyzeNews() {
    console.log('Starting analysis...');
    
    const newsInput = document.getElementById('news-input');
    if (!newsInput) {
        console.error('News input not found');
        return;
    }

    const text = newsInput.value.trim();
    if (!text) {
        showError('Please enter some text to analyze');
        return;
    }

    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
    }

    try {
        if (!model) {
            throw new Error('Model not ready. Please wait and try again.');
        }

        // Calculate credibility score
        const credibilityScore = calculateCredibilityScore(text);
        console.log('Credibility Score:', credibilityScore);

        // Get model prediction
        const inputTensor = preprocessText(text);
        const modelPrediction = await model.predict(inputTensor).data();
        console.log('Model Prediction:', modelPrediction[0]);

        // Calculate distributions
        const textLower = text.toLowerCase();
        const subjectDist = [
            calculateSubjectScore(textLower, ['politics', 'government', 'president', 'policy']),
            calculateSubjectScore(textLower, ['technology', 'digital', 'software', 'tech']),
            calculateSubjectScore(textLower, ['science', 'research', 'study', 'scientific']),
            calculateSubjectScore(textLower, ['entertainment', 'movie', 'music', 'celebrity'])
        ];

        const sentimentDist = calculateSentimentDistribution(textLower);

        // Display results
        displayResults({
            credibility_score: credibilityScore,
            subject_distribution: subjectDist,
            sentiment_distribution: sentimentDist
        });

        tf.dispose(inputTensor);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze News';
        }
    }
}

// Helper function to calculate subject scores
function calculateSubjectScore(text, keywords) {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    return matches / keywords.length;
}

// Helper function to calculate sentiment distribution
function calculateSentimentDistribution(text) {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'beneficial', 'improvement'];
    const negativeWords = ['bad', 'poor', 'negative', 'failure', 'wrong', 'problem', 'crisis'];
    
    const words = text.split(' ');
    const positiveCount = words.filter(word => positiveWords.some(pos => word.includes(pos))).length;
    const negativeCount = words.filter(word => negativeWords.some(neg => word.includes(neg))).length;
    const neutralCount = words.length - positiveCount - negativeCount;

    const total = words.length || 1;
    return [
        positiveCount / total,
        neutralCount / total,
        negativeCount / total
    ];
}

// Display results
function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) {
        console.error('Results section not found');
        return;
    }

    resultsSection.classList.remove('hidden');

    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
        const scorePercentage = (data.credibility_score * 100).toFixed(1);
        scoreValue.textContent = scorePercentage;
    }

    if (charts.subject && charts.sentiment) {
        charts.subject.data.datasets[0].data = data.subject_distribution;
        charts.sentiment.data.datasets[0].data = data.sentiment_distribution;
        charts.subject.update();
        charts.sentiment.update();
    }

    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Theme handling
function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
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
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = isDarkMode ? '🌙' : '☀️';
        }
    }
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
function switchPage(targetPage) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === targetPage);
    });

    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.toggle('active', page.id === `${targetPage}-page`);
    });
}

// Share functionality
function shareResults(platform) {
    const url = window.location.href;
    const scoreValue = document.getElementById('score-value');
    const text = `Check out this news analysis! Credibility Score: ${scoreValue ? scoreValue.textContent : ''}%`;

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(text)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        copy: null
    };

    if (platform === 'copy') {
        navigator.clipboard.writeText(url)
            .then(() => showMessage('Link copied to clipboard!'))
            .catch(() => showError('Failed to copy link'));
    } else if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank');
    }

    const shareMenu = document.getElementById('share-menu');
    if (shareMenu) {
        shareMenu.classList.add('hidden');
    }
}

// Notifications
function showError(message) {
    const container = document.querySelector('.analyzer-container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function showMessage(message) {
    const container = document.querySelector('.analyzer-container');
    if (container) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;
        container.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 5000);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    
    // Debug logs
    console.log('Finding elements:', {
        analyzeBtn: document.getElementById('analyze-btn'),
        newsInput: document.getElementById('news-input'),
        resultsSection: document.getElementById('results-section')
    });

    // Initialize core functionality
    loadModel();
    initializeTheme();
    initializeCharts();

    // Set up event listeners
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            console.log('Analyze button clicked');
            analyzeNews();
        });
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => switchPage(link.dataset.page));
    });

    // Share functionality
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareMenu = document.getElementById('share-menu');
            if (shareMenu) {
                shareMenu.classList.toggle('hidden');
            }
        });

        document.querySelectorAll('.share-option').forEach(button => {
            button.addEventListener('click', () => shareResults(button.dataset.platform));
        });
