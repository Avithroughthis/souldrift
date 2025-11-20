document.getElementById("backButton").onclick = () => window.location.href="../index.html";

let now = new Date();
let currentDay = now.getDate();
let currentMonth = now.getMonth();
let currentYear = now.getFullYear();
const daysInThisMonth = new Date(currentYear,currentMonth+1,0).getDate();

const pastPanel = document.createElement("div");
pastPanel.id = "pastMonthsPanel";
document.body.appendChild(pastPanel);

const totalDays = document.getElementById("totalDays");
const suggestionBox = document.getElementById("smartSuggestion");

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
document.getElementById("title").innerHTML = "🌸"+months[currentMonth]+"🌸";

const habitTitle = document.getElementById("habitTitle");
habitTitle.onclick = () => {
    let habits = prompt("What's your habit?", habitTitle.innerText);
    habitTitle.innerText = habits && habits.length ? habits : "My New Habit";
};

let daysCompleted = 0;
const trackerDays = document.querySelectorAll(".day");
let loadedMonth = currentMonth;
let loadedYear = currentYear;

function loadMonth(month, year){
    loadedMonth = month; 
    loadedYear = year;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    daysCompleted = 0;

    document.getElementById("title").innerText = "🌸" + months[month] + " " + year + "🌸";

    trackerDays.forEach((box, index) => {
        const dayNumber = index + 1;
        if(dayNumber > daysInMonth){
            box.style.visibility = "hidden";
            box.classList.remove("day-filled","day-empty","today");
            return;
        }
        box.style.visibility = "visible";

        const key = `${month + 1}-${dayNumber}-${year}`;
        const saved = localStorage.getItem(key);

        box.classList.remove("day-filled","day-empty","today");
        if(saved === "true"){ 
            box.classList.add("day-filled"); 
            daysCompleted++; 
        } else { 
            box.classList.add("day-empty"); 
        }

        if(dayNumber === currentDay && month === currentMonth && year === currentYear){
            box.classList.add("today");
        }

        // Allow editing all past days, disable only future days in current month
        const allowEdit = !(year === currentYear && month === currentMonth && dayNumber > currentDay);

        box.onclick = () => {
            if(!allowEdit) return;
            const isFilled = localStorage.getItem(key) === "true";
            if(isFilled){ 
                localStorage.setItem(key,"false"); 
                box.classList.remove("day-filled"); 
                box.classList.add("day-empty"); 
                daysCompleted--; 
            } else { 
                localStorage.setItem(key,"true"); 
                box.classList.remove("day-empty"); 
                box.classList.add("day-filled"); 
                daysCompleted++; 
            }
            updateAnalytics(); 
            generateSmartSuggestion();
            updatePastMonthsPanel();
        };
    });

    totalDays.innerText = `${daysCompleted}/${daysInMonth}`;
    updateAnalytics(); 
    generateSmartSuggestion();
    updatePastMonthsPanel();
}

function generateSmartSuggestion(){
    const hour = new Date().getHours();
    let msg = "";
    if(daysCompleted === 0) msg = "A fresh start! Try completing your first day.";
    else if(daysCompleted < currentDay/2) msg = "You're behind — catch up?";
    else if(daysCompleted === currentDay) msg = "Perfect pace!";
    else if(daysCompleted > currentDay) msg = "You're ahead — keep momentum.";

    if(hour < 12) msg += " Morning energy!";
    else if(hour < 18) msg += " Afternoon is a good time!";
    else msg += " Wind down tonight.";

    suggestionBox.innerText = msg;
}

document.getElementById("resetButton").onclick = () => {
    if(!confirm("Reset all progress?")) return;
    trackerDays.forEach((box,index) => {
        const day = index + 1;
        const key = `${loadedMonth + 1}-${day}-${loadedYear}`;
        localStorage.removeItem(key);
        box.classList.remove("day-filled","day-empty","today");
        box.classList.add("day-empty");
        if(day === currentDay && loadedMonth === currentMonth && loadedYear === currentYear) box.classList.add("today");
    });
    daysCompleted = 0;
    totalDays.innerText = `${daysCompleted}/${new Date(loadedYear, loadedMonth + 1, 0).getDate()}`;
    generateSmartSuggestion(); 
    updateAnalytics();
    updatePastMonthsPanel();
};

