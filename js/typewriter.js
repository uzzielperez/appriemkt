class TypeWriter {
    constructor(elementId, phrases, options = {}) {
        this.element = document.getElementById(elementId);
        this.phrases = phrases;
        this.currentPhrase = 0;
        this.currentChar = 0;
        this.typeSpeed = options.typeSpeed || 100;
        this.eraseSpeed = options.eraseSpeed || 50;
        this.delayBeforeErase = options.delayBeforeErase || 2000;
        this.delayBeforeType = options.delayBeforeType || 500;
        this.isDeleting = false;
        if (!this.element) {
            console.error(`Element with id "${elementId}" not found`);
            return;
        }
        this.element.textContent = '';
        this.type();
    }

    type() {
        const currentText = this.phrases[this.currentPhrase];
        
        if (this.isDeleting) {
            // Removing characters
            this.currentChar--;
            this.element.textContent = currentText.substring(0, this.currentChar);
            
            if (this.currentChar === 0) {
                this.isDeleting = false;
                this.currentPhrase = (this.currentPhrase + 1) % this.phrases.length;
                setTimeout(() => this.type(), this.delayBeforeType);
                return;
            }
        } else {
            // Adding characters
            this.currentChar++;
            this.element.textContent = currentText.substring(0, this.currentChar);
            
            if (this.currentChar === currentText.length) {
                this.isDeleting = true;
                setTimeout(() => this.type(), this.delayBeforeErase);
                return;
            }
        }

        setTimeout(() => this.type(), this.isDeleting ? this.eraseSpeed : this.typeSpeed);
    }
}

// Initialize the typewriter when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    const phrases = [
        "Augmented-healthcare intelligence",
        "Patient-centered",
        "Combining Real-world evidence with pharmaceutical data"
    ];
    
    new TypeWriter('animated-masthead-heading', phrases, {
        typeSpeed: 100,
        eraseSpeed: 50,
        delayBeforeErase: 2000,
        delayBeforeType: 500
    });
}); 