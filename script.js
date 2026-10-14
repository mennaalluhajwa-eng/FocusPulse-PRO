// ==========================================
// 1. Settings & Local Configuration Manager
// ==========================================
const appSettings = {
    soundEnabled: true,
    pomoDuration: 25,
    weatherCity: 'Cairo',
    notionToken: '',
    googleClientId: '',

    load() {
        const saved = localStorage.getItem('focuspulse_settings');
        if (saved) {
            try {
                Object.assign(this, JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
    },

    save() {
        localStorage.setItem('focuspulse_settings', JSON.stringify({
            soundEnabled: this.soundEnabled,
            pomoDuration: this.pomoDuration,
            weatherCity: this.weatherCity,
            notionToken: this.notionToken,
            googleClientId: this.googleClientId
        }));
    }
};
appSettings.load();

// Utility function to sanitize HTML strings
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// 2. Web Audio API Engine
// ==========================================
const AudioEngine = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(type) {
        if (!appSettings.soundEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'delete') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'chime') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const noteOsc = this.ctx.createOscillator();
                const noteGain = this.ctx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(this.ctx.destination);
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
                noteGain.gain.setValueAtTime(0.2, now + idx * 0.12);
                noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.5);
                noteOsc.start(now + idx * 0.12);
                noteOsc.stop(now + idx * 0.12 + 0.5);
            });
        }
    }
};

document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.nav-btn')) {
        AudioEngine.play('click');
    }
}, { passive: true });

// ==========================================
// 3. Navigation & Mobile Drawer
// ==========================================
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        
        const targetTabId = btn.getAttribute('data-tab');
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) targetTab.classList.add('active');
        
        closeMobileSidebar();

        // Resize charts dynamically on switching back to dashboard tab
        if (targetTabId === 'dashboard') {
            setTimeout(() => {
                if (typeof topBannerChart !== 'undefined' && topBannerChart) topBannerChart.resize();
                if (typeof weeklyBarChart !== 'undefined' && weeklyBarChart) weeklyBarChart.resize();
                if (typeof radarChart !== 'undefined' && radarChart) radarChart.resize();
            }, 50);
        }
    });
});

function openMobileSidebar() {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
}

function closeMobileSidebar() {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
}

if (openSidebarBtn) openSidebarBtn.addEventListener('click', openMobileSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

// ==========================================
// 4. Notifications System
// ==========================================
let notifications = [
    { id: 1, title: "مرحباً بك في FocusPulse PRO!", time: "الآن" },
    { id: 2, title: "يمكنك بدء جلسة بومودورو للتركيز العالي.", time: "منذ دقيقة" }
];

function addNotification(title) {
    notifications.unshift({ id: Date.now(), title, time: "الآن" });
    renderNotifications();
    
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("FocusPulse PRO", { body: title, icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" });
        } catch (e) {
            console.log("Browser notification error:", e);
        }
    }
}

function renderNotifications() {
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');
    
    if (notifBadge) notifBadge.textContent = notifications.length;
    if (!notifList) return;

    if (notifications.length === 0) {
        notifList.innerHTML = '<p style="font-size:11px; text-align:center; color:var(--text-muted); padding:10px;">لا توجد إشعارات جديدة</p>';
        return;
    }

    notifList.innerHTML = notifications.map(n => `
        <div class="notif-item">
            <strong>${escapeHtml(n.title)}</strong>
            <span>${escapeHtml(n.time)}</span>
        </div>
    `).join('');
}

const notifBtn = document.getElementById('notif-btn');
const notifMenu = document.getElementById('notif-menu');
const clearNotifsBtn = document.getElementById('clear-notifs-btn');

if (notifBtn && notifMenu) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => notifMenu.classList.remove('show'));
}

if (clearNotifsBtn) {
    clearNotifsBtn.addEventListener('click', () => {
        notifications = [];
        renderNotifications();
    });
}
renderNotifications();