function computeCompletionLikelihood(month = loadedMonth, year = loadedYear){
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let completed = 0;
    for(let d = 1; d <= daysInMonth; d++){
        if(localStorage.getItem(`${month + 1}-${d}-${year}`) === "true") completed++;
    }
    return Math.round((completed / daysInMonth) * 100);
}

function getCurrentStreak() {
    const daysInMonth = new Date(loadedYear, loadedMonth + 1, 0).getDate();
    const lastDay = (loadedMonth === currentMonth && loadedYear === currentYear) ? currentDay : daysInMonth;
    let streak = 0;
    for (let d = lastDay; d >= 1; d--) {
        if (localStorage.getItem(`${loadedMonth + 1}-${d}-${loadedYear}`) === "true") streak++;
        else break;
    }
    return streak;
}

function getLongestStreak(){
    let longest = 0, current = 0;
    const daysInMonth = new Date(loadedYear, loadedMonth + 1, 0).getDate();
    for(let d = 1; d <= daysInMonth; d++){
        if(localStorage.getItem(`${loadedMonth + 1}-${d}-${loadedYear}`) === "true"){ 
            current++; 
            if(current > longest) longest = current; 
        } else current = 0;
    }
    return longest;
}

function updateAnalytics(){
    const likelihood = computeCompletionLikelihood();
    const current = getCurrentStreak();
    const longest = getLongestStreak();
    analyticsCard.innerHTML = `<b>Analytics</b><br>ʚ🍓ɞ Likelihood: ${likelihood}%<br>ʚ🍓ɞ Current streak: ${current} day(s)<br>ʚ🍓ɞ Longest streak: ${longest} day(s)`;
}

function updatePastMonthsPanel() {
    pastPanel.innerHTML = "<b>Past Months</b><br>";

    for(let m = currentMonth; m >= 0; m--){
        const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
        let completedDays = 0;
        for(let d = 1; d <= daysInMonth; d++){
            if(localStorage.getItem(`${m + 1}-${d}-${currentYear}`) === "true") completedDays++;
        }
        const percent = Math.round((completedDays / daysInMonth) * 100);
        const btn = document.createElement("div");
        btn.innerText = `${months[m]} ${currentYear}: ${percent}%`;
        btn.onclick = () => loadMonth(m, currentYear);
        pastPanel.appendChild(btn);
    }
}

updatePastMonthsPanel();

const analyticsCard = document.createElement("div");
analyticsCard.id="analyticsCard";
document.getElementById("smartSuggestionBox").insertAdjacentElement("afterend", analyticsCard);

function computeCompletionLikelihood(month=loadedMonth,year=loadedYear){
    const daysInMonth = new Date(year,month+1,0).getDate();
    let completed=0;
    for(let d=1; d<=daysInMonth; d++){ if(localStorage.getItem(`${month+1}-${d}-${year}`)==="true") completed++; }
    return Math.round((completed/daysInMonth)*100);
}
function getCurrentStreak(){
    let streak=0;
    for(let d=currentDay; d>=1; d--){
        if(localStorage.getItem(`${loadedMonth+1}-${d}-${loadedYear}`)==="true") streak++;
        else break;
    }
    return streak;
}
function getLongestStreak(){
    let longest=0, current=0;
    const daysInMonth = new Date(loadedYear,loadedMonth+1,0).getDate();
    for(let d=1;d<=daysInMonth;d++){
        if(localStorage.getItem(`${loadedMonth+1}-${d}-${loadedYear}`)==="true"){ current++; if(current>longest) longest=current; }
        else current=0;
    }
    return longest;
}
function updateAnalytics(){
    const likelihood = computeCompletionLikelihood();
    const current = getCurrentStreak();
    const longest = getLongestStreak();
    analyticsCard.innerHTML=`<b>Analytics</b><br>ʚ🍓ɞ Likelihood: ${likelihood}%<br>ʚ🍓ɞ Current streak: ${current} day(s)<br>ʚ🍓ɞ Longest streak: ${longest} day(s)`;
}

loadMonth(currentMonth,currentYear);

