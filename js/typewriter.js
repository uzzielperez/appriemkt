const typewriter = (elementId, prompts, typeSpeed = 150, eraseSpeed = 100, delayBetweenPrompts = 2000) => {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
        console.error(`Element with id "${elementId}" not found.`);
        return;
    }

    let promptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const currentPrompt = prompts[promptIndex];
        if (isDeleting) {
            targetElement.textContent = currentPrompt.substring(0, charIndex - 1);
            charIndex--;
        } else {
            targetElement.textContent = currentPrompt.substring(0, charIndex + 1);
            charIndex++;
        }

        if (!isDeleting && charIndex === currentPrompt.length) {
            isDeleting = true;
            setTimeout(type, delayBetweenPrompts);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            promptIndex = (promptIndex + 1) % prompts.length;
            setTimeout(type, typeSpeed);
        } else {
            setTimeout(type, isDeleting ? eraseSpeed : typeSpeed);
        }
    }

    // Initialize with some default prompts if none are provided
    if (!prompts || prompts.length === 0) {
        prompts = [
            "What is the weather like today?",
            "Translate 'hello' to Spanish.",
            "What is the capital of France?"
        ];
    }
    type(); // Start the animation
};

// Example usage:
// typewriter('typewriter-prompt', ['Search for AI tools...', 'Find the latest news...', 'Ask a question...']); 