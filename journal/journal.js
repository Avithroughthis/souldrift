const backButton = document.getElementById("backButton");
backButton.addEventListener("click", () => {
    window.location.href = "../index.html"; 
});

const MOOD_KEY = "souldrift_mood";
const JOURNAL_KEY = "souldrift_journal";

let moodHistory = JSON.parse(localStorage.getItem(MOOD_KEY) || "{}");
let journalHistory = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}");

const calendarRow = document.getElementById("calendarRow");
const popup = document.getElementById("dayJournalPopup");
const popupDate = document.getElementById("popupDate");
const popupText = document.getElementById("popupJournalText");
const saveBtn = document.getElementById("saveDayJournal");
const deleteBtn = document.getElementById("deleteDayJournal");
const closeBtn = document.getElementById("closePopup");
const moodButtons = document.querySelectorAll(".mood-btn");
const mlModelState = document.getElementById("mlModelState");
const statusText = document.getElementById("statusText");
const companionReply = document.getElementById("companionReply");

const avgSentimentEl = document.getElementById("avgSentiment");
const last7El = document.getElementById("last7");
const entryCountEl = document.getElementById("entryCount");
const streakEl = document.getElementById("streak");
const analyticsText = document.getElementById("analyticsText");
const avgSentSmall = document.getElementById("avgSentSmall");

let currentDay = null;
let selectedMood = null;
let useModel = null;               
let protoEmbeddings = null;        
const prototypes = {
  happy: "i am happy. i feel good and cheerful.",
  neutral: "i feel okay. nothing special, i'm neutral.",
  sad: "i feel sad, down, and upset."
};

const now = new Date();
const TODAY = now.getDate();
const CUR_MONTH = now.getMonth();
const CUR_YEAR = now.getFullYear();
const DAYS_IN_MONTH = new Date(CUR_YEAR, CUR_MONTH + 1, 0).getDate();

const moodIcons = {
  happy: "/journal/J/happy.png",
  neutral:"/journal/J/neutral.png",
  sad: "/journal/J/sad.png",
  blank: "/journal/J/blank.png"
};

function showCuteModalError() {
  document.getElementById("cuteErrorOverlay").classList.remove("hidden");

  document.getElementById("cuteErrorOk").onclick = () => {
    document.getElementById("cuteErrorOverlay").classList.add("hidden");
  };
}

let chart = null;

