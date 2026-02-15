// Import ESPLoader and Transport directly as ES Modules (Using v0.2.0 for stability)
import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@0.2.0/bundle.js";

const BIN_PATH = 'sueloesp32.ino.bin';

document.addEventListener('DOMContentLoaded', () => {

    const connectBtn = document.getElementById('btn-connect-usb');
    const flashBtn = document.getElementById('btn-flash');
    const statusSpan = document.getElementById('connection-status');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const consoleLog = document.getElementById('console-log');

    // Global variable to hold serial port
    let serialPort = null;

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
                serialPort = await navigator.serial.requestPort();
                await serialPort.open({ baudRate: 115200 });

                statusSpan.innerText = 'Estado: Conectado ✅';
                statusSpan.style.color = 'var(--secondary)';
                connectBtn.disabled = true;
                connectBtn.innerText = 'Dispositivo Conectado';
                flashBtn.disabled = false;
                flashBtn.style.opacity = '1';
                flashBtn.style.cursor = 'pointer';

                log('> Puerto Serie Abierto. Dispositivo listo.', 'success');

            } catch (error) {
                log(`> Error de conexión: ${error.message}`, 'error');
                serialPort = null;
            }
        });

        flashBtn.addEventListener('click', async () => {
            if (!serialPort) {
                log('> Error: No hay puerto seleccionado.', 'error');
                return;
            }

            // Explicitly check for getInfo to avoid "undefined reading getInfo" errors
            if (!serialPort.getInfo) {
                log('> Error: El objeto SerialPort no es válido (falta getInfo). Reinicia el navegador.', 'error');
                return;
            }

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

                // 2. Initialize ESPLoader
                log('> Verificando puerto serial...', 'info');

                const transport = new Transport(serialPort);
                const term = {
                    clean: () => { },
                    writeLine: (l) => log(l),
                    write: (s) => { }
                };

                // Loader config for ESP32
                const loader = new ESPLoader(transport, 115200, term);

                log('> Conectando al Bootloader del ESP32...', 'info');
                await loader.main_fn(); // Detect chip

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
                    '40m',
                    true,
                    (fileIndex, written, total) => {
                        const percent = (written / total) * 100;
                        progressBar.style.width = `${percent}%`;
                        if (Math.floor(percent) % 20 === 0) log(`> Flaseando: ${Math.floor(percent)}%`);
                    },
                    (image) => log(`Hash de verificación: ${image}`)
                );

                log('> Resetting...', 'info');

                // Try hard reset
                try {
                    await transport.setDTR(false);
                    await transport.setRTS(true);
                    await new Promise(r => setTimeout(r, 100));
                    await transport.setRTS(false);
                    await transport.disconnect();
                } catch (e) {
                    console.warn('Reset returned error (ignoring):', e);
                }

                progressBar.style.width = '100%';
                log('> ¡Actualización completada con éxito!', 'success');
                flashBtn.innerText = 'Completado';
                flashBtn.style.background = 'var(--secondary)';
                flashBtn.disabled = false;

                // Reset internal state
                serialPort = null;
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
