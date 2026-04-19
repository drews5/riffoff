/* ================================================
   RIFF OFF – Interactive Slideshow Controller
   ================================================
   Flow:
   TITLE → (Space) → WHEEL Round 1 → (Spin) → Category popup
   → (Team key V/7/B/E/U) → TEAM DISPLAY → (Space) → VOTE QR
   → (Team key) → next team → (Space) → VOTE QR
   → (after 5 teams) → ROUND TRANSITION → (Space) → WHEEL
   → (Esc at any time) → SCORES
   ================================================ */

// ==================== LIVE SYNC ====================
// Fill these in to enable Live Dynamic Updating on audience phones
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function updateLiveState(teamName, round, isOpen) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('live_state').upsert({ id: 1, team: teamName, round: round, is_open: isOpen });
    } catch (e) {
        console.error("Live sync failed", e);
    }
}

// ==================== STATE ====================
const TEAMS = {
    'v': 'VOCAL U',
    '7': '7 DAYS',
    'b': 'BASSES WILD',
    'e': 'THE ENCHANTMENTS',
    'u': 'URBAN SOUND'
};

const TEAM_KEYS = Object.keys(TEAMS);
const TEAM_NAMES = Object.values(TEAMS);

let currentScreen = 'title';
let currentRound = 1;
let maxRounds = 3;
let performedTeams = new Set();
let currentTeamKey = null;
let previousScreen = null; // for returning from scores
let isSpinning = false;
let wheelHasSpun = false; // track if wheel was spun this round

// Scores: { teamName: { round: { enjoyability: n, vocalQuality: n, performanceQuality: n } } }
let scores = {};
TEAM_NAMES.forEach(name => {
    scores[name] = {};
    for (let r = 1; r <= maxRounds; r++) {
        scores[name][r] = { enjoyability: 0, vocalQuality: 0, performanceQuality: 0 };
    }
});

// ==================== SCREEN MANAGEMENT ====================
function showScreen(screenId) {
    // Deactivate all
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById('screen-' + screenId);
    target.classList.add('active');
    
    currentScreen = screenId;
    
    // Re-trigger animations for certain screens
    if (screenId === 'team') {
        const teamNameEl = document.getElementById('teamName');
        teamNameEl.style.animation = 'none';
        teamNameEl.offsetHeight; // force reflow
        teamNameEl.style.animation = '';
    }
    
    if (screenId === 'round-transition') {
        const rtText = document.getElementById('roundTransitionText');
        rtText.style.animation = 'none';
        rtText.offsetHeight;
        rtText.style.animation = '';
    }
}

// ==================== TITLE SCREEN SPARKLES ====================
function createSparkles() {
    const field = document.getElementById('sparkleField');
    if (!field) return;
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.textContent = '✦';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.animationDelay = (Math.random() * 4) + 's';
        s.style.fontSize = (12 + Math.random() * 16) + 'px';
        field.appendChild(s);
    }
}

// ==================== WHEEL DRAWING ====================
const W = 800;
const H = 800;

const centerX = W / 2;
const centerY = H / 2;

const innerRadius = 80;
const wedgeOuterRadius = 340;
const innerDarkRingRadius = innerRadius + 20;
const blackRingRadius = 354;
const thinGoldRadius = 372;

const colors = [
    "#DC2626", "#EA580C", "#EAB308", "#16A34A", 
    "#0891B2", "#2563EB", "#7C3AED", "#DB2777",
    "#DC2626", "#EA580C", "#EAB308", "#16A34A", 
    "#0891B2", "#2563EB", "#7C3AED", "#DB2777",
    "#DC2626", "#EA580C", "#EAB308", "#16A34A"
];

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

let canvas, ctx;
let currentRotation = 0;

function initWheel() {
    canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    
    drawWheel(currentRotation);
}

function getLinesForCategory(text) {
    if (!text) return [];
    const words = text.split(" ");
    if (words.length <= 2) return [words.join(" ")];
    if (words.length === 3) return [words[0] + " " + words[1], words[2]];
    return [words[0] + " " + words[1], words.slice(2).join(" ")];
}

