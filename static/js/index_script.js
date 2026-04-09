const track = document.getElementById('sliderTrack');
const slider = document.getElementById('sliderContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const slides = document.querySelectorAll('.slide');

let currentIndex = 0;
let autoplayInterval;

function updateSlider() {
    if (slides.length === 0) return;
    const slideWidth = slides[0].offsetWidth + 20;
    track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    updateButtonStates();
}

function nextSlide() {
    if (currentIndex < slides.length - 3) {
        currentIndex++;
    } else {
        currentIndex = 0;
    }
    updateSlider();
    resetAutoplay();
}

function prevSlide() {
    if (currentIndex > 0) {
        currentIndex--;
    } else {
        currentIndex = Math.max(0, slides.length - 3);
    }
    updateSlider();
    resetAutoplay();
}

function updateButtonStates() {
    if (slides.length <= 3) {
        prevBtn?.classList.add('disabled');
        nextBtn?.classList.add('disabled');
    }
}

function startAutoplay() {
    autoplayInterval = setInterval(nextSlide, 2500);
}

function resetAutoplay() {
    clearInterval(autoplayInterval);
    startAutoplay();
}

prevBtn?.addEventListener('click', prevSlide);
nextBtn?.addEventListener('click', nextSlide);

slider?.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
slider?.addEventListener('mouseleave', startAutoplay);

updateSlider();
if (slides.length > 3) {
    startAutoplay();
}

window.addEventListener('resize', updateSlider);

function openAuthModal() {
    const modal = document.getElementById('authModal');
    const input = document.getElementById('authInput');
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => input?.focus(), 100);
    }
}

function checkPassword() {
    const passwordInput = document.getElementById('authInput').value;
    if (passwordInput === "budget") {
        window.location.href = "/budget";
    } else {
        const input = document.getElementById('authInput');
        input.style.borderColor = '#ff4757';
        input.value = '';
        input.placeholder = '❌ Incorrect password';
        setTimeout(() => {
            input.placeholder = '••••••••';
            input.style.borderColor = '';
        }, 2000);
    }
}

document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') {
        e.target.style.display = 'none';
    }
});

document.getElementById('authInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

document.getElementById('scrollBtn')?.addEventListener('click', () => {
    document.querySelector('.winners-section').scrollIntoView({ behavior: 'smooth' });
});