async function loadUSE() {
  try {
    mlModelState.textContent = "loading model…";
    
    useModel = await window.use.load();
    mlModelState.textContent = "model loaded";
    
    const texts = Object.values(prototypes);
    const embeddings = await useModel.embed(texts);
    protoEmbeddings = await embeddings.array();
  } catch (err) {
    console.error("Failed to load USE:", err);
    mlModelState.textContent = "model failed to load";
  }
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function analyzeWithUSE(text) {
  if (!useModel || !protoEmbeddings) {
    
    return fallbackAnalyze(text);
  }
  const embTensor = await useModel.embed([text]);
  const embArr = await embTensor.array();
  const emb = embArr[0];

  const sims = {
    happy: cosine(emb, protoEmbeddings[0]),
    neutral: cosine(emb, protoEmbeddings[1]),
    sad: cosine(emb, protoEmbeddings[2])
  };

  let mood = "neutral";
  let best = -Infinity;
  for (const k of Object.keys(sims)) {
    if (sims[k] > best) { best = sims[k]; mood = k; }
  }

  const score = (sims.happy - sims.sad); 
  const norm = Math.max(-1, Math.min(1, score));
  return { mood, score: Number(norm.toFixed(3)), sims };
}


function fallbackAnalyze(text) {
  if (!text || !text.trim()) return { mood: "blank", score: 0 };
  const t = text.toLowerCase();
  if (/(happy|joy|glad|good|great|love|yay)/.test(t)) return { mood: "happy", score: 0.7 };
  if (/(sad|down|upset|lonely|cry|depressed)/.test(t)) return { mood: "sad", score: -0.7 };
  return { mood: "neutral", score: 0.0 };
}

function renderCalendar(){
  calendarRow.innerHTML = "";
  for (let day = 1; day <= DAYS_IN_MONTH; day++) {
    const mood = moodHistory[day] || "blank";
    const dayBox = document.createElement("div");
    dayBox.className = "day";
    if (day === TODAY) dayBox.classList.add("active", "today");
    
    const imgSrc = moodIcons[mood] || moodIcons.blank;
    dayBox.innerHTML = `<span class="day-number">${day}</span><img class="day-mood-img" src="${imgSrc}" alt="${mood}">`;
    dayBox.addEventListener("click", () => openDayJournal(day));
    calendarRow.appendChild(dayBox);
  }
  computeAnalytics();
}

function openDayJournal(day) {
  const today = new Date().getDate();
  const entryExists = Boolean(journalHistory[day]);

  if (day > today && !entryExists) {
    showCuteModalError("You can’t write entries from the future! 💫");
    return;
  }

  currentDay = day;
  popupDate.textContent = `Day ${day}`;
  popupText.value = journalHistory[day] || "";
  selectedMood = moodHistory[day] || null;

  moodButtons.forEach(b =>
    b.classList.toggle("selected", b.dataset.mood === selectedMood)
  );

  popup.classList.remove("hidden");
  popup.setAttribute("aria-hidden", "false");
  popupText.focus();
}

function closePopup() {
  popup.classList.add("hidden");
  popup.setAttribute("aria-hidden", "true");
  currentDay = null;
  selectedMood = null;
  moodButtons.forEach(b => b.classList.remove("selected"));
  
  
}

saveBtn.addEventListener("click", async () => {
  if (!currentDay) return;

  const today = new Date().getDate();
  if (currentDay > today) {
    showCuteModalError("You can’t write entries from the future! 💫");
    return;
  }

  const text = popupText.value.trim();

  if (!text && (!selectedMood || selectedMood === "clear")) {
    deleteEntry(currentDay);
    closePopup();
    renderCalendar();
    return;
  }

  let moodResult = null;
  if (selectedMood && selectedMood !== "clear") {
    moodResult = { mood: selectedMood, score: selectedMood === "happy" ? 0.8 : (selectedMood === "sad" ? -0.8 : 0.0) };
  } else {
    mlModelState.textContent = "analyzing…";
    try {
      moodResult = await analyzeWithUSE(text || "");
      mlModelState.textContent = "model ready";
    } catch (err) {
      console.error(err);
      moodResult = fallbackAnalyze(text);
      mlModelState.textContent = "analysis fallback";
    }
  }

  if (text) journalHistory[currentDay] = text;
  else delete journalHistory[currentDay];

  moodHistory[currentDay] = moodResult.mood || "neutral";

  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalHistory));
  localStorage.setItem(MOOD_KEY, JSON.stringify(moodHistory));

  showCompanionReply(moodResult, text);

  closePopup();
  renderCalendar();
  renderChart();
});

deleteBtn.addEventListener("click", () => {
  if (!currentDay) return;
  const today = new Date().getDate();
  if (currentDay > today) {
    showCuteModalError("You can’t delete future entries! 💫");
    return;
  }
  deleteEntry(currentDay);
  closePopup();
  renderCalendar();
  renderChart();
});

function deleteEntry(day) {
  delete journalHistory[day];
  delete moodHistory[day];
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journalHistory));
  localStorage.setItem(MOOD_KEY, JSON.stringify(moodHistory));
}

moodButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const m = btn.dataset.mood;
    if (m === "clear") {
      selectedMood = null;
      moodButtons.forEach(b => b.classList.remove("selected"));
      return;
    }
    selectedMood = m;
    moodButtons.forEach(b => b.classList.toggle("selected", b === btn));
  });
});

closeBtn.addEventListener("click", closePopup);

