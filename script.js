// Global variables for holding the model, charts, and loading state
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

// Keywords and Patterns for Analysis
const SUBJECT_KEYWORDS = {
    politicsNews: [
        'trump', 'biden', 'election', 'vote', 'democrat', 'republican', 'senate',
        'congress', 'government', 'political', 'campaign', 'candidate', 'russia',
        'washington', 'president', 'legislation', 'conservative', 'liberal', 'korea',
        'parliament', 'minister', 'politics', 'policy', 'politician'
    ],
    worldNews: [
        'international', 'foreign', 'global', 'world', 'country',
        'nation', 'diplomatic', 'overseas', 'abroad', 'regional',
        'military', 'war', 'treaty', 'alliance', 'foreign policy',
        'UN', 'NATO', 'EU', 'summit', 'international', 'diplomatic'
    ],
    news: [
        'report', 'announced', 'statement', 'press', 'official',
        'investigation', 'development', 'update', 'current events',
        'breaking', 'latest', 'today', 'reports', 'coverage'
    ],
    healthNews: [
        'medical', 'healthcare', 'disease', 'treatment', 'wellness',
        'medicine', 'pandemic', 'doctors', 'hospital', 'research',
        'health', 'vaccine', 'patients', 'clinical', 'diagnosis',
        'symptoms', 'medical research', 'public health', 'therapy'
    ],
    economyNews: [
        'market', 'finance', 'business', 'stocks', 'trade',
        'inflation', 'banking', 'investment', 'GDP', 'economic',
        'economy', 'financial', 'recession', 'interest rates',
        'corporate', 'wall street', 'fiscal', 'monetary policy'
    ]
};

const CREDIBILITY_PATTERNS = {
    high: [
        'washington (reuters)',
        '(reuters)',
        'according to',
        'officials said',
        'sources confirmed',
        'experts say',
        'studies show',
        'research indicates'
    ],
    low: [
        'shocking',
        'you won\'t believe',
        'mind-blowing',
        'conspiracy',
        'controversial',
        'secret',
        'exposed',
        'anonymous sources claim'
    ]
};

const SENTIMENT_DICTIONARY = {
    positive: [
        // Official/Credible indicators
        'confirmed', 'announced', 'reported', 'stated', 'according to', 'officials say',
        'reuters', 'associated press', 'ap news', 'official', 'report', 'study',
        'research', 'evidence', 'experts', 'analysis', 'data', 'survey',
        'progress', 'success', 'achievement', 'improvement', 'growth', 'development'
    ],
    negative: [
        // Sensationalist and negative terms
        'shocking', 'disturbing', 'embarrassing', 'horrible', 'terrible',
        'outrageous', 'unbelievable', 'scandal', 'exposed', 'secret',
        'conspiracy', 'controversial', 'refuses', 'slams', 'disaster',
        'crisis', 'conflict', 'fail', 'failure', 'threat', 'danger'
    ],
    neutral: [
        // Factual reporting terms
        'says', 'said', 'announced', 'reported', 'stated', 'explained',
        'described', 'noted', 'mentioned', 'indicated', 'discussed',
        'today', 'yesterday', 'this week', 'this month', 'currently'
    ]
};

// Content Analysis Functions
function analyzeContent(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Calculate subject distributions
    const subjectScores = Object.entries(SUBJECT_KEYWORDS).map(([subject, keywords]) => {
        const matchCount = words.filter(word =>
            keywords.some(keyword => word.includes(keyword))
        ).length;
        return {
            subject,
            score: matchCount / wordCount
        };
    });

    // Normalize subject scores
    const totalScore = subjectScores.reduce((sum, {score}) => sum + score, 0) || 1;
    const normalizedSubjects = subjectScores.map(({subject, score}) => ({
        subject,
        score: score / totalScore
    }));

    const credibilityScore = calculateCredibilityScore(text);

    return {
        subjects: normalizedSubjects,
        credibility: credibilityScore,
        metrics: {
            wordCount,
            avgSentenceLength: calculateAvgSentenceLength(text),
            capsPercentage: calculateCapsPercentage(text)
        }
    };
}

