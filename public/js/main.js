// --- Mobile Navigation Toggle ---
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');

if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
    });
}

// --- Shared Sound Function ---
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.error(`Sound '${soundId}' failed to play:`, e));
    }
}