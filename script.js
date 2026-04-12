const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');

const W = 800;
const H = 800;
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

const centerX = W / 2;
const centerY = H / 2;

// Wheel geometry mapping
const innerRadius = 80;
const wedgeOuterRadius = 340;
const innerDarkRingRadius = innerRadius + 20; 
const blackRingRadius = 354;
const thinGoldRadius = 372;

// Premium balanced jewel-toned primary colors
const colors = [
    "#DC2626", "#EA580C", "#EAB308", "#16A34A", 
    "#0891B2", "#2563EB", "#7C3AED", "#DB2777",
    "#DC2626", "#EA580C", "#EAB308", "#16A34A", 
    "#0891B2", "#2563EB", "#7C3AED", "#DB2777",
    "#DC2626", "#EA580C", "#EAB308", "#16A34A"
];

// 20 Target categories mapped perfectly identically with equal 4-wedge spacing
const categoryData = [
    { text: "Songs About Sex", stars: 0 },
    { text: "Pop Royalty", stars: 0 },
    { text: "", stars: 1 }, 
    { text: "Acoustic Pop", stars: 0 },
    { text: "Bands", stars: 0 },       
    { text: "Stadium Rock", stars: 0 },
    { text: "", stars: 2 },
    { text: "The Judd's", stars: 0 },
    { text: "Pop Princess", stars: 0 }, 
    { text: "Radio Hits", stars: 0 },
    { text: "", stars: 3 },
    { text: "Party Rock Anthems", stars: 0 },
    { text: "Iconic Singers", stars: 0 },
    { text: "Ladies of the 80's", stars: 0 },
    { text: "", stars: 4 },
    { text: "Mashup", stars: 0 },
    { text: "Ballad", stars: 0 },
    { text: "Songs Glee Ruined", stars: 0 },
    { text: "", stars: 5 },
    { text: "Boy Bands", stars: 0 }
];

const categories = categoryData.map((c, i) => ({ ...c, color: colors[i] }));
const numSlices = categories.length;
const sliceAngle = (2 * Math.PI) / numSlices;

function getLinesForCategory(text) {
    if (!text) return [];
    const words = text.split(" ");
    if (words.length <= 2) return [words.join(" ")];
    if (words.length === 3) return [words[0] + " " + words[1], words[2]];
    return [words[0] + " " + words[1], words.slice(2).join(" ")];
}

function drawWheel(rotationDeg = 0) {
    const rotationRad = (rotationDeg * Math.PI) / 180;
    
    ctx.clearRect(0, 0, W, H);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);
    ctx.translate(-centerX, -centerY);
    
    // Wedges shading mapping
    for (let i = 0; i < numSlices; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, wedgeOuterRadius, startAngle, endAngle);
        ctx.closePath();
        
        let sliceGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, wedgeOuterRadius);
        sliceGradient.addColorStop(0, "#ffffff");
        sliceGradient.addColorStop(0.35, "#ffffff"); 
        sliceGradient.addColorStop(0.85, categories[i].color);
        sliceGradient.addColorStop(1, categories[i].color);
        ctx.fillStyle = sliceGradient;
        ctx.fill();

        ctx.lineWidth = 6; 
        ctx.strokeStyle = categories[i].color;
        ctx.stroke(); 
    }

    ctx.restore(); // Restores context unspinned so texts dynamically rotate securely below

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerDarkRingRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#555555"; 
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, blackRingRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 26;
    ctx.strokeStyle = "#111"; // Black ring
    ctx.stroke();

    // White dots rotating context mathematically
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);
    ctx.translate(-centerX, -centerY);
    for (let i = 0; i < numSlices * 2; i++) {
        const offsetAngle = i * (Math.PI / numSlices) + (Math.PI / numSlices / 2);
        const x = centerX + Math.cos(offsetAngle) * blackRingRadius;
        const y = centerY + Math.sin(offsetAngle) * blackRingRadius;
        
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff"; 
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#f2c94c"; 
        ctx.stroke();
    }
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, thinGoldRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#f2c94c"; 
    ctx.stroke();

    let capGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    capGradient.addColorStop(0, "#ffffff");
    capGradient.addColorStop(0.6, "#fff4cc"); 
    capGradient.addColorStop(1, "#f2c94c"); 
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = capGradient;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.textBaseline = "middle";
    for (let i = 0; i < numSlices; i++) {
        const localMidAngle = i * sliceAngle + sliceAngle / 2;
        const globalAngle = (localMidAngle + rotationRad) % (2 * Math.PI);
        let effGlobal = globalAngle >= 0 ? globalAngle : globalAngle + 2 * Math.PI;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(localMidAngle + rotationRad);
        
        ctx.fillStyle = "#111"; 
        const outerBoundConstraint = wedgeOuterRadius - 15;

        // Dynamically detects if element is currently spanning the left physical quadrant geometry
        const isLeftSide = effGlobal > Math.PI / 2 && effGlobal < (3 * Math.PI) / 2;

        if (categories[i].text === "") {
            const starsText = "★ ".repeat(categories[i].stars).trim();
            ctx.font = "bold 28px Arial, sans-serif";
            
            if (isLeftSide) {
                ctx.rotate(Math.PI);
                ctx.textAlign = "left";
                ctx.fillText(starsText, -outerBoundConstraint, 0); 
            } else {
                ctx.textAlign = "right"; 
                ctx.fillText(starsText, outerBoundConstraint, 0); 
            }
        } else {
            const lines = getLinesForCategory(categories[i].text);
            const lineSpacing = lines.length > 2 ? 18 : 24;
            
            ctx.font = lines.length > 2 || categories[i].text.length > 12 
                ? "bold 18px Helvetica, Arial, sans-serif" 
                : "bold 22px Helvetica, Arial, sans-serif";
                
            if (isLeftSide) {
                ctx.rotate(Math.PI);
                ctx.textAlign = "left";
                for (let j = 0; j < lines.length; j++) {
                    ctx.fillText(lines[j], -outerBoundConstraint, (j - (lines.length-1)/2) * lineSpacing);
                }
            } else {
                ctx.textAlign = "right"; 
                for (let j = 0; j < lines.length; j++) {
                    ctx.fillText(lines[j], outerBoundConstraint, (j - (lines.length-1)/2) * lineSpacing);
                }
            }
        }
        ctx.restore();
    }
}

