window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.hero, .why-section, .features-section, .how-it-works-section, .income-section, .reviews-section, .about-section, .auth-section');

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;


        const sectionTop = rect.top;
        const sectionBottom = rect.bottom;
        const sectionHeight = rect.height;


        if (sectionTop < windowHeight && sectionTop > windowHeight * 0.7) {
            const progress = (windowHeight - sectionTop) / (windowHeight * 0.3);
            const blur = Math.max(0, (1 - progress) * 8);
            const opacity = Math.max(0.5, progress);

            section.style.opacity = opacity;
            section.style.filter = `blur(${blur}px)`;
        }

        else if (sectionBottom < windowHeight * 0.3 && sectionBottom > 0) {
            const progress = sectionBottom / (windowHeight * 0.3);
            const blur = Math.max(0, (1 - progress) * 8);
            const opacity = Math.max(0.5, progress);

            section.style.opacity = opacity;
            section.style.filter = `blur(${blur}px)`;
        }

        else if (sectionTop < windowHeight * 0.7 && sectionBottom > windowHeight * 0.3) {
            section.style.opacity = 1;
            section.style.filter = 'blur(0px)';
        }
    });
});