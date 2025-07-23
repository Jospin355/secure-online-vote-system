
// FAQ JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeFAQ();
});

function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            question.addEventListener('click', function() {
                toggleFAQItem(item);
            });
        }
    });
}

function toggleFAQItem(item) {
    const isActive = item.classList.contains('active');
    const answer = item.querySelector('.faq-answer');
    
    // Close all other FAQ items
    document.querySelectorAll('.faq-item.active').forEach(activeItem => {
        if (activeItem !== item) {
            activeItem.classList.remove('active');
            const activeAnswer = activeItem.querySelector('.faq-answer');
            activeAnswer.style.maxHeight = '0px';
        }
    });
    
    // Toggle current item
    if (isActive) {
        item.classList.remove('active');
        answer.style.maxHeight = '0px';
    } else {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
    }
}

// Auto-expand FAQ based on URL hash
document.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#faq-')) {
        const faqIndex = parseInt(hash.replace('#faq-', '')) - 1;
        const faqItems = document.querySelectorAll('.faq-item');
        
        if (faqItems[faqIndex]) {
            setTimeout(() => {
                toggleFAQItem(faqItems[faqIndex]);
                faqItems[faqIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }
});
