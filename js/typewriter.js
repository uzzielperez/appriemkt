const typeOnce = (elementId, textToType, typeSpeed = 100) => {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
        console.error(`Element with id "${elementId}" not found.`);
        return;
    }

    let charIndex = 0;
    targetElement.textContent = ''; // Clear existing text

    function type() {
        if (charIndex < textToType.length) {
            targetElement.textContent += textToType.charAt(charIndex);
            charIndex++;
            setTimeout(type, typeSpeed);
        }
    }

    type(); // Start the animation
};

// Typewriter effect for cycling through multiple phrases
document.addEventListener('DOMContentLoaded', function() {
    const phrases = [
        "Patient-centered",
        "Augmented Healthcare Intelligence", 
        "Open-source",
        "Combining Real World Evidence with Pharmaceutical Data"
    ];
    
    const element = document.getElementById('animated-masthead-heading');
    if (!element) {
        console.error('Element with id "animated-masthead-heading" not found.');
        return;
    }
    
    let currentPhraseIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    
    function typeWriter() {
        const currentPhrase = phrases[currentPhraseIndex];
        
        if (isDeleting) {
            element.textContent = currentPhrase.substring(0, currentCharIndex - 1);
            currentCharIndex--;
            
            if (currentCharIndex === 0) {
                isDeleting = false;
                currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
                setTimeout(typeWriter, 500); // Pause before starting next phrase
                return;
            }
        } else {
            element.textContent = currentPhrase.substring(0, currentCharIndex + 1);
            currentCharIndex++;
            
            if (currentCharIndex === currentPhrase.length) {
                isDeleting = true;
                setTimeout(typeWriter, 2000); // Pause at end of phrase
                return;
            }
        }
        
        const speed = isDeleting ? 50 : 100;
        setTimeout(typeWriter, speed);
    }
    
    // Start the animation
    typeWriter();
}); 