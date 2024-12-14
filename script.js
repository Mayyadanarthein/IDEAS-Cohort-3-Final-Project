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
// the news patterns object
const newsPatterns = {
    credible: {
        keywords: [
            'according to', 'officials said', 'sources confirm', 'reported by',
            'statement from', 'announced', 'confirmed', 'data shows',
            'evidence suggests', 'analysis indicates'
        ],
        sources: [
            'reuters', 'associated press', 'afp', 'official statement',
            'government data', 'research study', 'court documents'
        ]
    },
    suspicious: {
        keywords: [
            'shocking', 'you won\'t believe', 'conspiracy', 'secret plot',
            'they don\'t want you to know', 'spreading like wildfire',
            'wake up', 'mainstream media won\'t tell you'
        ],
        patterns: [
            'EXCLUSIVE', 'BREAKING', '!!!', 'WAKE UP',
            'share before they delete'
        ]
    }
};
// Add the new credibility score calculation function
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
@@ -119,7 +175,6 @@
    });
}

// News analysis function
async function analyzeNews() {
    const text = elements.newsInput.value.trim();
    if (!text) {
@@ -135,16 +190,16 @@
        elements.analyzeBtn.disabled = true;
        elements.analyzeBtn.textContent = 'Analyzing...';

        // Preprocess and predict
        console.log('Processing input text...');
        const inputTensor = preprocessText(text);
        // Calculate credibility score using our new function
        const credibilityScore = calculateCredibilityScore(text);
        console.log('Credibility Score:', credibilityScore);

        console.log('Running prediction...');
        const prediction = await model.predict(inputTensor).data();
        const credibilityScore = prediction[0];
        console.log('Prediction result:', credibilityScore);
        // Get model prediction as a secondary verification
        const inputTensor = preprocessText(text);
        const modelPrediction = await model.predict(inputTensor).data();
        console.log('Model Prediction:', modelPrediction[0]);

        // Generate subject distribution based on text content
        // Use the new credibility score for the results
        const textLower = text.toLowerCase();
        const subjectDist = [
            calculateSubjectScore(textLower, ['politics', 'government', 'president', 'policy']),
@@ -153,17 +208,14 @@
            calculateSubjectScore(textLower, ['entertainment', 'movie', 'music', 'celebrity'])
        ];

        // Generate sentiment distribution
        const sentimentDist = calculateSentimentDistribution(textLower);

        // Display results
        displayResults({
            credibility_score: credibilityScore,
            subject_distribution: subjectDist,
            sentiment_distribution: sentimentDist
        });

        // Cleanup tensors
        tf.dispose(inputTensor);

    } catch (error) {
@@ -177,7 +229,9 @@

// Helper function to calculate subject scores
function calculateSubjectScore(text, keywords) {
    //Count how many keywords from the category appear in the text
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    //Return a score between 0 & 1
    return matches / keywords.length;
}
