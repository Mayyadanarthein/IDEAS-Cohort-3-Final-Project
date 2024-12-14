const PRESENTATION_SECTIONS = {
    keyFindings: {
        title: 'Key Findings',
        content: [
            {
                subtitle: 'Language Patterns in News',
                text: 'Our analysis revealed distinct patterns between fake and real news:',
                points: [
                    'Fake news tends to use more speculative language and informal words',
                    'Real news employs more factual and definitive language with proper sourcing',
                    'Article length and title complexity vary significantly between real and fake news'
                ]
            },
            {
                subtitle: 'AI Model Performance',
                text: 'Our machine learning model achieved:',
                points: [
                    '99.8% accuracy after training on a balanced dataset of 10,000 articles',
                    'Efficient processing requiring only 3 epochs for training',
                    'Parallel analysis of both source credibility and content patterns'
                ]
            }
        ]
    },
    resources: {
        title: 'Project Resources',
        links: [
            { title: 'Presentation', url: 'https://drive.google.com/file/d/1j0tHh5W9_RflBFsVOyybSXCSAPceHOLB/view?usp=sharing' },
            { title: 'Data Analysis', url: 'https://github.com/sevanmeroian/data-analysis-ideas' },
            { title: 'Dataset', url: 'https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset/data?select=Fake.csv' }
        ]
    },
    futureDevelopment: {
        title: 'Future Development',
        text: "We're working on improving our model with enhanced tokenization using BERT and expanding our dataset for real-time verification capabilities. Our goal is to develop a comprehensive solution for rapid and accurate news credibility assessment."
    }
};

function createSectionHTML(section) {
    return `
        <div class="about-section ${section.title.toLowerCase().replace(/\s+/g, '-')}">
            <h2>${section.title}</h2>
            ${section.content ? createContentHTML(section.content) : ''}
            ${section.links ? createLinksHTML(section.links) : ''}
            ${section.text ? `<p>${section.text}</p>` : ''}
        </div>
    `;
}

function createContentHTML(content) {
    return content.map(item => `
        <div class="content-block">
            <h3>${item.subtitle}</h3>
            <p>${item.text}</p>
            <ul>
                ${item.points.map(point => `<li>${point}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

function createLinksHTML(links) {
    return `
        <div class="resource-links">
            ${links.map(link => `
                <a href="${link.url}" class="resource-link" target="_blank">
                    ${link.title}
                    <i class="fas fa-external-link-alt"></i>
                </a>
            `).join('')}
        </div>
    `;
}

function initializeAboutPage() {
    const aboutContainer = document.querySelector('.about-container');
    if (!aboutContainer) return;


    const teamSection = aboutContainer.querySelector('h3');
    const aboutContent = document.createElement('div');
    aboutContent.className = 'about-content';

    // Add each section
    Object.values(PRESENTATION_SECTIONS).forEach(section => {
        aboutContent.innerHTML += createSectionHTML(section);
    });

    teamSection.parentNode.insertBefore(aboutContent, teamSection);
}


export { initializeAboutPage };