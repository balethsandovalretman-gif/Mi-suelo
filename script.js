
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
    const chartBars = document.querySelectorAll('.chart-bar');

    if (humidityVal) {
        setInterval(() => {
            const h = Math.floor(Math.random() * (70 - 60 + 1)) + 60;
            humidityVal.innerText = `${h}%`;

            if (tempVal) {
                const t = (Math.random() * (26 - 22) + 22).toFixed(1);
                tempVal.innerText = `${t}°C`;
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

        const statsSection = document.getElementById('problema');

        if (statsSection) {
            const triggerBottom = window.innerHeight / 5 * 4;
            const sectionTop = statsSection.getBoundingClientRect().top;

            if (sectionTop < triggerBottom) {
                stats.forEach(stat => {
                    const target = +stat.getAttribute('data-target');
                    if (!target) return;
                    const suffix = stat.innerText.replace(/[0-9]/g, '');

                    const updateCount = () => {
                        const count = +stat.innerText.replace(/[^0-9]/g, '');
                        const inc = target / 100;

                        if (count < target) {
                            stat.innerText = Math.ceil(count + inc) + suffix;
                            setTimeout(updateCount, 20);
                        } else {
                            stat.innerText = target + suffix;
                        }
                    };
                    stat.innerText = '0' + suffix;
                    updateCount();
                });
                hasAnimatedStats = true;
            }
        }
    };

    if (document.getElementById('problema')) {
        window.addEventListener('scroll', animateStats);
    }

    /* --- Firmware Upload Handler (Web Serial) --- */
    const connectBtn = document.getElementById('btn-connect-usb');
    const flashBtn = document.getElementById('btn-flash');
    const statusSpan = document.getElementById('connection-status');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const consoleLog = document.getElementById('console-log');

    const BIN_PATH = 'sueloesp32.ino.bin';
    let esploader;
    let transport;

    function log(msg, type = 'info') {
        const p = document.createElement('p');
        p.innerHTML = msg;
        if (type === 'error') p.className = 'error';
        if (type === 'success') p.className = 'success';

        consoleLog.appendChild(p);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            if (!navigator.serial) {
                alert('Tu navegador no soporta Web Serial. Usa Chrome o Edge.');
                return;
            }

            try {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });

                statusSpan.innerText = 'Estado: Conectado ✅';
                statusSpan.style.color = 'var(--secondary)';
                connectBtn.disabled = true;
                connectBtn.innerText = 'Dispositivo Conectado';
                flashBtn.disabled = false;
                flashBtn.style.opacity = '1';
                flashBtn.style.cursor = 'pointer';

                log('> Puerto Serie Abierto. Dispositivo listo.', 'success');

                // Initialize Transport for later use
                // Note: ESPLoader logic will be instantiated inside flashBtn click
                // to keep the port handling cleaner in this simple implementation
                window.serialPort = port;

            } catch (error) {
                log(`> Error de conexión: ${error.message}`, 'error');
            }
        });

        flashBtn.addEventListener('click', async () => {
            if (!window.serialPort) return;

            flashBtn.disabled = true;
            flashBtn.innerText = 'Procesando...';
            progressContainer.style.display = 'block';
            consoleLog.style.display = 'block';
            consoleLog.innerHTML = '';

            try {
                // 1. Fetch Local File
                log(`> Descargando firmware local: ${BIN_PATH}...`);
                const response = await fetch(BIN_PATH);
                if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const fileData = new Uint8Array(arrayBuffer);

                log(`> Archivo cargado (${fileData.length} bytes). Inicializando flasheo...`);

                // 2. Initialize ESPLoader via Dynamic Import
                log('> Cargando librería esptool-js...', 'info');

                // Import ESPLoader and Transport from CDN
                // Note: The bundle exports them as named exports or attaches to window depending on version.
                // For v0.5.4 ESM usage:
                const esptool = await import('https://unpkg.com/esptool-js@0.5.4/bundle.js');

                // Fallback for different bundle structures
                const ESPLoader = esptool.ESPLoader || window.ESPLoader;
                const Transport = esptool.Transport || window.Transport;

                if (!ESPLoader || !Transport) {
                    throw new Error('No se pudo invocar las clases de esptool-js. Verifica la consola.');
                }

                const transport = new Transport(window.serialPort);
                const term = {
                    clean: () => { },
                    writeLine: (l) => log(l),
                    write: (s) => { }
                };

                // Loader config for ESP32
                const loader = new ESPLoader(transport, 115200, term);

                log('> Conectando al Bootloader del ESP32...', 'info');
                await loader.main_fn();

                log('> Chip Detectado: ' + await loader.chip.get_chip_description(loader.ism), 'success');
                log('> Stub cargado. Preparando escritura en flash...', 'info');

                // 3. Flash Data
                // Reading file content as binary string for esptool (required for string-based data)
                let binaryString = "";
                for (let i = 0; i < fileData.byteLength; i++) {
                    binaryString += String.fromCharCode(fileData[i]);
                }

                await loader.write_flash(
                    [{ data: binaryString, address: 0x10000 }],
                    'keep',
                    'keep',
                    false,
                    true,
                    (fileIndex, written, total) => {
                        const percent = (written / total) * 100;
                        progressBar.style.width = `${percent}%`;
                        if (Math.floor(percent) % 20 === 0) log(`> Flaseando: ${Math.floor(percent)}%`);
                    },
                    (image) => log(`Hash de verificación: ${image}`)
                );

                log('> Resetting...', 'info');

                // Hard reset
                await transport.setDTR(false);
                await transport.setRTS(true);
                await new Promise(r => setTimeout(r, 100));
                await transport.setRTS(false);
                await transport.disconnect();

                progressBar.style.width = '100%';
                log('> ¡Actualización completada con éxito!', 'success');
                flashBtn.innerText = 'Completado';
                flashBtn.style.background = 'var(--secondary)';
                flashBtn.disabled = false;

                // Reset internal state
                window.serialPort = null;
                connectBtn.disabled = false;
                connectBtn.innerText = 'Reconectar USB';
                statusSpan.innerText = 'Estado: Finalizado';


            } catch (error) {
                log(`> Error Crítico: ${error.message}`, 'error');
                console.error(error);
                flashBtn.disabled = false;
                flashBtn.innerText = 'Reintentar';
            }
        });
    }
});
