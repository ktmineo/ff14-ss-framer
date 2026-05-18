// --- Plugin Imports ---
import { GLRenderer } from './gl-renderer.js';
import { getLutImage } from './filters/lut-presets.js';

const glRenderer = new GLRenderer();

const filterPresets = {
    'analog': { name: 'Film', type: 'lut', lutKey: 'analog', noise: 0.2 },
    'bloom': { name: 'Bloom', type: 'lut', lutKey: 'bloom', noise: 0.0 },
    'vibrant': { name: 'Vibrant', type: 'lut', lutKey: 'vibrant', noise: 0.0 },
    'noir': { name: 'Noir', type: 'lut', lutKey: 'noir', noise: 0.2 },
    'mist': { name: 'Mist', type: 'lut', lutKey: 'mist', noise: 0.1 },
};
let currentFilterKey = 'analog';

// --- Global State ---
let areaDict = {};
const canvas = document.getElementById('mainCanvas'), ctx = canvas.getContext('2d'),
    upload = document.getElementById('upload'), dropZone = document.getElementById('dropZone'),
    posInput = document.getElementById('posInput'), downloadBtn = document.getElementById('downloadBtn'),
    copyBtn = document.getElementById('copyBtn'),
    xPostText = document.getElementById('xPostText'),
    filterRange = document.getElementById('filterRange'), dropHint = document.getElementById('dropHint');

const PAD = 30, M_TOP = 25, M_MID = 10, FONT_U = 18, FONT_L = 12;
let currentImg = null, targetW = 685, targetH = 914, imgOffset = { x: 0.5, y: 0.5 };
let isDragging = false, lastMouse = { x: 0, y: 0 };
let renderId = 0;

