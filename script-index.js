
document.addEventListener('DOMContentLoaded', () => {

    /* --- Scroll Reveal Animation --- */
    const reveals = document.querySelectorAll('.reveal');
    const revealPoint = 150;

    const checkReveal = () => {
        const windowHeight = window.innerHeight;
        reveals.forEach(reveal => {
            const revealTop = reveal.getBoundingClientRect().top;
            if (revealTop < windowHeight - revealPoint) {
                reveal.classList.add('active');
            }
        });
    }

    if (reveals.length > 0) {
        window.addEventListener('scroll', checkReveal);
        checkReveal();
    }

    /* --- Sticky Header --- */
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    /* --- Mobile Menu Toggle --- */
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const nav = document.querySelector('nav');
    if (mobileBtn && nav) {
        mobileBtn.addEventListener('click', () => {
            nav.classList.toggle('open');
            mobileBtn.classList.toggle('active');
        });
        // Close menu on link click
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                mobileBtn.classList.remove('active');
            });
        });
    }

    /* --- Hero Card 3D Tilt Effect (Index only) --- */
    const heroSection = document.getElementById('hero');
    const mainCard = document.querySelector('.iso-card.main-card');
    const bgCard = document.querySelector('.iso-card.bg-card');

    if (mainCard && bgCard && heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            const clampX = Math.max(-15, Math.min(15, xAxis));
            const clampY = Math.max(-15, Math.min(15, yAxis));

            mainCard.style.transform = `rotateY(${clampX}deg) rotateX(${clampY}deg) translateZ(50px)`;
            bgCard.style.transform = `rotateY(${clampX}deg) rotateX(${clampY}deg) translateZ(-50px) translateX(-40px) translateY(40px)`;
        });

        heroSection.addEventListener('mouseleave', () => {
            mainCard.style.transform = `rotateY(-20deg) rotateX(10deg) translateZ(50px)`;
            bgCard.style.transform = `rotateY(-20deg) rotateX(10deg) translateZ(-50px) translateX(-40px) translateY(40px)`;
        });
    }

    /* --- Live Data Simulation --- */
    const humidityVal = document.getElementById('val-humidity');
    const tempVal = document.getElementById('val-temp');
    const lightVal = document.getElementById('val-light');
    const chartBars = document.querySelectorAll('.chart-bar');

    const lightStates = ['Normal', 'Alta', 'Baja', 'Óptima'];

    if (humidityVal) {
        setInterval(() => {
            const h = Math.floor(Math.random() * (70 - 60 + 1)) + 60;
            humidityVal.innerText = `${h}%`;

            if (tempVal) {
                const t = (Math.random() * (26 - 22) + 22).toFixed(1);
                tempVal.innerText = `${t}°C`;
            }

            if (lightVal) {
                lightVal.innerText = lightStates[Math.floor(Math.random() * lightStates.length)];
            }

            chartBars.forEach(bar => {
                const height = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
                bar.style.height = `${height}%`;
            });

        }, 3000);
    }

    /* --- Count Up Animation for Stats --- */
    const stats = document.querySelectorAll('.stat-number');
    let hasAnimatedStats = false;

    const animateStats = () => {
        if (hasAnimatedStats) return;

        const statsSection = document.getElementById('beneficios');

        if (statsSection) {
            const triggerBottom = window.innerHeight / 5 * 4;
            const sectionTop = statsSection.getBoundingClientRect().top;

            if (sectionTop < triggerBottom) {
                stats.forEach(stat => {
                    const target = +stat.getAttribute('data-target');
                    if (!target) return;
                    const suffix = stat.getAttribute('data-suffix') || '';

                    const updateCount = () => {
                        const count = +stat.innerText.replace(/[^0-9]/g, '');
                        const inc = target / 80;

                        if (count < target) {
                            stat.innerText = Math.ceil(count + inc) + suffix;
                            requestAnimationFrame(updateCount);
                        } else {
                            stat.innerText = target + suffix;
                        }
                    };
                    stat.innerText = '0' + suffix;
                    requestAnimationFrame(updateCount);
                });
                hasAnimatedStats = true;
            }
        }
    };

    if (document.getElementById('beneficios')) {
        window.addEventListener('scroll', animateStats);
        animateStats(); // check on load too
    }

    /* --- Active nav link on scroll --- */
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a:not(.nav-btn)');

    if (sections.length && navLinks.length) {
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 120;
                if (window.scrollY >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
});
