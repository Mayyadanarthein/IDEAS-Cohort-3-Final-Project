from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
import pickle
import re
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class NewsAnalyzer:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.sia = SentimentIntensityAnalyzer()
        self.subjects = ['Politics', 'Technology', 'Science', 'Entertainment']

        # Ensure NLTK data is downloaded
        try:
            nltk.data.find('sentiment/vader_lexicon.zip')
        except LookupError:
            nltk.download('vader_lexicon')

    def preprocess_text(self, text):
        """Clean and preprocess input text."""
        # Remove special characters and digits
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        # Convert to lowercase and strip
        text = text.lower().strip()
        return text

    def load_and_prepare_data(self):
        """Load and prepare training data."""
        try:
            data_dir = Path('data')
            fake_df = pd.read_csv(data_dir / 'Fake.csv')
            true_df = pd.read_csv(data_dir / 'True.csv')

            # Add labels
            fake_df['label'] = 0
            true_df['label'] = 1

            # Combine datasets
            df = pd.concat([fake_df, true_df], ignore_index=True)
            df['clean_text'] = df['text'].apply(self.preprocess_text)

            return df
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise

    def train_model(self):
        """Train the machine learning model."""
        try:
            logger.info("Starting model training...")
            df = self.load_and_prepare_data()

            # Create TF-IDF features
            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english'
            )
            X = self.vectorizer.fit_transform(df['clean_text'])
            y = df['label']

            # Train Random Forest model
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X, y)

            # Save model
            self.save_model()
            logger.info("Model training completed successfully")
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            raise

    def save_model(self):
        """Save trained model and vectorizer."""
        try:
            model_dir = Path('models')
            model_dir.mkdir(exist_ok=True)

            with open(model_dir / 'news_analyzer_model.pkl', 'wb') as f:
                pickle.dump((self.model, self.vectorizer), f)
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise

    def load_model(self):
        """Load trained model and vectorizer."""
        try:
            model_path = Path('models/news_analyzer_model.pkl')
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    self.model, self.vectorizer = pickle.load(f)
                return True
            return False
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False

    def analyze_text(self, text):
        """Analyze input text and return credibility assessment."""
        try:
            if not self.model or not self.vectorizer:
                if not self.load_model():
                    self.train_model()

            # Preprocess input text
            cleaned_text = self.preprocess_text(text)

            # Get credibility prediction
            X = self.vectorizer.transform([cleaned_text])
            prediction = self.model.predict_proba(X)[0]
            credibility_score = prediction[1]  # Probability of being true

            # Get sentiment scores
            sentiment = self.sia.polarity_scores(text)
            sentiment_distribution = [
                max(sentiment['pos'], 0),
                max(sentiment['neu'], 0),
                max(sentiment['neg'], 0)
            ]

            # Generate subject distribution (simplified)
            # In a real application, you'd want a proper subject classifier
            subject_distribution = np.random.dirichlet(np.ones(4))

            return {
                'credibility_score': float(credibility_score),
                'sentiment_distribution': sentiment_distribution,
                'subject_distribution': subject_distribution.tolist(),
                'success': True
            }
        except Exception as e:
            logger.error(f"Error analyzing text: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

# Initialize analyzer
analyzer = NewsAnalyzer()

@app.route('/analyze', methods=['POST'])
def analyze_news():
    """API endpoint for news analysis."""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400

        text = data['text']
        if not text.strip():
            return jsonify({
                'success': False,
                'error': 'Empty text provided'
            }), 400

        result = analyzer.analyze_text(text)
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

if __name__ == "__main__":
    # Ensure model is loaded or trained before starting
    if not analyzer.load_model():
        analyzer.train_model()

    # Start server
    app.run(debug=True, port=5000)