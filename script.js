/* ================================================
   RIFF OFF - Slideshow Controller
   ================================================ */

const TEAMS = {
    v: {
        name: "VOCAL U",
        logo: "assets/logos/vocal-u.png"
    },
    "7": {
        name: "7 DAYS",
        logo: "assets/logos/7-days.png"
    },
    b: {
        name: "BASSES WILD",
        logo: "assets/logos/basses-wild.png"
    },
    e: {
        name: "THE ENCHANTMENTS",
        logo: "assets/logos/enchantments.png"
    },
    u: {
        name: "URBAN SOUND",
        logo: "assets/logos/urban-sound.png"
    }
};

const ROUND_FORM_URLS = {
    1: "https://z.umn.edu/riff1",
    2: "https://z.umn.edu/riff2",
    3: "https://z.umn.edu/riff3"
};

const TEAM_KEYS = Object.keys(TEAMS);
const TEAM_CODE_MAP = {
    KeyV: "v",
    Digit7: "7",
    KeyB: "b",
    KeyE: "e",
    KeyU: "u"
};

const WHEEL_SHORTCUTS = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3
};

const VOTE_SHORTCUTS = {
    Digit4: 1,
    Digit5: 2,
    Digit6: 3
};

const DEFAULT_TEAM_KEY = "v";
const DEFAULT_CATEGORY = "Pop Princess Category";
const MAX_ROUNDS = 3;

