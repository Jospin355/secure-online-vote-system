
// Navigation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeActiveLinks();
    initializeScrollSpy();
});

function initializeActiveLinks() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Handle index page
        if (currentPath === '/' || currentPath === '/index.html') {
            if (href === '#accueil' || href === 'index.html') {
                link.classList.add('active');
            }
        }
        
        // Handle other pages
        if (href && currentPath.includes(href.replace('../', '').replace('.html', ''))) {
            link.classList.add('active');
        }
    });
}

function initializeScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    if (sections.length === 0 || navLinks.length === 0) return;
    
    function updateActiveLink() {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Initial call
}