function drawWheel(rotationDeg = 0) {
    if (!ctx) return;
    const rotationRad = (rotationDeg * Math.PI) / 180;
    
    ctx.clearRect(0, 0, W, H);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);
    ctx.translate(-centerX, -centerY);
    
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
    
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerDarkRingRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#555555";
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, blackRingRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 26;
    ctx.strokeStyle = "#111";
    ctx.stroke();
    
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
                    ctx.fillText(lines[j], -outerBoundConstraint, (j - (lines.length - 1) / 2) * lineSpacing);
                }
            } else {
                ctx.textAlign = "right";
                for (let j = 0; j < lines.length; j++) {
                    ctx.fillText(lines[j], outerBoundConstraint, (j - (lines.length - 1) / 2) * lineSpacing);
                }
            }
        }
        ctx.restore();
    }
}

// ==================== WHEEL SPIN ====================
let riggedTargets = ['Pop Princess', 'Mashup', 'Ballad'];
riggedTargets.sort(() => Math.random() - 0.5);

function spinWheel() {
    if (isSpinning) return;
    
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
            wheelHasSpun = true;
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
}

// ==================== QR CODE ====================
function generateVoteQR(teamName, round) {
    try {
        const qrImg = document.getElementById('qrImage');
        const url = window.location.origin + '/vote.html';
        const encodedUrl = encodeURIComponent(url);
        // Using an external API to ensure it always correctly displays
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}&color=1a1025&bgcolor=ffffff`;
    } catch (e) {
        console.error('QR Error:', e);
    }
}

// ==================== SCORES DASHBOARD ====================
function renderScores() {
    const grid = document.getElementById('scoresGrid');
    grid.innerHTML = '';
    
    for (let r = 1; r <= maxRounds; r++) {
        const block = document.createElement('div');
        block.className = 'round-scores-block';
        
        block.innerHTML = `
            <h3>ROUND ${r}</h3>
            <table class="scores-table">
                <thead>
                    <tr>
                        <th>Team</th>
                        <th>🎵 Enjoyability</th>
                        <th>🎤 Vocal Quality</th>
                        <th>🎭 Performance</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${TEAM_NAMES.map(name => {
                        const s = scores[name][r];
                        const total = s.enjoyability + s.vocalQuality + s.performanceQuality;
                        return `
                        <tr>
                            <td>${name}</td>
                            <td><input type="number" min="0" max="10" value="${s.enjoyability}" 
                                data-team="${name}" data-round="${r}" data-cat="enjoyability"></td>
                            <td><input type="number" min="0" max="10" value="${s.vocalQuality}" 
                                data-team="${name}" data-round="${r}" data-cat="vocalQuality"></td>
                            <td><input type="number" min="0" max="10" value="${s.performanceQuality}" 
                                data-team="${name}" data-round="${r}" data-cat="performanceQuality"></td>
                            <td class="total-cell" id="total-${name.replace(/\s/g,'_')}-${r}">${total}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        grid.appendChild(block);
    }
    
    // Attach input listeners
    grid.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const team = e.target.dataset.team;
            const round = parseInt(e.target.dataset.round);
            const cat = e.target.dataset.cat;
            let val = parseInt(e.target.value) || 0;
            if (val > 10) val = 10;
            if (val < 0) val = 0;
            e.target.value = val;
            scores[team][round][cat] = val;
            
            const s = scores[team][round];
            const total = s.enjoyability + s.vocalQuality + s.performanceQuality;
            document.getElementById(`total-${team.replace(/\s/g,'_')}-${round}`).textContent = total;
        });
        
        // Prevent keyboard navigation from triggering screen changes
        inp.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    });
}

// ==================== NAVIGATION STATE MACHINE ====================
function showTeam(teamKey) {
    currentTeamKey = teamKey;
    const teamName = TEAMS[teamKey];
    document.getElementById('teamName').textContent = teamName;
    showScreen('team');
}

function showVoteScreen() {
    if (!currentTeamKey) return;
    const teamName = TEAMS[currentTeamKey];
    document.getElementById('voteTeamLabel').textContent = teamName;
    document.getElementById('voteRoundLabel').textContent = `ROUND ${currentRound}`;
    generateVoteQR(teamName, currentRound);
    showScreen('vote');
    performedTeams.add(currentTeamKey);
    updateLiveState(teamName, currentRound, true);
}

function showRoundTransition() {
    currentRound++;
    if (currentRound > maxRounds) {
        // Show final scores
        renderScores();
        showScreen('scores');
        return;
    }
    document.getElementById('roundTransitionText').textContent = `ROUND ${currentRound}`;
    showScreen('round-transition');
    performedTeams.clear();
    wheelHasSpun = false;
}

// ==================== KEYBOARD HANDLER ====================
document.addEventListener('keydown', (e) => {
    // Don't handle if user is typing in an input
    if (e.target.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    
    switch (currentScreen) {
        case 'title':
            if (key === ' ') {
                e.preventDefault();
                document.getElementById('roundIndicator').textContent = `ROUND ${currentRound}`;
                showScreen('wheel');
                initWheel();
                document.fonts.ready.then(() => drawWheel(currentRotation));
            }
            break;
            
        case 'wheel':
            if (key === ' ' && !isSpinning && !wheelHasSpun) {
                e.preventDefault();
                spinWheel();
            }
            // Team keys work after wheel has spun
            if (TEAM_KEYS.includes(key) && wheelHasSpun && !isSpinning) {
                document.getElementById('popupOverlay').classList.remove('active');
                document.getElementById('popupObj').classList.remove('show');
                showTeam(key);
            }
            if (key === 'escape') {
                previousScreen = 'wheel';
                renderScores();
                showScreen('scores');
            }
            break;
            
        case 'team':
            if (TEAM_KEYS.includes(key)) {
                // If we mispressed, allow changing the team without advancing flow
                showTeam(key);
            }
            if (key === ' ') {
                e.preventDefault();
                showVoteScreen();
            }
            if (key === 'escape') {
                previousScreen = 'team';
                renderScores();
                showScreen('scores');
            }
            break;
            
        case 'vote':
            // Team keys for next group
            if (TEAM_KEYS.includes(key)) {
                // Determine if we are moving to next team or if this was just a mispress fixing
                if (performedTeams.size < 5) {
                    updateLiveState("", currentRound, false);
                    showTeam(key);
                }
            }
            if (key === ' ') {
                e.preventDefault();
                // Only move to round transition if all 5 teams have voted
                if (performedTeams.size >= 5) {
                    updateLiveState("", currentRound, false);
                    showRoundTransition();
                }
            }
            if (key === 'escape') {
                previousScreen = 'vote';
                updateLiveState("", currentRound, false);
                renderScores();
                showScreen('scores');
            }
            break;
            
        case 'scores':
            if (key === ' ' || key === 'escape') {
                e.preventDefault();
                // Return to previous context
                if (previousScreen) {
                    // Restore live state if returning to vote
                    if (previousScreen === 'vote') {
                        updateLiveState(TEAMS[currentTeamKey], currentRound, true);
                    }
                    // If we completed a round, go to round transition
                    if (performedTeams.size >= 5) {
                        showRoundTransition();
                    } else {
                        showScreen(previousScreen);
                    }
                } else {
                    showScreen('wheel');
                }
            }
            break;
            
        case 'round-transition':
            if (key === ' ') {
                e.preventDefault();
                document.getElementById('roundIndicator').textContent = `ROUND ${currentRound}`;
                wheelHasSpun = false;
                showScreen('wheel');
                initWheel();
                drawWheel(currentRotation);
            }
            break;
    }
});



document.getElementById('popupOverlay').addEventListener('click', () => {
    // Don't close, just let team keys work
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    createSparkles();
    showScreen('title');
});