function calculateCredibilityScore(text) {
    let score = 0.5; // Base score
    const lowerText = text.toLowerCase();

    // Word count factor
    const words = text.split(/\s+/);
    if (words.length < 50) {
        score -= 0.1; // Penalize very short articles
    } else if (words.length > 200) {
        score += 0.1; // Reward longer, more detailed articles
    }

    // Source credibility check
    const credibleSources = [
        'reuters', 'associated press', 'ap ', 'bloomberg',
        'afp', 'bbc', 'cnn', 'nyt', 'new york times',
        'washington post', 'wsj', 'wall street journal'
    ];
    for (const source of credibleSources) {
        if (lowerText.includes(source)) {
            score += 0.15;
            break; // Only count one major source
        }
    }

    // Check high credibility patterns with weighted importance
    const highCredibilityPatterns = {
        major: {
            patterns: [
                'according to official',
                'study published in',
                'research shows',
                'experts confirmed',
                'official statement'
            ],
            weight: 0.15
        },
        medium: {
            patterns: [
                'according to',
                'officials said',
                'researchers found',
                'data shows',
                'survey indicates'
            ],
            weight: 0.1
        },
        minor: {
            patterns: [
                'reports suggest',
                'sources say',
                'experts believe',
                'reportedly'
            ],
            weight: 0.05
        }
    };

    // Check high credibility patterns
    for (const [importance, { patterns, weight }] of Object.entries(highCredibilityPatterns)) {
        for (const pattern of patterns) {
            if (lowerText.includes(pattern)) {
                score += weight;
                break; // Only count one pattern per importance level
            }
        }
    }

    // Check low credibility patterns with weighted penalties
    const lowCredibilityPatterns = {
        major: {
            patterns: [
                'you won\'t believe',
                'shocking truth',
                'conspiracy',
                'they don\'t want you to know',
                'miracle'
            ],
            weight: -0.2
        },
        medium: {
            patterns: [
                'viral',
                'controversial',
                'anonymous sources claim',
                'shocking',
                'mind-blowing'
            ],
            weight: -0.15
        },
        minor: {
            patterns: [
                'may have',
                'could be',
                'some say',
                'people claim'
            ],
            weight: -0.1
        }
    };

    // Check low credibility patterns
    for (const [importance, { patterns, weight }] of Object.entries(lowCredibilityPatterns)) {
        for (const pattern of patterns) {
            if (lowerText.includes(pattern)) {
                score += weight;
                break; // Only count one pattern per importance level
            }
        }
    }

    // Style and structure analysis
    const styleChecks = {
        hasQuotes: (text.match(/["''].+["'']/g) || []).length > 0,
        hasNumbers: /\d+%|\d+\s*(million|billion|trillion)/i.test(text),
        hasDateOrTime: /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}/.test(text),
        hasCitations: /\([^)]+\)|\[[^\]]+\]/.test(text),
        properSentenceStructure: /^[A-Z][^.!?]+[.!?]/.test(text),
        hasExcessiveCaps: (text.match(/[A-Z]{2,}/g) || []).length > 3,
        hasExclamation: (text.match(/!/g) || []).length > 1
    };

    // Apply style scoring
    if (styleChecks.hasQuotes) score += 0.1;
    if (styleChecks.hasNumbers) score += 0.05;
    if (styleChecks.hasDateOrTime) score += 0.05;
    if (styleChecks.hasCitations) score += 0.1;
    if (styleChecks.properSentenceStructure) score += 0.05;
    if (styleChecks.hasExcessiveCaps) score -= 0.15;
    if (styleChecks.hasExclamation) score -= 0.1;

    // Language complexity analysis
    const complexWords = text.split(/\s+/).filter(word => word.length > 8).length;
    const complexityRatio = complexWords / words.length;
    if (complexityRatio > 0.2) score += 0.1;

    // Ensure score stays within bounds
    return Math.max(0, Math.min(1, score));
}

function calculateSentimentDistribution(text) {
    const words = text.toLowerCase().split(/\s+/);
    let positive = 0, negative = 0, neutral = 0;

    // Word-level sentiment analysis
    words.forEach(word => {
        if (SENTIMENT_DICTIONARY.positive.some(pos => word.includes(pos))) positive++;
        else if (SENTIMENT_DICTIONARY.negative.some(neg => word.includes(neg))) negative++;
        else if (SENTIMENT_DICTIONARY.neutral.some(neu => word.includes(neu))) neutral++;
    });

    // Context and phrase analysis
    const lowerText = text.toLowerCase();
    SENTIMENT_DICTIONARY.positive.forEach(phrase => {
        if (phrase.includes(' ') && lowerText.includes(phrase)) positive += 2;
    });
    SENTIMENT_DICTIONARY.negative.forEach(phrase => {
        if (phrase.includes(' ') && lowerText.includes(phrase)) negative += 2;
    });

    // Ensure minimum values
    positive = Math.max(1, positive);
    negative = Math.max(1, negative);
    neutral = Math.max(1, neutral);

    // Calculate distribution
    const total = positive + negative + neutral;
    return [
        positive / total,
        neutral / total,
        negative / total
    ];
}

function calculateAvgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const wordCount = sentences.reduce((count, sentence) =>
        count + sentence.trim().split(/\s+/).length, 0
    );
    return wordCount / sentences.length || 0;
}

function calculateCapsPercentage(text) {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    return capsCount / text.length || 0;
}

// Main Analysis Function
async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    if (!text) {
        showError('Please enter news text to analyze');
        return;
    }

    try {
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        const contentAnalysis = analyzeContent(text);
        const subjectDistribution = contentAnalysis.subjects.map(({score}) => score);
        const sentimentDist = calculateSentimentDistribution(text);

        const results = {
            credibility_score: contentAnalysis.credibility,
            subject_distribution: subjectDistribution,
            sentiment_distribution: sentimentDist
        };

        displayResults(results);

    } catch (error) {
        console.error('Analysis error:', error);
        showError('Analysis error occurred. Please try again.');
    } finally {
        elements.analyzeBtn.disabled = false;
        elements.analyzeBtn.textContent = 'Analyze News';
    }
}

// Charts Functions
function initializeCharts() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';

    charts.subject = new Chart(document.getElementById('subject-chart'), {
        type: 'bar',
        data: {
            labels: ['Politics News', 'World News', 'General News', 'Health News', 'Economy News'],
            datasets: [{
                label: 'Subject Distribution',
                data: [0, 0, 0, 0, 0],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
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

// Theme Functions
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

// Navigation Functions
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

// Share Functions
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

// Display Functions
function displayResults(results) {
    elements.resultsSection.classList.remove('hidden');

    const scorePercentage = (results.credibility_score * 100).toFixed(1);
    elements.scoreValue.textContent = scorePercentage;

    // Map the subject distribution to match the chart's label order
    const orderedSubjectData = [
        results.subject_distribution[0], // Politics
        results.subject_distribution[1], // World
        results.subject_distribution[2], // General
        results.subject_distribution[3], // Health
        results.subject_distribution[4]  // Economy
    ];

    charts.subject.data.datasets[0].data = orderedSubjectData;
    charts.subject.update();

    charts.sentiment.data.datasets[0].data = results.sentiment_distribution;
    charts.sentiment.update();

    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    document.querySelector('.analyzer-container').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.color = 'green';
    messageDiv.style.padding = '10px';
    document.querySelector('.analyzer-container').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
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