function displayUrl(url) {
    return url.replace(/^https?:\/\//, "");
}

let currentScreen = "title";
let currentRound = 1;
let currentTeamKey = DEFAULT_TEAM_KEY;
let currentCategory = DEFAULT_CATEGORY;
let performedTeams = new Set();
let isSpinning = false;
let wheelHasSpun = false;

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

const categories = categoryData.map((category, index) => ({ ...category, color: colors[index] }));
const numSlices = categories.length;
const sliceAngle = (2 * Math.PI) / numSlices;

let riggedTargets = ["Pop Princess", "Mashup", "Ballad"];
let canvas;
let ctx;
let currentRotation = 0;

function shuffleRiggedTargets() {
    riggedTargets = ["Pop Princess", "Mashup", "Ballad"];
    riggedTargets.sort(() => Math.random() - 0.5);
}

shuffleRiggedTargets();

function isSpaceKey(event) {
    return event.key === " " || event.key === "Spacebar" || event.code === "Space";
}

function getTeamKey(event) {
    const key = (event.key || "").toLowerCase();
    if (TEAM_KEYS.includes(key)) {
        return key;
    }

    return TEAM_CODE_MAP[event.code] || null;
}

function getWheelShortcutRound(event) {
    return WHEEL_SHORTCUTS[event.code] || null;
}

function getVoteShortcutRound(event) {
    return VOTE_SHORTCUTS[event.code] || null;
}

function isFinaleShortcut(event) {
    return (event.key || "").toLowerCase() === "x" || event.code === "KeyX";
}

function hidePopup() {
    const overlay = document.getElementById("popupOverlay");
    const popup = document.getElementById("popupObj");
    if (overlay) overlay.classList.remove("active");
    if (popup) popup.classList.remove("show");
}

function updateRoundIndicator() {
    const indicator = document.getElementById("roundIndicator");
    if (indicator) {
        indicator.textContent = `Round ${currentRound}`;
    }
}

function ensureTeamScreen() {
    let screen = document.getElementById("screen-team");
    if (!screen) {
        screen = document.createElement("div");
        screen.className = "screen";
        screen.id = "screen-team";
        screen.innerHTML = `
            <div class="team-display-bg">
                <img class="team-logo" id="teamLogo" src="" alt="Team logo">
            </div>
        `;
        document.body.appendChild(screen);
    }

    let logo = document.getElementById("teamLogo");
    if (!logo) {
        logo = document.createElement("img");
        logo.className = "team-logo";
        logo.id = "teamLogo";
        logo.alt = "Team logo";
        screen.firstElementChild.appendChild(logo);
    }

    return logo;
}

function ensureVoteScreen() {
    let screen = document.getElementById("screen-vote");
    if (!screen) {
        screen = document.createElement("div");
        screen.className = "screen";
        screen.id = "screen-vote";
        screen.innerHTML = `
            <div class="vote-screen">
                <div class="vote-sparkle-field" aria-hidden="true">
                    <span class="vote-sparkle vote-sparkle-a">&#10022;</span>
                    <span class="vote-sparkle vote-sparkle-b">&#10022;</span>
                    <span class="vote-sparkle vote-sparkle-c">&#10022;</span>
                    <span class="vote-sparkle vote-sparkle-d">&#10022;</span>
                </div>
                <div class="vote-slide">
                    <div class="vote-topline">
                        <div class="vote-round-label" id="voteRoundLabel">Round 1</div>
                        <div class="vote-category-pill" id="voteCategoryLabel">POP PRINCESS CATEGORY</div>
                    </div>
                    <div class="vote-team-label" id="voteTeamLabel">VOCAL U</div>
                    <div class="vote-criteria">
                        <div class="vote-criterion">Enjoyability</div>
                        <div class="vote-criterion">Vocal Quality</div>
                        <div class="vote-criterion">Performance Quality</div>
                    </div>
                    <div class="vote-qr-block">
                        <div class="vote-qr-frame">
                            <img id="qrImage" src="" alt="Voting QR code">
                        </div>
                        <div class="vote-link-label" id="voteQrLink">z.umn.edu/riff1</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(screen);
    }

    return {
        roundLabel: document.getElementById("voteRoundLabel"),
        categoryLabel: document.getElementById("voteCategoryLabel"),
        teamLabel: document.getElementById("voteTeamLabel"),
        qrLink: document.getElementById("voteQrLink"),
        qrImage: document.getElementById("qrImage")
    };
}

function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));

    const target = document.getElementById(`screen-${screenId}`);
    if (!target) return;

    target.classList.add("active");
    currentScreen = screenId;

    if (screenId === "team") {
        const logo = ensureTeamScreen();
        logo.classList.remove("team-logo-show");
        void logo.offsetWidth;
        logo.classList.add("team-logo-show");
    }

    if (screenId === "round-transition") {
        const roundText = document.getElementById("roundTransitionText");
        if (roundText) {
            roundText.style.animation = "none";
            void roundText.offsetHeight;
            roundText.style.animation = "";
        }
    }
}

function createSparkles() {
    const field = document.getElementById("sparkleField");
    if (!field) return;

    for (let i = 0; i < 30; i += 1) {
        const sparkle = document.createElement("div");
        sparkle.className = "sparkle";
        sparkle.textContent = "✦";
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        sparkle.style.animationDelay = `${Math.random() * 4}s`;
        sparkle.style.fontSize = `${12 + Math.random() * 16}px`;
        field.appendChild(sparkle);
    }
}

function initWheel() {
    canvas = document.getElementById("wheelCanvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");
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
    if (words.length === 3) return [`${words[0]} ${words[1]}`, words[2]];
    return [`${words[0]} ${words[1]}`, words.slice(2).join(" ")];
}

function drawWheel(rotationDeg = 0) {
    if (!ctx) return;

    const rotationRad = (rotationDeg * Math.PI) / 180;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < numSlices; i += 1) {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, wedgeOuterRadius, startAngle, endAngle);
        ctx.closePath();

        const sliceGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, wedgeOuterRadius);
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

    for (let i = 0; i < numSlices * 2; i += 1) {
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

    const capGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
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

    for (let i = 0; i < numSlices; i += 1) {
        const localMidAngle = i * sliceAngle + sliceAngle / 2;
        const globalAngle = (localMidAngle + rotationRad) % (2 * Math.PI);
        const effectiveAngle = globalAngle >= 0 ? globalAngle : globalAngle + 2 * Math.PI;
        const isLeftSide = effectiveAngle > Math.PI / 2 && effectiveAngle < (3 * Math.PI) / 2;
        const outerBoundConstraint = wedgeOuterRadius - 15;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(localMidAngle + rotationRad);
        ctx.fillStyle = "#111";

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
                for (let j = 0; j < lines.length; j += 1) {
                    ctx.fillText(lines[j], -outerBoundConstraint, (j - (lines.length - 1) / 2) * lineSpacing);
                }
            } else {
                ctx.textAlign = "right";
                for (let j = 0; j < lines.length; j += 1) {
                    ctx.fillText(lines[j], outerBoundConstraint, (j - (lines.length - 1) / 2) * lineSpacing);
                }
            }
        }

        ctx.restore();
    }
}

function spinWheel() {
    if (isSpinning) return;

    hidePopup();
    isSpinning = true;

    let targetText;
    if (riggedTargets.length > 0) {
        targetText = riggedTargets.pop();
    } else {
        const fallback = categories.filter((category) => category.text !== "");
        targetText = fallback[Math.floor(Math.random() * fallback.length)].text;
    }

    const targetIndex = categories.findIndex((category) => category.text === targetText);
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
            return;
        }

        isSpinning = false;
        wheelHasSpun = true;
        currentRotation = nowRotation;
        currentCategory = `${targetText} Category`;

        const popupText = document.getElementById("popupText");
        const popupOverlay = document.getElementById("popupOverlay");
        const popupObj = document.getElementById("popupObj");

        if (popupText) popupText.textContent = targetText;
        if (popupOverlay) popupOverlay.classList.add("active");
        if (popupObj) popupObj.classList.add("show");
    }

    requestAnimationFrame(animate);
}

function generateVoteQR(round) {
    const qrImg = document.getElementById("qrImage");
    if (!qrImg) return;

    const formUrl = ROUND_FORM_URLS[round] || ROUND_FORM_URLS[1];
    const encodedUrl = encodeURIComponent(formUrl);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}&color=5c1d91&bgcolor=ffffff`;
}

function showTeam(teamKey) {
    const team = TEAMS[teamKey];
    if (!team) return;

    currentTeamKey = teamKey;
    const teamLogo = ensureTeamScreen();
    teamLogo.src = team.logo;
    teamLogo.alt = `${team.name} logo`;
    showScreen("team");
}

function showVoteScreen(round = currentRound, options = {}) {
    const { trackPerformance = true } = options;
    const resolvedTeamKey = currentTeamKey || DEFAULT_TEAM_KEY;
    const team = TEAMS[resolvedTeamKey];
    const voteUi = ensureVoteScreen();

    if (!team || !voteUi.teamLabel || !voteUi.roundLabel || !voteUi.categoryLabel || !voteUi.qrLink) {
        return;
    }

    currentTeamKey = resolvedTeamKey;
    currentRound = round;
    updateRoundIndicator();

    voteUi.teamLabel.textContent = team.name;
    voteUi.teamLabel.classList.toggle("vote-team-label--compact", team.name.length >= 16);
    voteUi.roundLabel.textContent = `Round ${round}`;
    voteUi.categoryLabel.textContent = currentCategory.toUpperCase();
    voteUi.qrLink.textContent = displayUrl(ROUND_FORM_URLS[round]);

    generateVoteQR(round);
    showScreen("vote");

    if (trackPerformance) {
        performedTeams.add(currentTeamKey);
    }
}

function showWheelForRound(round) {
    currentRound = round;
    isSpinning = false;
    wheelHasSpun = false;
    performedTeams = new Set();
    hidePopup();
    updateRoundIndicator();
    showScreen("wheel");
    initWheel();
    drawWheel(currentRotation);
}

function showVoteForRound(round) {
    currentRound = round;
    showVoteScreen(round, { trackPerformance: false });
}

function showRoundTransition() {
    currentRound += 1;

    if (currentRound > MAX_ROUNDS) {
        currentRound = 1;
        performedTeams = new Set();
        wheelHasSpun = false;
        currentCategory = DEFAULT_CATEGORY;
        shuffleRiggedTargets();
        showScreen("finale");
        return;
    }

    performedTeams = new Set();
    wheelHasSpun = false;
    document.getElementById("roundTransitionText").textContent = `Round ${currentRound}`;
    showScreen("round-transition");
}

document.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT") return;

    const key = (event.key || "").toLowerCase();
    const teamKey = getTeamKey(event);
    const wheelRound = getWheelShortcutRound(event);
    const voteRound = getVoteShortcutRound(event);

    if (isFinaleShortcut(event)) {
        event.preventDefault();
        showScreen("finale");
        return;
    }

    if (wheelRound) {
        event.preventDefault();
        showWheelForRound(wheelRound);
        return;
    }

    if (voteRound) {
        event.preventDefault();
        showVoteForRound(voteRound);
        return;
    }

    switch (currentScreen) {
        case "title":
            if (isSpaceKey(event)) {
                event.preventDefault();
                showWheelForRound(currentRound);
            }
            break;

        case "wheel":
            if (isSpaceKey(event) && !isSpinning && !wheelHasSpun) {
                event.preventDefault();
                spinWheel();
            }

            if (teamKey && wheelHasSpun && !isSpinning) {
                event.preventDefault();
                hidePopup();
                showTeam(teamKey);
            }

            if (key === "escape") {
                showScreen("title");
            }
            break;

        case "team":
            if (teamKey) {
                event.preventDefault();
                showTeam(teamKey);
            }

            if (isSpaceKey(event)) {
                event.preventDefault();
                showVoteScreen(currentRound, { trackPerformance: true });
            }

            if (key === "escape") {
                showScreen("wheel");
            }
            break;

        case "vote":
            if (teamKey && performedTeams.size < 5) {
                event.preventDefault();
                showTeam(teamKey);
            }

            if (isSpaceKey(event) && performedTeams.size >= 5) {
                event.preventDefault();
                showRoundTransition();
            }

            if (key === "escape") {
                showTeam(currentTeamKey);
            }
            break;

        case "round-transition":
            if (isSpaceKey(event)) {
                event.preventDefault();
                showWheelForRound(currentRound);
            }

            if (key === "escape") {
                showScreen("title");
            }
            break;

        case "finale":
            if (isSpaceKey(event) || key === "escape") {
                event.preventDefault();
                showScreen("title");
            }
            break;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    ensureTeamScreen();
    ensureVoteScreen();
    createSparkles();
    updateRoundIndicator();
    showScreen("title");

    const popupOverlay = document.getElementById("popupOverlay");
    if (popupOverlay) {
        popupOverlay.addEventListener("click", () => {
            // Leave the selected category visible until the operator advances.
        });
    }
});
