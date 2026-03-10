let currentIndex = 0;
const track = document.getElementById('sliderTrack');
const slides = document.querySelectorAll('.slide');

function moveSlider() {
    if (slides.length <= 3) return;
    currentIndex++;
    if (currentIndex > slides.length - 3) {
        currentIndex = 0;
    }
    const slideWidth = slides[0].offsetWidth + 20; 
    track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
}

setInterval(moveSlider, 3000);

function openAuthModal() {
    const modal = document.getElementById('authModal');
    const input = document.getElementById('authInput');
    modal.style.display = 'block';
    input.focus();
}

function checkPassword() {
    const passwordInput = document.getElementById('authInput').value;
    if (passwordInput === "budget") {
        window.location.href = "/budget";
    } else {
        alert("DENIED");
    }
}