let currentRotation = 0;
// Draw correctly instantly upon booting cleanly
document.fonts.ready.then(() => drawWheel(currentRotation));

let riggedTargets = ['Pop Princess', 'Mashup', 'Ballad'];
riggedTargets.sort(() => Math.random() - 0.5);
let isSpinning = false;

document.getElementById('popupOverlay').addEventListener('click', () => {
    document.getElementById('popupOverlay').classList.remove('active');
    document.getElementById('popupObj').classList.remove('show');
});

document.getElementById('spinBtn').addEventListener('click', () => {
    if(isSpinning) return;
    
    document.getElementById('popupOverlay').classList.remove('active');
    document.getElementById('popupObj').classList.remove('show');

    isSpinning = true;

    let targetText = "";
    if (riggedTargets.length > 0) {
        targetText = riggedTargets.pop();
    } else {
        const fallback = categories.filter(c => c.text !== "");
        targetText = fallback[Math.floor(Math.random() * fallback.length)].text;
    }

    const targetIndex = categories.findIndex(c => c.text === targetText);
    const sliceDeg = 360 / numSlices;
    const targetMidAngle = targetIndex * sliceDeg + (sliceDeg / 2);
    
    const spins = 5; 
    const baseRotation = currentRotation % 360;
    
    let additionalRotation = (180 - targetMidAngle - baseRotation) % 360;
    if (additionalRotation < 0) additionalRotation += 360;
    
    const finalRotation = currentRotation + additionalRotation + (spins * 360);
    
    // Render loop directly bypassing graphical CSS transforming constraints dynamically resolving UI mapping orientations natively 
    const startRotation = currentRotation;
    const endRotation = finalRotation;
    const duration = 6000;
    const startTime = performance.now();
    
    function animate(time) {
        let t = (time - startTime) / duration;
        if (t > 1) t = 1;
        const easeT = 1 - Math.pow(1 - t, 3);
        const nowRotation = startRotation + (endRotation - startRotation) * easeT;
        
        drawWheel(nowRotation);
        
        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            currentRotation = nowRotation;
            
            const overlay = document.getElementById('popupOverlay');
            const popup = document.getElementById('popupObj');
            const popupText = document.getElementById('popupText');
            popupText.innerText = targetText;
            overlay.classList.add('active');
            popup.classList.add('show');
        }
    }
    
    requestAnimationFrame(animate);
});