function showCompanionReply(moodResult, journalText = "") {
  const mood = moodResult.mood || "neutral";
  const score = moodResult.score || 0;
  let reply = "";

  if (mood === "happy") {
    if (score > 0.6) reply = "I love hearing that — keep shining! 🌟";
    else reply = "That’s lovely — glad you had a nice moment today. 😊";
  } else if (mood === "sad") {
    if (score < -0.6) reply = "I’m really sorry you feel that way. I’m here — want to breathe together? 💙";
    else reply = "It’s okay to have low days. I’m with you — tell me more when you’re ready.";
  } else if (mood === "neutral") {
    reply = "Thanks for sharing — small steps add up. Want a coping tip?";
  } else {
    reply = "Thanks for writing — I'm listening.";
  }

  if (/anxi|panic|nervous|worry/i.test(journalText)) {
    reply = "I see some worry there. Try a 4-4-4 breathing: inhale 4s, hold 4s, exhale 4s. 🌿";
  }

  companionReply.textContent = reply;
  companionReply.classList.add("show");
  setTimeout(() => companionReply.classList.remove("show"), 6000);
}

function computeAnalytics() {
  const sentiments = [];
  let entries = 0;

  const now = new Date();
  const today = now.getDate();

  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    const text = journalHistory[d] || "";
    if (text) entries++;
    const mood = moodHistory[d];
    const s = mood === "happy" ? 1 : mood === "sad" ? -1 : (text ? 0 : null);
    sentiments.push(s);
  }

  const valid = sentiments.filter(v => v !== null);
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
  avgSentimentEl.textContent = (avg >= 0 ? "+" : "") + avg.toFixed(2);
  avgSentSmall.textContent = (avg >= 0 ? "+" : "") + avg.toFixed(2);

  last7El.textContent = computeLast7(sentiments, today).toFixed(2);
  entryCountEl.textContent = entries;
  streakEl.textContent = computeBestStreak();

  const labels = Array.from({ length: DAYS_IN_MONTH }, (_, i) => String(i + 1));
  const data = sentiments.map(v => v === null ? 0 : v);
  renderChart(labels, data);

  let insight = "";
  if (avg >= 0.5) insight = "Overall positive month — lovely! 🐻‍❄️";
  else if (avg <= -0.5) insight = "More low days than usual — consider reaching out.";
  else insight = "Mixed month. Small habits can brighten things.";

  analyticsText.textContent = insight;
}

function computeLast7(arr, today) {
  const last7 = [];
  for (let i = today - 7; i < today; i++) {
    if (i >= 0 && arr[i] !== null) last7.push(arr[i]);
  }
  if (!last7.length) return 0;
  return last7.reduce((a, b) => a + b, 0) / last7.length;
}

function computeBestStreak() {
  let best = 0, cur = 0;
  for (let d = 1; d <= DAYS_IN_MONTH; d++) {
    if (moodHistory[d] === "happy") { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  return best;
}

// map mood strings → numeric values
const moodMap = {
  "happy": 1,
  "neutral": 0,
  "sad": -1
};

function buildChartData() {
  const entries = JSON.parse(localStorage.getItem("souldrift_mood") || "{}");

  const labels = [];
  const data = [];

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const days = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= days; day++) {
    labels.push(day);

    const mood = entries[day]; // simple day key

    if (mood) {
      data.push(moodMap[mood] ?? null);
    } else {
      data.push(null);
    }
  }

  return { labels, data };
}


function renderChart() {
  const canvas = document.getElementById("sentimentChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // destroy previous chart
  if (chart) {
    chart.destroy();
  }

  const { labels, data } = buildChartData();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Mood Trend",
          data,
          borderColor: "#e84a5f",
          backgroundColor: "rgba(232, 74, 95, 0.20)",
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 7,
          fill: true,
          spanGaps: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: -1,
          max: 1,
          ticks: {
            callback: (v) =>
              v === 1 ? "😊" :
              v === 0 ? "😐" :
              v === -1 ? "☹️" : v
          }
        }
      }
    }
  });
}


function loadAllMoods() {
  let stored = localStorage.getItem("souldrift_mood");
  if (!stored) return {};

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Could not parse stored moods", e);
    return {};
  }
}

// global variable
let moodData = loadAllMoods();

function init() {
  loadUSE()
    .then(() => mlModelState.textContent = "model ready")
    .catch(() => mlModelState.textContent = "model error");

  renderCalendar();
  computeAnalytics();
  renderChart();
}

init();