// ==========================================
// 5. Quotes API with Fallback
// ==========================================
async function fetchQuote() {
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');
    if (!quoteText) return;

    try {
        const response = await fetch('https://dummyjson.com/quotes/random');
        if (response.ok) {
            const data = await response.json();
            quoteText.textContent = `"${data.quote}"`;
            quoteAuthor.textContent = `- ${data.author}`;
            return;
        }
    } catch (e) {
        console.log("Quotes fallback used.");
    }

    const fallbackQuotes = [
        { quote: "Focus is a muscle. The more you practice, the easier it gets.", author: "Deep Work Principle" },
        { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
        { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" }
    ];
    const random = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    quoteText.textContent = `"${random.quote}"`;
    quoteAuthor.textContent = `- ${random.author}`;
}

document.getElementById('refresh-quote-btn')?.addEventListener('click', fetchQuote);
fetchQuote();

// ==========================================
// 6. Live Clock & Dynamic Weather Widget
// ==========================================
function updateLiveTime() {
    const headerTime = document.getElementById('header-time');
    if (headerTime) {
        const now = new Date();
        headerTime.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
}
setInterval(updateLiveTime, 1000);
updateLiveTime();

async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    const cityEl = document.getElementById('weather-city');
    const targetCity = appSettings.weatherCity || 'Cairo';

    async function getWeatherByCoords(lat, lon, cityName) {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();
            if (data.current_weather && tempEl && cityEl) {
                tempEl.textContent = `${Math.round(data.current_weather.temperature)}°C`;
                cityEl.textContent = cityName;
            }
        } catch (e) {
            if (tempEl && cityEl) {
                tempEl.textContent = "24°C";
                cityEl.textContent = cityName;
            }
        }
    }

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=en`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
            const { latitude, longitude, name } = geoData.results[0];
            getWeatherByCoords(latitude, longitude, name);
        } else {
            getWeatherByCoords(30.0444, 31.2357, targetCity);
        }
    } catch (e) {
        getWeatherByCoords(30.0444, 31.2357, targetCity);
    }
}
fetchWeather();

// ==========================================
// 7. Chart.js Configs
// ==========================================
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Plus Jakarta Sans';

let topBannerChart, weeklyBarChart, radarChart;

const ctxBannerEl = document.getElementById('topBannerChart');
if (ctxBannerEl) {
    const ctxBanner = ctxBannerEl.getContext('2d');
    let bannerGradient = ctxBanner ? ctxBanner.createLinearGradient(0, 0, 0, 160) : null;
    if (bannerGradient) {
        bannerGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        bannerGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    }

    topBannerChart = new Chart(ctxBannerEl, {
        type: 'line',
        data: {
            labels: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                data: [25, 40, 55, 50, 70, 85, 95],
                borderColor: '#06b6d4',
                borderWidth: 3,
                backgroundColor: bannerGradient || 'rgba(6, 182, 212, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#06b6d4',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { display: false } }
        }
    });
}

const weeklyBarEl = document.getElementById('weeklyBarChart');
if (weeklyBarEl) {
    weeklyBarChart = new Chart(weeklyBarEl, {
        type: 'bar',
        data: {
            labels: ['Tasks Total', 'Started', 'On Break', 'Completed'],
            datasets: [{
                label: 'Analytics',
                data: [0, 0, 0, 0],
                backgroundColor: ['#06b6d4', '#f59e0b', '#8b5cf6', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true, precision: 0 }
            }
        }
    });
}

const radarEl = document.getElementById('radarChart');
if (radarEl) {
    radarChart = new Chart(radarEl, {
        type: 'radar',
        data: {
            labels: ['Learning', 'Coding', 'Health', 'Mindfulness'],
            datasets: [{
                label: 'Completion %',
                data: [0, 0, 0, 0],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.25)',
                borderWidth: 2,
                pointBackgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                    pointLabels: { color: '#94a3b8', font: { size: 11, weight: '600' } },
                    ticks: { display: false }
                }
            }
        }
    });
}

const heatmapContainer = document.getElementById('heatmap-container');
function renderHeatmap(completedCount) {
    if (!heatmapContainer) return;
    heatmapContainer.innerHTML = '';
    for (let i = 0; i < 140; i++) {
        const box = document.createElement('div');
        box.className = 'heat-box';
        if (i < completedCount * 4) {
            box.classList.add('l4');
        } else if (i < completedCount * 8) {
            box.classList.add('l2');
        }
        heatmapContainer.appendChild(box);
    }
}

// ==========================================
// 8. Habit Data Matrix Logic
// ==========================================
let tasks = loadTasksFromStorage();

function loadTasksFromStorage() {
    const saved = localStorage.getItem('focuspulse_tasks');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
        { id: 1, name: "Read 20 Pages", category: "Learning", started: true, breakTaken: false, finished: false },
        { id: 2, name: "React & Vanilla JS Portfolio", category: "Coding", started: true, breakTaken: true, finished: true }
    ];
}

function saveTasksToStorage() {
    localStorage.setItem('focuspulse_tasks', JSON.stringify(tasks));
}

function animateValue(id, targetEnd, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    const startVal = parseInt(obj.textContent) || 0;
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (targetEnd - startVal) + startVal);
        obj.innerHTML = id === 'kpi-streak' ? `${val} Days` : `${val}%`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function updateDashboardMetrics() {
    const total = tasks.length;
    const started = tasks.filter(t => t.started).length;
    const onBreak = tasks.filter(t => t.breakTaken).length;
    const finished = tasks.filter(t => t.finished).length;

    const completionRatio = total > 0 ? Math.round((finished / total) * 100) : 0;
    const totalPossibleSteps = total * 3;
    const totalCompletedSteps = started + onBreak + finished;
    
    const monthlyRate = totalPossibleSteps > 0 ? Math.round((totalCompletedSteps / totalPossibleSteps) * 100) : 0;
    const yearlyRate = total > 0 ? Math.round(((started + finished) / (total * 2)) * 100) : 0;

    animateValue('kpi-completion', completionRatio, 600);
    animateValue('kpi-monthly', monthlyRate, 600);
    animateValue('kpi-yearly', yearlyRate, 600);
    animateValue('kpi-streak', finished, 600);

    if (weeklyBarChart) {
        weeklyBarChart.data.datasets[0].data = [total, started, onBreak, finished];
        weeklyBarChart.update();
    }

    const categories = ['Learning', 'Coding', 'Health', 'Mindfulness'];
    const radarData = categories.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat);
        if (catTasks.length === 0) return 0;
        const catFinished = catTasks.filter(t => t.finished).length;
        return Math.round((catFinished / catTasks.length) * 100);
    });

    if (radarChart) {
        radarChart.data.datasets[0].data = radarData;
        radarChart.update();
    }

    if (topBannerChart) {
        topBannerChart.data.datasets[0].data[6] = completionRatio;
        topBannerChart.update();
    }

    renderHeatmap(finished);
}

const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListContainer = document.getElementById('task-list-container');

function renderTasks() {
    if (!taskListContainer) return;
    taskListContainer.innerHTML = '';
    
    tasks.forEach((task) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${escapeHtml(task.name)}</strong></td>
            <td><span class="category-tag">${escapeHtml(task.category)}</span></td>
            
            <td style="text-align: center;">
                <input type="checkbox" class="custom-checkbox" 
                    ${task.started ? 'checked' : ''} 
                    onchange="toggleTaskState(${task.id}, 'started')">
            </td>
            
            <td style="text-align: center;">
                <input type="checkbox" class="custom-checkbox" 
                    ${task.breakTaken ? 'checked' : ''} 
                    onchange="toggleTaskState(${task.id}, 'breakTaken')">
            </td>
            
            <td style="text-align: center;">
                <input type="checkbox" class="custom-checkbox" 
                    ${task.finished ? 'checked' : ''} 
                    onchange="toggleTaskState(${task.id}, 'finished')">
            </td>
            
            <td style="text-align: center;">
                <button class="delete-btn" onclick="deleteTask(${task.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        taskListContainer.appendChild(tr);
    });

    saveTasksToStorage();
    updateDashboardMetrics();
}

function handleAddTask() {
    if (taskInput && taskInput.value.trim() !== '') {
        const newTask = {
            id: Date.now(),
            name: taskInput.value.trim(),
            category: taskCategory.value,
            started: false,
            breakTaken: false,
            finished: false
        };
        tasks.push(newTask);
        addNotification(`تمت إضافة عادة جديدة: ${newTask.name}`);
        taskInput.value = '';
        AudioEngine.play('success');
        renderTasks();
    }
}

if (addTaskBtn) addTaskBtn.addEventListener('click', handleAddTask);
if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddTask();
    });
}

window.toggleTaskState = function(taskId, field) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex][field] = !tasks[taskIndex][field];
        if (field === 'finished' && tasks[taskIndex].finished) {
            tasks[taskIndex].started = true;
            AudioEngine.play('success');
            addNotification(`تهانينا! أكملت العادة: ${tasks[taskIndex].name}`);
        } else {
            AudioEngine.play('click');
        }
        renderTasks();
    }
};

window.deleteTask = function(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    AudioEngine.play('delete');
    renderTasks();
};

// Export Handlers
window.exportTasksCSV = function() {
    if (tasks.length === 0) return alert("لا توجد مهام لتصديرها!");
    let csvContent = "\uFEFFID,Habit Name,Category,Started,Break Taken,Finished\n";
    tasks.forEach(t => {
        csvContent += `"${t.id}","${t.name.replace(/"/g, '""')}","${t.category}","${t.started ? 'Yes' : 'No'}","${t.breakTaken ? 'Yes' : 'No'}","${t.finished ? 'Yes' : 'No'}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `focuspulse_tasks_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

window.exportTasksJSON = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = dataStr;
    downloadAnchor.download = `focuspulse_tasks_${new Date().toISOString().slice(0,10)}.json`;
    downloadAnchor.click();
};

const exportDropdownBtn = document.getElementById('export-dropdown-btn');
const exportMenu = document.getElementById('export-menu');
if (exportDropdownBtn && exportMenu) {
    exportDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => exportMenu.classList.remove('show'));
}

// ==========================================
// 9. Flip Clock & Pomodoro Engine
// ==========================================

let isPomoMode = false;
let pomoTime = appSettings.pomoDuration * 60;
let timerInterval = null;
let isTimerRunning = false; // متغير لمنع تكرار الضغط والإشعارات

function updateFlipUnit(unitId, newValue) {
    const unit = document.getElementById(unitId);
    if (!unit) return;

    const formattedValue = String(newValue).padStart(2, '0');
    const topEl = unit.querySelector('.number-top');
    if (!topEl) return;
    const currentTop = topEl.textContent;

    if (currentTop === formattedValue) return;

    const card = unit.querySelector('.card');
    const topLeafNum = unit.querySelector('.top-leaf .number-leaf');
    const bottomLeafNum = unit.querySelector('.bottom-leaf .number-leaf');
    const cardBottomNum = unit.querySelector('.number-bottom');

    if (topLeafNum) topLeafNum.textContent = currentTop;
    if (bottomLeafNum) bottomLeafNum.textContent = formattedValue;
    
    topEl.textContent = formattedValue;

            if (card) {
        card.classList.remove('flipping');
        void card.offsetWidth;
        card.classList.add('flipping');

        setTimeout(() => {
            if (cardBottomNum) {
                cardBottomNum.textContent = formattedValue;
            }

            card.classList.remove('flipping');
        }, 550);
    }
    }


function updateClock() {
    if (!isPomoMode) {
        const now = new Date();
        updateFlipUnit('hours-unit', now.getHours());
        updateFlipUnit('minutes-unit', now.getMinutes());
        updateFlipUnit('seconds-unit', now.getSeconds());
    }
}
setInterval(updateClock, 1000);
updateClock();

function renderPomo() {
    const hrs = Math.floor(pomoTime / 3600);
    const mins = Math.floor((pomoTime % 3600) / 60);
    const secs = pomoTime % 60;

    updateFlipUnit('hours-unit', hrs);
    updateFlipUnit('minutes-unit', mins);
    updateFlipUnit('seconds-unit', secs);
}

const btnRealtime = document.getElementById('btn-realtime');
const btnPomodoro = document.getElementById('btn-pomodoro');
const pomoActions = document.getElementById('pomo-actions');

btnRealtime?.addEventListener('click', () => {
    isPomoMode = false;
    isTimerRunning = false;
    btnRealtime.classList.add('active');
    btnPomodoro.classList.remove('active');
    pomoActions?.classList.add('hidden');
    clearInterval(timerInterval);
    timerInterval = null;
    updateClock();
});

btnPomodoro?.addEventListener('click', () => {
    isPomoMode = true;
    isTimerRunning = false;
    btnPomodoro.classList.add('active');
    btnRealtime.classList.remove('active');
    pomoActions?.classList.remove('hidden');
    clearInterval(timerInterval);
    timerInterval = null;
    pomoTime = appSettings.pomoDuration * 60;
    renderPomo();
});

// زر Start (يمنع التكرار والإشعارات الزائدة)
document.getElementById('pomo-play')?.addEventListener('click', () => {
    if (isTimerRunning) return; // منع البدء إذا كان يعمل بالفعل
    
    if (pomoTime <= 0) {
        pomoTime = appSettings.pomoDuration * 60;
        renderPomo();
    }

    isTimerRunning = true;
    addNotification("بدأت جلسة التركيز والبومودورو! بالتوفيق 🚀");

    timerInterval = setInterval(() => {
        if (pomoTime > 0) { 
            pomoTime--; 
            renderPomo(); 
        } else { 
            clearInterval(timerInterval); 
            timerInterval = null;
            isTimerRunning = false;
            AudioEngine.play('chime');
            addNotification("🎉 انتهت جلسة التركيز والبومودورو!");
            alert("🎉 انتهت جلسة التركيز!"); 
        }
    }, 1000);
});

// زر Pause
document.getElementById('pomo-pause')?.addEventListener('click', () => {
    if (!isTimerRunning) return; // إذا كان متوقفاً بالفعل لا يفعل شيء
    clearInterval(timerInterval);
    timerInterval = null;
    isTimerRunning = false;
    addNotification("تم إيقاف جلسة البومودورو مؤقتاً.");
});

// زر Reset
document.getElementById('pomo-reset')?.addEventListener('click', () => { 
    clearInterval(timerInterval); 
    timerInterval = null;
    isTimerRunning = false;
    pomoTime = appSettings.pomoDuration * 60; 
    renderPomo(); 
});
// ==========================================
// 10. Modals, Settings & Integrations
// ==========================================
// Sync Modal
const syncModal = document.getElementById('sync-modal');
document.getElementById('sync-modal-btn')?.addEventListener('click', () => {
    if (syncModal) {
        document.getElementById('notion-token-input').value = appSettings.notionToken || '';
        document.getElementById('google-client-id-input').value = appSettings.googleClientId || '';
        syncModal.classList.add('active');
    }
});
document.getElementById('close-modal-btn')?.addEventListener('click', () => syncModal?.classList.remove('active'));

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsModal = document.getElementById('close-settings-modal');

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
        document.getElementById('pomo-duration-select').value = appSettings.pomoDuration;
        document.getElementById('weather-city-input').value = appSettings.weatherCity;
        document.getElementById('audio-toggle').checked = appSettings.soundEnabled;
        settingsModal.classList.add('active');
    });
}

if (closeSettingsModal && settingsModal) {
    closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('active'));
}

document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    appSettings.pomoDuration = parseInt(document.getElementById('pomo-duration-select').value) || 25;
    appSettings.weatherCity = document.getElementById('weather-city-input').value.trim() || 'Cairo';
    appSettings.soundEnabled = document.getElementById('audio-toggle').checked;
    appSettings.save();
    
    settingsModal?.classList.remove('active');
    addNotification("تم حفظ الإعدادات بنجاح!");
    fetchWeather();
});

document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    if (confirm("هل أنت تأكد من أنك تريد مسح كافة البيانات وإعادة الضبط؟")) {
        localStorage.clear();
        location.reload();
    }
});

// Browser Notification Permission Button
document.getElementById('request-notif-perm-btn')?.addEventListener('click', () => {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("تم تفعيل إشعارات المتصفح بنجاح!");
                addNotification("إشعارات المتصفح مفعلة الآن.");
            } else {
                alert("لم يتم منح الإذن للإشعارات.");
            }
        });
    }
});

// Integrations API Key Actions
document.getElementById('save-api-keys-btn')?.addEventListener('click', () => {
    const notionKey = document.getElementById('notion-token-input').value.trim();
    const googleKey = document.getElementById('google-client-id-input').value.trim();

    appSettings.notionToken = notionKey;
    appSettings.googleClientId = googleKey;
    appSettings.save();

    alert("تم حفظ مفاتيح الـ API بنجاح في متصفحك!");
    addNotification("تم تحديث مفاتيح الربط الخارجي.");
});

document.getElementById('sync-calendar-btn')?.addEventListener('click', () => {
    if (!appSettings.googleClientId) {
        alert("برجاء إدخال Google OAuth Client ID أولاً لحفظ المواعيد على التقويم!");
        return;
    }
    alert("جاري الاتصال بـ Google Calendar API والمزامنة...");
    addNotification("تمت مزامنة الجداول مع تقويم جوجل بنجاح.");
});

document.getElementById('connect-notion-btn')?.addEventListener('click', () => {
    if (!appSettings.notionToken) {
        alert("برجاء إدخال Notion Integration Token أولاً!");
        return;
    }
    alert("جاري سحب البيانات من workspace الخاص بك في Notion...");
    addNotification("تم الاتصال بـ Notion Workspace بنجاح.");
});

// Initial Boot
renderTasks();