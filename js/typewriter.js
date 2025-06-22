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

// Remove the old typewriter function and example usage if they exist.
// The file should now only contain the typeOnce function. 