// --- Security: XSS Prevention ---
function sanitizeText(str) {
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

// --- Initialization ---
async function init() {
    await loadDictionary();
    createFilterButtons();
    updateXPostText(); // Initialize
    draw();
}

async function loadDictionary() {
    try {
        const response = await fetch('js/ff14-area-dictionary.json');
        if (!response.ok) throw new Error('Dictionary not found');
        areaDict = await response.json();
    } catch (error) {
        console.error('Dictionary load error:', error);
    }
}

function createFilterButtons() {
    const selector = document.getElementById('filterSelector');
    Object.keys(filterPresets).forEach(key => {
        const btn = document.createElement('button');
        btn.textContent = filterPresets[key].name;
        if (key === currentFilterKey) btn.classList.add('active');
        btn.onclick = () => {
            document.querySelectorAll('#filterSelector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilterKey = key;
            draw();
        };
        selector.appendChild(btn);
    });
}

function getAutoRegionText(input) {
    if (!input) return "";
    let cleanText = input.replace(/\u00A0/g, " ").trim();
    for (let area in areaDict) {
        const region = areaDict[area];
        if (cleanText.includes(area)) {
            if (cleanText.startsWith(region)) return cleanText;
            return `${region} ${cleanText}`;
        }
    }
    return cleanText;
}

function updateXPostText() {
    const safeInput = sanitizeText(posInput.value);
    const displayText = getAutoRegionText(safeInput);
    xPostText.value = `${displayText} \n#FF14 #FF14風景 #FF14SS`.trim();
}

// --- Interaction ---
dropZone.onclick = (e) => { if (!currentImg && e.target === dropZone) upload.click(); };
canvas.onclick = (e) => { if (!currentImg) upload.click(); e.stopPropagation(); };
dropZone.ondragover = e => e.preventDefault();
dropZone.ondrop = e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
upload.onchange = e => handleFile(e.target.files[0]);

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => { currentImg = img; dropHint.style.display = "none"; draw(); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- State Management ---
let currentAspect = 'standard'; // 'standard', 'wide', 'square'
let currentOrientation = 'vertical'; // 'vertical', 'horizontal'

function updateDimensions() {
    if (currentAspect === 'square') {
        targetW = 800;
        targetH = 800;
    } else if (currentAspect === 'wide') {
        if (currentOrientation === 'vertical') {
            targetW = 514; targetH = 914; // 9:16
        } else {
            targetW = 914; targetH = 514; // 16:9
        }
    } else { // standard
        if (currentOrientation === 'vertical') {
            targetW = 685; targetH = 914; // 3:4
        } else {
            targetW = 914; targetH = 685; // 4:3
        }
    }
    updateUI();
    draw();
}

function updateUI() {
    // Update Aspect Buttons
    ['setStandard', 'setWide', 'setSquare'].forEach(id => {
        const type = id.replace('set', '').toLowerCase();
        document.getElementById(id).classList.toggle('active', currentAspect === type);
    });

    // Update Orientation Buttons
    ['setVertical', 'setHorizontal'].forEach(id => {
        const type = id.replace('set', '').toLowerCase();
        const btn = document.getElementById(id);
        btn.classList.toggle('active', currentOrientation === type);

        // Disable orientation if Square
        if (currentAspect === 'square') {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

// Event Listeners for Aspect Ratio
document.getElementById('setStandard').onclick = () => { currentAspect = 'standard'; updateDimensions(); };
document.getElementById('setWide').onclick = () => { currentAspect = 'wide'; updateDimensions(); };
document.getElementById('setSquare').onclick = () => { currentAspect = 'square'; updateDimensions(); };

// Event Listeners for Orientation
document.getElementById('setVertical').onclick = () => { currentOrientation = 'vertical'; updateDimensions(); };
document.getElementById('setHorizontal').onclick = () => { currentOrientation = 'horizontal'; updateDimensions(); };
filterRange.oninput = draw;
posInput.oninput = () => {
    draw();
    updateXPostText();
};

canvas.onmousedown = e => { if (currentImg) { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; } };
window.onmousemove = e => {
    if (!isDragging || !currentImg) return;
    const dx = (e.clientX - lastMouse.x) / canvas.clientWidth;
    const dy = (e.clientY - lastMouse.y) / canvas.clientHeight;
    imgOffset.x = Math.max(0, Math.min(1, imgOffset.x - dx));
    imgOffset.y = Math.max(0, Math.min(1, imgOffset.y - dy));
    lastMouse = { x: e.clientX, y: e.clientY };
    draw();
};
window.onmouseup = () => isDragging = false;

// --- Rendering Engine ---
function draw() {
    if (!currentImg) { canvas.width = 400; canvas.height = 550; return; }
    const textAreaH = M_TOP + FONT_U + M_MID + FONT_L;
    canvas.width = targetW + (PAD * 2);
    canvas.height = targetH + PAD + textAreaH + PAD;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgAspect = currentImg.width / currentImg.height, maskAspect = targetW / targetH;
    let sW, sH, sx, sy;
    if (imgAspect > maskAspect) {
        sH = currentImg.height; sW = sH * maskAspect;
        sy = 0; sx = (currentImg.width - sW) * imgOffset.x;
    } else {
        sW = currentImg.width; sH = sW / maskAspect;
        sx = 0; sy = (currentImg.height - sH) * imgOffset.y;
    }

    const s = filterRange.value / 100;
    const p = filterPresets[currentFilterKey];

    renderId++;
    const myRenderId = renderId;

    if (p.type === 'lut') {
        // --- WebGL LUT Path ---
        getLutImage(p.lutKey).then(lutImg => {
            if (renderId !== myRenderId) return; // Prevent race condition

            const processedCanvas = glRenderer.render(currentImg, lutImg, s);

            ctx.save();
            ctx.translate(PAD, PAD);
            ctx.drawImage(processedCanvas, sx, sy, sW, sH, 0, 0, targetW, targetH);

            if (s > 0 && p.noise > 0) {
                ctx.globalCompositeOperation = 'overlay';
                ctx.globalAlpha = p.noise * s;
                const noise = ctx.createImageData(targetW, targetH);
                for (let i = 0; i < noise.data.length; i += 4) {
                    const v = Math.random() * 255;
                    noise.data[i] = noise.data[i + 1] = noise.data[i + 2] = v; noise.data[i + 3] = 255;
                }
                const temp = document.createElement('canvas');
                temp.width = targetW; temp.height = targetH;
                temp.getContext('2d').putImageData(noise, 0, 0);
                ctx.drawImage(temp, 0, 0);
            }

            ctx.restore();
            drawOverlay();
        });
        return;
    }

    // --- Fallback / CSS Legacy Path (Should not be reached if all are LUTs) ---
    // Kept minimal or removed?
    // User asked to "Keep existing filters RE-IMPLEMENTED as LUT".
    // So this path is obsolete.

    // Safety restore in case logic falls through
    ctx.restore();
    drawOverlay();
}

function drawOverlay() {
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const centerX = canvas.width / 2;
    const upperY = PAD + targetH + M_TOP;
    ctx.fillStyle = "#222";
    ctx.font = `800 ${FONT_U}px 'Noto Sans JP'`;

    const safeInput = sanitizeText(posInput.value);
    const displayText = getAutoRegionText(safeInput);
    ctx.fillText(displayText || "Region ( 0.0 , 0.0 )", centerX, upperY);

    const lowerY = upperY + FONT_U + M_MID;
    ctx.fillStyle = "#999";
    ctx.font = `300 ${FONT_L}px 'Noto Sans JP'`;
    ctx.fillText("© SQUARE ENIX FINAL FANTASY XIV", centerX, lowerY);
}

downloadBtn.onclick = async () => {
    if (!currentImg) return;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `FF14_photo_${timestamp}.png`;

    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'PNG Image',
                    accept: { 'image/png': ['.png'] },
                }],
            });
            const writable = await handle.createWritable();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            await writable.write(blob);
            await writable.close();
            return;
        }
        throw new Error('Not supported');
    } catch (err) {
        if (err.name === 'AbortError') return;
        // Fallback
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }
};

copyBtn.onclick = async () => {
    const textToCopy = xPostText.value;

    try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy!', err);
    }
};

init();
