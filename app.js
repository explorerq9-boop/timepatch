(function() {
'use strict';

// ================================================================
// MODULE 0: 常量与默认数据
// ================================================================
const SUB_PALETTE = ['#4e79a7','#f28e2c','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];

const DEFAULT_CATEGORIES = [
    { id: 'sleep', name: '睡觉', color: '#e868b0', subCategories: ['睡眠','午休'] },
    { id: 'study', name: '学习', color: '#ff8a3c', subCategories: ['阅读','上课','备考'] },
    { id: 'work', name: '工作', color: '#e6b82e', subCategories: ['文档','会议','沟通'] },
    { id: 'idle', name: '开小差', color: '#a2b83c', subCategories: ['玩手机','刷视频'] },
    { id: 'sport', name: '运动', color: '#26a6b8', subCategories: ['跑步','健身'] },
    { id: 'life', name: '生活', color: '#9e7cc1', subCategories: ['吃饭','通勤'] }
];

// ================================================================
// MODULE 1: 工具函数
// ================================================================
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag] || tag));
}

function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDay(d) {
    return '周' + ['日','一','二','三','四','五','六'][d.getDay()];
}

function formatRangeText(start, end, period) {
    const y1=start.getFullYear(), m1=start.getMonth()+1, d1=start.getDate();
    const y2=end.getFullYear(), m2=end.getMonth()+1, d2=end.getDate();
    if (period==='year') return `${y1}年`;
    if (period==='month') return `${y1}年${m1}月`;
    if (y1!==y2) return `${y1}年${m1}月${d1}日 - ${y2}年${m2}月${d2}日`;
    return `${y1}年${m1}月${d1}日 - ${m2}月${d2}日`;
}

function timeToMinutes(s) { const [h,m]=s.split(':'); return +h*60 + +m; }

function generateId() { return Date.now()+''+Math.random(); }

function formatDurationText(minutes) {
    const h=Math.floor(minutes/60), m=minutes%60;
    let res=[];
    if (h>0) res.push(`${h}小时`);
    if (m>0) res.push(`${m}分钟`);
    return res.length>0 ? res.join('') : '0分钟';
}

// ================================================================
// MODULE 2: Toast 通知系统
// ================================================================
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span style="flex:1">' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
        if (toast.parentNode) {
            toast.classList.add('toast-removing');
            setTimeout(function() { if (toast.parentNode) toast.remove(); }, 250);
        }
    }, duration);
}

function showUndoToast(message, undoCallback) {
    var container = document.getElementById('toast-container');
    // Remove any existing undo toasts to prevent stacking
    var existingToasts = container.querySelectorAll('.toast-undo');
    existingToasts.forEach(function(el) { el.remove(); });

    var toast = document.createElement('div');
    toast.className = 'toast toast-undo';
    toast.innerHTML = '<span style="flex:1">' + message + '</span><button class="undo-action font-bold px-2 py-1 rounded-lg hover:bg-white/20 transition active:scale-95 whitespace-nowrap" style="color:#86c06c">撤销</button><button class="dismiss-action ml-1 opacity-60 hover:opacity-100 transition text-lg leading-none">&times;</button>';
    container.appendChild(toast);

    var dismissed = false;
    function remove() { dismissed = true; toast.remove(); }
    toast.querySelector('.undo-action').onclick = function() { undoCallback(); remove(); };
    toast.querySelector('.dismiss-action').onclick = remove;
    setTimeout(function() { if (!dismissed) remove(); }, 5000);
}

// ================================================================
// MODULE 3: 导入数据验证
// ================================================================
function validateImportData(data) {
    if (!data || typeof data !== 'object') return '数据格式错误：不是有效的JSON对象';
    if (!Array.isArray(data.categories)) return '数据格式错误：categories 不是数组';
    for (var i = 0; i < data.categories.length; i++) {
        var cat = data.categories[i];
        if (!cat.id || typeof cat.id !== 'string') return '数据格式错误：第'+(i+1)+'个分类缺少有效的 id';
        if (!cat.name || typeof cat.name !== 'string') return '数据格式错误：第'+(i+1)+'个分类缺少有效的 name';
        if (!cat.color || typeof cat.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(cat.color))
            return '数据格式错误：第'+(i+1)+'个分类缺少有效的 color（需为 #RRGGBB 格式）';
        if (!Array.isArray(cat.subCategories)) return '数据格式错误：第'+(i+1)+'个分类的 subCategories 不是数组';
    }
    if (!Array.isArray(data.timeRecords)) return '数据格式错误：timeRecords 不是数组';
    var catIds = {};
    data.categories.forEach(function(c) { catIds[c.id] = true; });
    for (var j = 0; j < data.timeRecords.length; j++) {
        var rec = data.timeRecords[j];
        if (!rec.id) return '数据格式错误：第'+(j+1)+'条记录缺少 id';
        if (!rec.date || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) return '数据格式错误：第'+(j+1)+'条记录日期格式无效';
        if (!rec.start || !/^\d{2}:\d{2}$/.test(rec.start)) return '数据格式错误：第'+(j+1)+'条记录开始时间格式无效';
        if (!rec.end || !/^\d{2}:\d{2}$/.test(rec.end)) return '数据格式错误：第'+(j+1)+'条记录结束时间格式无效';
        if (!rec.cid || typeof rec.cid !== 'string') return '数据格式错误：第'+(j+1)+'条记录缺少分类引用 cid';
        if (typeof rec.sub !== 'string') return '数据格式错误：第'+(j+1)+'条记录缺少子分类 sub';
        if (!catIds[rec.cid]) return '数据格式错误：第'+(j+1)+'条记录引用了不存在的分类 "' + rec.cid + '"';
    }
    return null;
}

// ================================================================
// MODULE 4: 全局状态管理
// ================================================================
var appData = {
    currentDate: new Date(),
    statsDate: new Date(),
    activeTab: 'record',
    activeCategory: 'study',
    activeSubCategory: '阅读',
    categories: JSON.parse(localStorage.getItem('categories')) || DEFAULT_CATEGORIES,
    timeRecords: JSON.parse(localStorage.getItem('records')) || [],
    timeGranularity: 15,
    isDragging: false,
    selectedCells: [],
    startCell: null,
    activeStatsPeriod: 'week',
    activeStatsFilter: 'all'
};

var pieChart = null, lineChart = null;

function save() {
    localStorage.setItem('categories', JSON.stringify(appData.categories));
    localStorage.setItem('records', JSON.stringify(appData.timeRecords));
}

function setCat(id) {
    appData.activeCategory = id;
    var cat = appData.categories.find(function(c) { return c.id === id; });
    appData.activeSubCategory = cat && cat.subCategories.length > 0 ? cat.subCategories[0] : '';
    renderCategoryList();
}

function setSub(cid, sub) {
    appData.activeCategory = cid;
    appData.activeSubCategory = sub;
    renderCategoryList();
}

function switchTab(tabName) {
    appData.activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        var isActive = b.dataset.tab === tabName;
        if (isActive) { b.classList.add('tab-active'); b.style.color = '#86c06c'; }
        else { b.classList.remove('tab-active'); b.style.color = ''; }
    });
    ['record','diary','stats'].forEach(function(t) {
        document.getElementById(t+'-page').classList.toggle('hidden', t !== tabName);
    });
    if (tabName === 'stats') {
        appData.statsDate = new Date(appData.currentDate);
        renderStats(appData.activeStatsPeriod);
    }
}

// ================================================================
// MODULE 5: 渲染函数
// ================================================================
function renderHeader() {
    var d = appData.currentDate;
    var now = new Date();
    var isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    var dateClass = isToday ? 'text-white' : 'text-amber-200';
    var todayBtn = isToday ? '' : '<button id="back-to-today" class="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-md hover:bg-white/30 transition active:scale-95">今天</button>';

    document.getElementById('header').innerHTML =
        '<button id="prev-day" class="p-2 hover:bg-white/20 rounded-full transition w-9 h-9 flex items-center justify-center active:scale-90">&lang;</button>' +
        '<div id="header-date-btn" class="flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded-full transition relative">' +
            '<span class="font-semibold text-base tracking-wide ' + dateClass + '">' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + getWeekDay(d) + '</span>' +
            '<svg class="w-4 h-4 opacity-80" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
            todayBtn +
            '<input type="date" id="header-date-picker" class="opacity-0 w-[1px] h-[1px] absolute pointer-events-none" value="' + formatDate(d) + '">' +
        '</div>' +
        '<div class="flex items-center gap-1">' +
            '<button id="dark-mode-toggle" class="p-2 hover:bg-white/20 rounded-full transition w-9 h-9 flex items-center justify-center active:scale-90" title="切换深色模式">' +
                '<svg id="dark-icon-moon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>' +
                '<svg id="dark-icon-sun" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>' +
            '</button>' +
            '<button id="next-day" class="p-2 hover:bg-white/20 rounded-full transition w-9 h-9 flex items-center justify-center active:scale-90">&rang;</button>' +
        '</div>';

    document.getElementById('prev-day').onclick = function() {
        appData.currentDate.setDate(appData.currentDate.getDate()-1);
        renderHeader(); renderGrid(); renderDiary();
    };
    document.getElementById('next-day').onclick = function() {
        appData.currentDate.setDate(appData.currentDate.getDate()+1);
        renderHeader(); renderGrid(); renderDiary();
    };

    var dateInput = document.getElementById('header-date-picker');
    document.getElementById('header-date-btn').onclick = function() {
        try { if ('showPicker' in HTMLInputElement.prototype) dateInput.showPicker(); else dateInput.click(); } catch(e) {}
    };

    var backBtn = document.getElementById('back-to-today');
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.stopPropagation();
            appData.currentDate = new Date();
            appData.currentDate.setHours(12, 0, 0, 0);
            renderHeader(); renderGrid(); renderDiary();
        };
    }

    dateInput.onchange = function(e) {
        if (e.target.value) {
            var parts = e.target.value.split('-').map(Number);
            appData.currentDate = new Date(parts[0], parts[1]-1, parts[2], 12, 0, 0);
            renderHeader(); renderGrid(); renderDiary();
        }
    };

    // Dark mode toggle
    document.getElementById('dark-mode-toggle').onclick = function() {
        var isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark ? 'true' : 'false');
        var moon = document.getElementById('dark-icon-moon');
        var sun = document.getElementById('dark-icon-sun');
        if (moon && sun) { moon.classList.toggle('hidden', isDark); sun.classList.toggle('hidden', !isDark); }
        // Re-render stats if active to update chart colors
        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
    };

    // Sync dark mode icon state
    if (document.documentElement.classList.contains('dark')) {
        var moon2 = document.getElementById('dark-icon-moon');
        var sun2 = document.getElementById('dark-icon-sun');
        if (moon2 && sun2) { moon2.classList.add('hidden'); sun2.classList.remove('hidden'); }
    }
}

function renderGrid() {
    var grid = document.getElementById('time-grid');
    grid.className = 'grid time-grid grid-15min';
    var today = formatDate(appData.currentDate);
    var records = appData.timeRecords.filter(function(r) { return r.date === today; });
    var html = '';
    for (var h = 0; h < 24; h++) {
        html += '<div class="flex items-center justify-center text-[11px] font-semibold tracking-tighter" style="color:var(--text-muted)">' + h + ':00</div>';
        for (var b = 0; b < 4; b++) {
            var start = String(h).padStart(2,'0') + ':' + String(b*15).padStart(2,'0');
            var endH = b*15 >= 45 ? (h+1)%24 : h;
            var end = String(endH).padStart(2,'0') + ':' + String((b*15+15)%60).padStart(2,'0');
            var rec = records.find(function(x) { return x.start === start; });
            var cat = rec ? appData.categories.find(function(c) { return c.id === rec.cid; }) : null;
            var bgColor = cat ? cat.color : 'transparent';
            var textColor = cat ? '#ffffff' : 'transparent';
            html += '<div class="time-cell select-none" data-start="' + start + '" data-end="' + end + '" data-minute="' + timeToMinutes(start) + '">' +
                '<div class="time-cell-content" style="background-color:' + bgColor + ';color:' + textColor + '">' + (rec && rec.sub ? escapeHTML(rec.sub) : '') + '</div>' +
            '</div>';
        }
    }
    grid.innerHTML = html;
}

function renderCategoryList() {
    var wrap = document.getElementById('category-list');
    if (!appData.categories.find(function(c) { return c.id === appData.activeCategory; }) && appData.categories.length > 0) {
        setCat(appData.categories[0].id);
    }
    wrap.innerHTML = appData.categories.map(function(cat) {
        var active = appData.activeCategory === cat.id;
        return '<div class="rounded-lg overflow-hidden transition-all ' + (active ? 'shadow-sm ring-1 ring-primary/20' : 'opacity-75') + '" style="border:1px solid var(--border-light);background:var(--bg-surface)">' +
            '<div class="px-2 py-2.5 flex justify-between items-center cursor-pointer cat-header" data-cid="' + cat.id + '">' +
                '<div class="flex items-center gap-1.5">' +
                    '<div class="w-2.5 h-2.5 rounded-full" style="background:' + cat.color + '"></div>' +
                    '<span class="font-medium text-[13px]" style="color:var(--text-primary)">' + escapeHTML(cat.name) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="' + (active ? 'block' : 'hidden') + ' p-1 space-y-0.5" style="background:var(--bg-subtle);border-top:1px solid var(--border-light)">' +
                (cat.subCategories.length === 0 ? '<div class="text-[11px] text-center py-2" style="color:var(--text-muted)">暂无子类</div>' : '') +
                cat.subCategories.map(function(sub) {
                    var isSubActive = appData.activeSubCategory === sub && active;
                    return '<div class="text-[12px] px-2 py-1.5 rounded-[6px] cursor-pointer transition-colors sub-item ' +
                        (isSubActive ? 'bg-primary text-white font-medium shadow-sm' : 'hover:brightness-95') +
                        '" style="' + (isSubActive ? '' : 'color:var(--text-secondary)') + '" data-cid="' + cat.id + '" data-sub="' + escapeHTML(sub) + '">' + escapeHTML(sub) + '</div>';
                }).join('') +
            '</div>' +
        '</div>';
    }).join('');
}

function renderDiary() {
    var wrap = document.getElementById('diary-timeline');
    var today = formatDate(appData.currentDate);
    var list = appData.timeRecords.filter(function(r) { return r.date === today; }).sort(function(a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });

    if (!list.length) {
        wrap.innerHTML = '<div class="flex flex-col items-center justify-center py-20 mt-10" style="color:var(--text-muted)">' +
            '<svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
            '<p>今日暂无记录</p><p class="text-xs mt-1 opacity-60">去「记录」页点击时间格开始记录吧</p></div>';
        return;
    }

    // Merge consecutive records of same category+sub
    var mergedList = [], currentGroup = null;
    list.forEach(function(r) {
        if (!currentGroup) {
            currentGroup = { start: r.start, end: r.end, cid: r.cid, sub: r.sub, originalRecords: [r] };
        } else if (currentGroup.cid === r.cid && currentGroup.sub === r.sub && currentGroup.end === r.start) {
            currentGroup.end = r.end;
            currentGroup.originalRecords.push(r);
        } else {
            mergedList.push(currentGroup);
            currentGroup = { start: r.start, end: r.end, cid: r.cid, sub: r.sub, originalRecords: [r] };
        }
    });
    if (currentGroup) mergedList.push(currentGroup);

    var html = '';
    mergedList.forEach(function(group) {
        var c = appData.categories.find(function(x) { return x.id === group.cid; });
        var remark = group.originalRecords[0].remark || '';
        var durationText = formatDurationText(group.originalRecords.length * 15);

        html += '<div class="border-l-[3px] pl-4 pb-2 relative ml-3" style="border-color:var(--border-default)">' +
            '<div class="w-3.5 h-3.5 rounded-full absolute top-1.5 shadow-sm border-2 border-white dark:border-slate-700" style="left:-0.5rem;background:' + (c ? c.color : '#cbd5e1') + '"></div>' +
            '<div class="flex items-center gap-2 mb-1.5">' +
                '<div class="text-[13px] font-medium font-mono" style="color:var(--text-muted)">' + group.start + ' - ' + group.end + '</div>' +
                '<div class="text-[11px] px-1.5 py-0.5 rounded font-medium" style="background:var(--bg-subtle);color:var(--text-muted)">' + durationText + '</div>' +
            '</div>' +
            '<div class="app-card p-3.5 mt-1 transition-shadow hover:shadow-md">' +
                '<div class="flex justify-between items-start">' +
                    '<div class="flex items-center gap-1.5">' +
                        '<span class="font-bold text-sm" style="color:' + (c ? c.color : '#333') + '">' + escapeHTML(c ? c.name : '未知') + '</span>' +
                        '<span style="color:var(--text-muted)">|</span>' +
                        '<span class="text-sm font-medium" style="color:var(--text-primary)">' + escapeHTML(group.sub) + '</span>' +
                    '</div>' +
                    '<button class="add-remark p-1 rounded-lg transition hover:text-primary active:scale-90" data-ids=\'' + JSON.stringify(group.originalRecords.map(function(r){return r.id;})) + '\' title="添加备注" style="color:var(--text-muted)">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>' +
                    '</button>' +
                '</div>' +
                (remark ? '<div class="mt-2.5 text-[13px] p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed" style="background:var(--bg-subtle);color:var(--text-secondary);border:1px solid var(--border-light)">' + escapeHTML(remark) + '</div>' : '') +
            '</div>' +
        '</div>';
    });
    wrap.innerHTML = html;
}

// ================================================================
// MODULE 6: 统计功能
// ================================================================
function getDateRange(period) {
    var now = new Date(appData.statsDate);
    var startDate = new Date(now), endDate = new Date(now);
    if (period === 'week') { var d = now.getDay() || 7; startDate.setDate(now.getDate()-d+1); endDate.setDate(now.getDate()+(7-d)); }
    else if (period === 'month') { startDate.setDate(1); endDate.setMonth(endDate.getMonth()+1); endDate.setDate(0); }
    else if (period === 'year') { startDate.setMonth(0); startDate.setDate(1); endDate.setMonth(11); endDate.setDate(31); }
    startDate.setHours(0,0,0,0); endDate.setHours(23,59,59,999);
    return { startDate: startDate, endDate: endDate };
}

function calculateStats(period, filterCid) {
    filterCid = filterCid || 'all';
    var range = getDateRange(period);
    var startDate = range.startDate, endDate = range.endDate;

    var datesInRange = [];
    var curr = new Date(startDate);
    while (curr <= endDate) { datesInRange.push(new Date(curr)); curr.setDate(curr.getDate()+1); }

    var filteredRecords = appData.timeRecords.filter(function(r) {
        var parts = r.date.split('-').map(Number);
        var recordDate = new Date(parts[0], parts[1]-1, parts[2], 12, 0, 0);
        if (recordDate < startDate || recordDate > endDate) return false;
        if (filterCid !== 'all' && r.cid !== filterCid) return false;
        return true;
    });

    var items = [];
    if (filterCid === 'all') {
        items = appData.categories.map(function(c) { return { id: c.id, name: c.name, color: c.color }; });
    } else {
        var cat = appData.categories.find(function(c) { return c.id === filterCid; });
        if (cat) {
            items = cat.subCategories.map(function(sub, i) {
                return { id: sub, name: sub, color: SUB_PALETTE[i % SUB_PALETTE.length] };
            });
        }
    }

    var itemTotals = {};
    items.forEach(function(item) { itemTotals[item.id] = 0; });

    filteredRecords.forEach(function(r) {
        var key = filterCid === 'all' ? r.cid : r.sub;
        if (itemTotals[key] !== undefined) itemTotals[key] += 15;
    });

    var dailyStats = {};
    datesInRange.forEach(function(date) {
        var dateStr = formatDate(date);
        dailyStats[dateStr] = {};
        items.forEach(function(item) { dailyStats[dateStr][item.id] = 0; });
        filteredRecords.filter(function(r) { return r.date === dateStr; }).forEach(function(r) {
            var key = filterCid === 'all' ? r.cid : r.sub;
            if (dailyStats[dateStr][key] !== undefined) dailyStats[dateStr][key] += 15;
        });
    });

    var totalMinutes = Object.values(itemTotals).reduce(function(a, b) { return a + b; }, 0);
    return { items: items, itemTotals: itemTotals, dailyStats: dailyStats, datesInRange: datesInRange, startDate: startDate, endDate: endDate, totalMinutes: totalMinutes };
}

function renderStatsFilter() {
    var filterSelect = document.getElementById('stats-filter');
    var html = '<option value="all">所有大类</option>';
    appData.categories.forEach(function(cat) {
        html += '<option value="' + cat.id + '"' + (appData.activeStatsFilter === cat.id ? ' selected' : '') + '>' + escapeHTML(cat.name) + '</option>';
    });
    filterSelect.innerHTML = html;
    if (!filterSelect.querySelector('option[value="' + appData.activeStatsFilter + '"]')) {
        appData.activeStatsFilter = 'all'; filterSelect.value = 'all';
    }
}

function renderStats(period) {
    appData.activeStatsPeriod = period;
    var isDark = document.documentElement.classList.contains('dark');
    var textColor = isDark ? '#94a3b8' : '#64748b';
    var gridColor = isDark ? '#334155' : '#f1f5f9';

    document.querySelectorAll('.stats-period-btn').forEach(function(btn) {
        var isActive = btn.dataset.period === period;
        btn.style.background = isActive ? 'var(--bg-surface)' : 'transparent';
        btn.style.color = isActive ? 'var(--text-primary)' : 'var(--text-muted)';
        btn.style.fontWeight = isActive ? '600' : '400';
        btn.style.boxShadow = isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
    });

    renderStatsFilter();
    var stats = calculateStats(period, appData.activeStatsFilter);
    document.getElementById('stats-date-range').textContent = formatRangeText(stats.startDate, stats.endDate, period);
    document.getElementById('pie-title').textContent = appData.activeStatsFilter === 'all' ? '分类时间占比' : '子分类时间占比';

    var labels = [], data = [], backgroundColor = [];
    stats.items.forEach(function(item) {
        var minutes = stats.itemTotals[item.id];
        if (minutes > 0) { labels.push(item.name); data.push(minutes); backgroundColor.push(item.color); }
    });

    var pieContainer = document.getElementById('pie-container');
    if (data.length === 0) {
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        pieContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-full" style="color:var(--text-muted)">' +
            '<svg class="w-12 h-12 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>' +
            '<span class="text-sm">暂无统计数据</span></div>';
    } else {
        if (!document.getElementById('pie-chart')) {
            pieContainer.innerHTML = '<canvas id="pie-chart"></canvas>';
            pieChart = null;
        }
        if (!pieChart) {
            var pieCtx = document.getElementById('pie-chart').getContext('2d');
            pieChart = new Chart(pieCtx, {
                type: 'doughnut', data: { labels: labels, datasets: [{ data: data, backgroundColor: backgroundColor, borderWidth: 2, borderColor: isDark ? '#1e293b' : '#fff', borderRadius: 4 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 12, family: 'system-ui' }, color: textColor } },
                        tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + formatDurationText(ctx.raw) + ' (' + ((ctx.raw/stats.totalMinutes)*100).toFixed(1) + '%)'; } } }
                    },
                    cutout: '65%'
                }
            });
        } else {
            pieChart.data.labels = labels;
            pieChart.data.datasets[0].data = data;
            pieChart.data.datasets[0].backgroundColor = backgroundColor;
            pieChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#fff';
            pieChart.options.plugins.legend.labels.color = textColor;
            pieChart.update();
        }
    }

    var datasets = stats.items.map(function(item) {
        var lineData = stats.datesInRange.map(function(date) {
            var val = stats.dailyStats[formatDate(date)][item.id] / 60;
            return val;
        });
        if (lineData.every(function(v) { return v === 0; })) return null;
        return {
            label: item.name, data: lineData,
            borderColor: item.color, backgroundColor: item.color + '20',
            fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, borderWidth: 2
        };
    }).filter(Boolean);

    var lineContainer = document.getElementById('line-container');
    if (datasets.length === 0) {
        if (lineChart) { lineChart.destroy(); lineChart = null; }
        lineContainer.innerHTML = '<div class="flex items-center justify-center h-full text-sm" style="color:var(--text-muted)">暂无趋势数据</div>';
    } else {
        var lineLabels = stats.datesInRange.map(function(date) {
            if (period === 'week') return ['周一','周二','周三','周四','周五','周六','周日'][date.getDay() || 6];
            if (period === 'month') return date.getDate() + '日';
            return date.getMonth() + 1 + '月';
        });

        if (!document.getElementById('line-chart')) {
            lineContainer.innerHTML = '<canvas id="line-chart"></canvas>';
            lineChart = null;
        }

        if (!lineChart) {
            var lineCtx = document.getElementById('line-chart').getContext('2d');
            lineChart = new Chart(lineCtx, {
                type: 'line', data: { labels: lineLabels, datasets: datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', color: textColor, font: { size: 11 } } },
                        tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + ': ' + ctx.raw.toFixed(1) + '小时'; } } }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false }, ticks: { font: { size: 10 }, color: textColor } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: textColor } }
                    }
                }
            });
        } else {
            lineChart.data.labels = lineLabels;
            lineChart.data.datasets = datasets;
            lineChart.options.plugins.legend.labels.color = textColor;
            lineChart.options.scales.y.grid.color = gridColor;
            lineChart.options.scales.y.ticks.color = textColor;
            lineChart.options.scales.x.ticks.color = textColor;
            lineChart.update();
        }
    }

    var html = '<div class="p-4 rounded-xl flex justify-between items-center shadow-sm" style="background:linear-gradient(135deg, rgba(134,192,108,0.08), rgba(134,192,108,0.04));border:1px solid rgba(134,192,108,0.2)">' +
        '<div class="text-sm font-medium" style="color:var(--text-secondary)">累计记录</div>' +
        '<div class="text-xl font-bold" style="color:#86c06c">' + formatDurationText(stats.totalMinutes) + '</div></div>';

    var sortedItems = stats.items.slice().sort(function(a, b) { return stats.itemTotals[b.id] - stats.itemTotals[a.id]; });

    sortedItems.forEach(function(item) {
        var minutes = stats.itemTotals[item.id];
        if (minutes > 0) {
            var percentage = stats.totalMinutes > 0 ? ((minutes / stats.totalMinutes) * 100).toFixed(1) : 0;
            html += '<div class="app-card p-3.5">' +
                '<div class="flex justify-between items-center mb-2">' +
                    '<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full shadow-sm" style="background:' + item.color + '"></div><span class="font-medium text-[15px]" style="color:var(--text-primary)">' + escapeHTML(item.name) + '</span></div>' +
                    '<span class="text-sm font-bold" style="color:var(--text-muted)">' + percentage + '%</span>' +
                '</div>' +
                '<div class="text-base font-semibold tracking-tight" style="color:var(--text-primary)">' + formatDurationText(minutes) + '</div>' +
                '<div class="w-full rounded-full h-2 mt-2.5 overflow-hidden" style="background:var(--bg-subtle)"><div class="h-2 rounded-full transition-all duration-1000 ease-out" style="background:' + item.color + ';width:' + percentage + '%"></div></div>' +
            '</div>';
        }
    });
    document.getElementById('stats-details').innerHTML = html;
}

// ================================================================
// MODULE 7: 分类管理
// ================================================================
function renderCategoryManage() {
    document.getElementById('manage-category-list').innerHTML = appData.categories.map(function(cat) {
        return '<div class="p-4 rounded-xl shadow-sm" style="border:1px solid var(--border-light);background:var(--bg-surface)">' +
            '<div class="flex items-center justify-between">' +
                '<div class="flex items-center gap-2"><div class="w-3.5 h-3.5 rounded-full shadow-inner" style="background:' + cat.color + '"></div><span class="font-bold" style="color:var(--text-primary)">' + escapeHTML(cat.name) + '</span></div>' +
                '<div class="flex items-center gap-2">' +
                    '<button class="edit-cat text-[13px] px-2.5 py-1 rounded-md font-medium transition active:scale-95 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" data-cid="' + cat.id + '">编辑</button>' +
                    '<button class="del-cat text-[13px] px-2.5 py-1 rounded-md font-medium transition active:scale-95 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" data-cid="' + cat.id + '">删除</button>' +
                '</div>' +
            '</div>' +
            '<div class="sub-list mt-3.5 space-y-2 p-2.5 rounded-lg border min-h-[40px]" style="background:var(--bg-subtle);border-color:var(--border-light)" data-cid="' + cat.id + '">' +
                cat.subCategories.map(function(s, i) {
                    return '<div class="flex justify-between items-center px-3 py-2 rounded-md drag-item cursor-move shadow-sm" style="background:var(--bg-surface);border:1px solid var(--border-light)" data-idx="' + i + '">' +
                        '<span class="text-sm font-medium" style="color:var(--text-primary)">' + escapeHTML(s) + '</span>' +
                        '<div class="flex gap-1">' +
                            '<button class="edit-sub text-xs p-1 rounded transition active:scale-90 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" data-cid="' + cat.id + '" data-idx="' + i + '">重命名</button>' +
                            '<button class="del-sub text-xs p-1 rounded transition active:scale-90 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" data-cid="' + cat.id + '" data-idx="' + i + '">删除</button>' +
                        '</div>' +
                    '</div>';
                }).join('') +
            '</div>' +
            '<button class="add-sub mt-3 w-full text-sm py-2.5 rounded-lg font-medium transition active:scale-[0.97]" style="color:var(--text-secondary);border:1px dashed var(--border-default);background:transparent" data-cid="' + cat.id + '">+ 添加子分类</button>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.sub-list').forEach(function(el) {
        new Sortable(el, {
            group: 'shared', animation: 150, ghostClass: 'opacity-50',
            onEnd: function(evt) {
                var fromCat = appData.categories.find(function(c) { return c.id === evt.from.dataset.cid; });
                var toCat = appData.categories.find(function(c) { return c.id === evt.to.dataset.cid; });
                var item = fromCat.subCategories.splice(evt.oldIndex, 1)[0];
                toCat.subCategories.splice(evt.newIndex, 0, item);
                save(); renderCategoryManage(); renderCategoryList();
            }
        });
    });
}

function openCatEditModal(cid) {
    var modal = document.getElementById('category-edit-modal');
    if (cid) {
        var cat = appData.categories.find(function(c) { return c.id === cid; });
        document.getElementById('cat-edit-title').textContent = '编辑大类';
        document.getElementById('cat-edit-id').value = cat.id;
        document.getElementById('cat-edit-name').value = cat.name;
        document.getElementById('cat-edit-color').value = cat.color;
    } else {
        document.getElementById('cat-edit-title').textContent = '添加新大类';
        document.getElementById('cat-edit-id').value = '';
        document.getElementById('cat-edit-name').value = '';
        document.getElementById('cat-edit-color').value = '#86c06c';
    }
    modal.classList.replace('hidden', 'flex');
}

// ================================================================
// MODULE 8: 网格交互（多选、撤销确认）
// ================================================================
function initMultiSelect() {
    var grid = document.getElementById('time-grid');

    function resetSelectedCells() {
        appData.isDragging = false;
        grid.querySelectorAll('.time-cell').forEach(function(c) { c.classList.remove('cell-selected'); });
        appData.selectedCells = [];
    }

    function dragHandler(e, isTouch) {
        var target = isTouch ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
        var cell = target ? target.closest('.time-cell') : null;
        if (!cell) return;
        var min = Math.min(parseInt(appData.startCell.dataset.minute), parseInt(cell.dataset.minute));
        var max = Math.max(parseInt(appData.startCell.dataset.minute), parseInt(cell.dataset.minute));
        grid.querySelectorAll('.time-cell').forEach(function(c) {
            var m = parseInt(c.dataset.minute);
            if (m >= min && m <= max) {
                c.classList.add('cell-selected');
                if (appData.selectedCells.indexOf(c) === -1) appData.selectedCells.push(c);
            } else {
                c.classList.remove('cell-selected');
                var idx = appData.selectedCells.indexOf(c);
                if (idx > -1) appData.selectedCells.splice(idx, 1);
            }
        });
    }

    grid.addEventListener('mousedown', function(e) {
        var c = e.target.closest('.time-cell');
        if (c) { appData.isDragging = true; appData.startCell = c; appData.selectedCells = [c]; c.classList.add('cell-selected'); e.preventDefault(); }
    });
    grid.addEventListener('mousemove', function(e) { if (appData.isDragging) dragHandler(e, false); });
    var justDragged = false;
    var justTouched = false;
    grid.addEventListener('mouseup', function() { 
        if (appData.isDragging) {
            justDragged = true;
            if (appData.selectedCells.length > 0) handleSelectedCells(); 
            resetSelectedCells(); 
            setTimeout(function() { justDragged = false; }, 50);
        }
    });
    grid.addEventListener('click', function(e) {
        if (justDragged || justTouched) return;
        var c = e.target.closest('.time-cell');
        if (c && !appData.isDragging) { appData.selectedCells = [c]; handleSelectedCells(); resetSelectedCells(); }
    });
    document.addEventListener('click', function(e) { if (!e.target.closest('.time-cell') && !appData.isDragging) resetSelectedCells(); });

    grid.addEventListener('touchstart', function(e) {
        var c = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        if (c) c = c.closest('.time-cell');
        if (c) { appData.isDragging = true; appData.startCell = c; appData.selectedCells = [c]; c.classList.add('cell-selected'); }
    }, { passive: true });
    grid.addEventListener('touchmove', function(e) { if (appData.isDragging) { dragHandler(e, true); e.preventDefault(); } }, { passive: false });
    grid.addEventListener('touchend', function(e) { 
        if (appData.isDragging) {
            justTouched = true;
            if (appData.selectedCells.length > 0) {
                handleSelectedCells();
                if (e.cancelable) e.preventDefault(); // prevent synthetic click on mobile
            }
            resetSelectedCells(); 
            setTimeout(function() { justTouched = false; }, 400); // 400ms ignores mobile 300ms click delay
        }
    });
}

function handleSelectedCells() {
    var today = formatDate(appData.currentDate);
    if (!appData.activeSubCategory) {
        showToast('请先选择或添加一个子分类！', 'info');
        return;
    }

    var firstCell = appData.selectedCells[0];
    if (!firstCell) return;
    
    var start = firstCell.dataset.start;
    var idx = appData.timeRecords.findIndex(function(r) { return r.date === today && r.start === start; });
    
    var action = 'overwrite';
    if (idx !== -1) {
        var rec = appData.timeRecords[idx];
        if (rec.cid === appData.activeCategory && rec.sub === appData.activeSubCategory) {
            action = 'clear';
        }
    }

    // Apply changes directly without modal, allowing fast brushing
    applyCellChanges(today, action);
}

function applyCellChanges(today, action) {
    // Snapshot for undo
    var snapshot = appData.timeRecords.map(function(r) { return Object.assign({}, r); });
    var affectedStarts = appData.selectedCells.map(function(c) { return c.dataset.start; });

    appData.selectedCells.forEach(function(cell) {
        var start = cell.dataset.start;
        var end = cell.dataset.end;
        var idx = appData.timeRecords.findIndex(function(r) { return r.date === today && r.start === start; });

        if (action === 'clear') {
            if (idx !== -1) appData.timeRecords.splice(idx, 1);
        } else {
            if (idx !== -1) {
                var oldRemark = appData.timeRecords[idx].remark;
                appData.timeRecords[idx] = { id: generateId(), date: today, start: start, end: end, cid: appData.activeCategory, sub: appData.activeSubCategory, remark: oldRemark };
            } else {
                appData.timeRecords.push({ id: generateId(), date: today, start: start, end: end, cid: appData.activeCategory, sub: appData.activeSubCategory });
            }
        }
    });

    save(); renderGrid(); renderDiary();
    if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);

    var actionText = action === 'clear' ? '已清除' : '已更新';
    showUndoToast(actionText + ' ' + affectedStarts.length + ' 个时间段', function() {
        appData.timeRecords = snapshot;
        appData.selectedCells = [];
        save(); renderGrid(); renderDiary();
        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
        showToast('已撤销', 'info');
    });
}

// ================================================================
// MODULE 9: 事件绑定
// ================================================================
function initEventListeners() {
    // Category list
    document.getElementById('category-list').addEventListener('click', function(e) {
        var h = e.target.closest('.cat-header');
        if (h) return setCat(h.dataset.cid);
        var s = e.target.closest('.sub-item');
        if (s) setSub(s.dataset.cid, s.dataset.sub);
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.onclick = function() { switchTab(btn.dataset.tab); };
    });

    // Diary remark
    document.getElementById('diary-timeline').addEventListener('click', function(e) {
        var btn = e.target.closest('.add-remark');
        if (btn) {
            var ids = JSON.parse(btn.dataset.ids || '[]');
            if (!ids.length) return;
            var record = appData.timeRecords.find(function(r) { return r.id === ids[0]; });
            if (!record) return;
            var newRemark = prompt('请输入备注内容（清空则删除）：', record.remark || '');
            if (newRemark !== null) {
                var trimmed = newRemark.trim();
                appData.timeRecords.forEach(function(r) {
                    if (ids.indexOf(r.id) !== -1) {
                        r.remark = trimmed;
                    }
                });
                save(); renderDiary();
            }
        }
    });

    // Export/Import
    document.getElementById('export-data-btn').onclick = function() {
        var data = { categories: appData.categories, timeRecords: appData.timeRecords };
        var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '时间记录备份_' + formatDate(new Date()) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('数据已导出！', 'success');
    };

    document.getElementById('import-data-btn').onclick = function() {
        document.getElementById('import-file').click();
    };

    document.getElementById('import-file').onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var data = JSON.parse(event.target.result);
                var error = validateImportData(data);
                if (error) {
                    showToast(error, 'error', 5000);
                    e.target.value = '';
                } else {
                    document.getElementById('import-mode-desc').innerHTML = '即将导入 <b>' + data.categories.length + '</b> 个大类和 <b>' + data.timeRecords.length + '</b> 条记录。<br><br><b>合并</b>：追加新数据，重复记录重叠部分会被忽略。<br><b>覆盖</b>：清空当前所有数据。';
                    var modal = document.getElementById('import-mode-modal');
                    var cleanup = function() { modal.classList.replace('flex', 'hidden'); e.target.value = ''; };
                    
                    document.getElementById('import-mode-cancel').onclick = cleanup;
                    
                    document.getElementById('import-mode-overwrite').onclick = function() {
                        appData.categories = data.categories;
                        appData.timeRecords = data.timeRecords;
                        save();
                        renderCategoryList(); renderCategoryManage(); renderGrid(); renderDiary();
                        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
                        showToast('已覆盖导入 ' + data.timeRecords.length + ' 条记录！', 'success');
                        cleanup();
                    };
                    
                    document.getElementById('import-mode-merge').onclick = function() {
                        data.categories.forEach(function(nc) {
                            var ec = appData.categories.find(function(c) { return c.id === nc.id; });
                            if (ec) {
                                nc.subCategories.forEach(function(sub) {
                                    if (ec.subCategories.indexOf(sub) === -1) ec.subCategories.push(sub);
                                });
                            } else {
                                appData.categories.push(nc);
                            }
                        });
                        var added = 0;
                        data.timeRecords.forEach(function(nr) {
                            var exists = appData.timeRecords.find(function(r) { return r.date === nr.date && r.start === nr.start; });
                            if (!exists) {
                                appData.timeRecords.push(nr);
                                added++;
                            }
                        });
                        save();
                        renderCategoryList(); renderCategoryManage(); renderGrid(); renderDiary();
                        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
                        showToast('成功合并导入 ' + added + ' 条新记录！', 'success');
                        cleanup();
                    };
                    
                    modal.classList.replace('hidden', 'flex');
                }
            } catch (err) {
                showToast('文件格式错误或已损坏，无法解析 JSON！', 'error');
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Stats filters
    document.getElementById('stats-filter').addEventListener('change', function(e) {
        appData.activeStatsFilter = e.target.value;
        renderStats(appData.activeStatsPeriod);
    });

    document.querySelectorAll('.stats-period-btn').forEach(function(b) {
        b.addEventListener('click', function() { renderStats(b.dataset.period); });
    });

    document.getElementById('stats-prev').addEventListener('click', function() {
        var d = appData.statsDate;
        if (appData.activeStatsPeriod === 'week') d.setDate(d.getDate() - 7);
        else if (appData.activeStatsPeriod === 'month') d.setMonth(d.getMonth() - 1);
        else d.setFullYear(d.getFullYear() - 1);
        renderStats(appData.activeStatsPeriod);
    });

    document.getElementById('stats-next').addEventListener('click', function() {
        var d = appData.statsDate;
        if (appData.activeStatsPeriod === 'week') d.setDate(d.getDate() + 7);
        else if (appData.activeStatsPeriod === 'month') d.setMonth(d.getMonth() + 1);
        else d.setFullYear(d.getFullYear() + 1);
        renderStats(appData.activeStatsPeriod);
    });

    // Category modal
    document.getElementById('manage-category-btn').onclick = function() {
        renderCategoryManage();
        document.getElementById('category-modal').classList.replace('hidden', 'flex');
    };
    document.getElementById('close-category-modal').onclick = function() {
        document.getElementById('category-modal').classList.replace('flex', 'hidden');
    };

    document.getElementById('add-main-cat-btn').onclick = function() { openCatEditModal(); };

    document.getElementById('cat-edit-cancel').onclick = function() {
        document.getElementById('category-edit-modal').classList.replace('flex', 'hidden');
    };

    document.getElementById('cat-edit-save').onclick = function() {
        var id = document.getElementById('cat-edit-id').value;
        var name = document.getElementById('cat-edit-name').value.trim();
        var color = document.getElementById('cat-edit-color').value;
        if (!name) { showToast('名称不能为空！', 'info'); return; }
        if (id) {
            var c = appData.categories.find(function(c) { return c.id === id; });
            if (c) { c.name = name; c.color = color; }
        } else {
            appData.categories.push({ id: generateId(), name: name, color: color, subCategories: ['默认分类'] });
        }
        save();
        document.getElementById('category-edit-modal').classList.replace('flex', 'hidden');
        renderCategoryManage(); renderCategoryList(); renderGrid(); renderDiary();
        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
    };

    // Manage category list events
    document.getElementById('manage-category-list').addEventListener('click', function(e) {
        var editCatBtn = e.target.closest('.edit-cat');
        if (editCatBtn) return openCatEditModal(editCatBtn.dataset.cid);

        var delCatBtn = e.target.closest('.del-cat');
        if (delCatBtn) {
            var cid = delCatBtn.dataset.cid;
            var catName = appData.categories.find(function(c) { return c.id === cid; }).name;
            if (!confirm('确定删除大类「' + catName + '」吗？')) return;
            appData.categories = appData.categories.filter(function(c) { return c.id !== cid; });
            appData.timeRecords = appData.timeRecords.filter(function(r) { return r.cid !== cid; });
            save(); renderCategoryManage(); renderCategoryList(); renderGrid(); renderDiary();
            if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
            return;
        }

        var editSubBtn = e.target.closest('.edit-sub');
        if (editSubBtn) {
            var cidSub = editSubBtn.dataset.cid;
            var idxSub = +editSubBtn.dataset.idx;
            var catObj = appData.categories.find(function(c) { return c.id === cidSub; });
            if (!catObj) return;
            var oldName = catObj.subCategories[idxSub];
            var newName = prompt('重命名子分类：', oldName);
            if (newName !== null) {
                newName = newName.trim();
                if (newName && newName !== oldName) {
                    if (catObj.subCategories.indexOf(newName) !== -1) {
                        showToast('子分类名称已存在！', 'info');
                    } else {
                        catObj.subCategories[idxSub] = newName;
                        appData.timeRecords.forEach(function(r) {
                            if (r.cid === cidSub && r.sub === oldName) r.sub = newName;
                        });
                        save(); renderCategoryManage(); renderCategoryList(); renderGrid(); renderDiary();
                        if (appData.activeTab === 'stats') renderStats(appData.activeStatsPeriod);
                    }
                }
            }
            return;
        }

        var delSubBtn = e.target.closest('.del-sub');
        if (delSubBtn) {
            var cid2 = delSubBtn.dataset.cid;
            var idx = +delSubBtn.dataset.idx;
            var cat = appData.categories.find(function(c) { return c.id === cid2; });
            if (cat && confirm('确定删除子分类「' + cat.subCategories[idx] + '」吗？')) {
                cat.subCategories.splice(idx, 1);
                save(); renderCategoryManage(); renderCategoryList();
            }
            return;
        }

        var addSubBtn = e.target.closest('.add-sub');
        if (addSubBtn) {
            var cat2 = appData.categories.find(function(c) { return c.id === addSubBtn.dataset.cid; });
            if (!cat2) return;
            var subName = prompt('请输入「' + cat2.name + '」的子分类名称：', '新子分类');
            subName = subName ? subName.trim() : '';
            if (!subName) return;
            if (cat2.subCategories.indexOf(subName) !== -1) { showToast('子分类已存在！', 'info'); return; }
            cat2.subCategories.push(subName);
            save(); renderCategoryManage(); renderCategoryList();
        }
    });
}

// ================================================================
// MODULE 10: 键盘快捷键
// ================================================================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            var modals = ['category-modal', 'category-edit-modal', 'cell-action-modal', 'import-mode-modal'];
            modals.forEach(function(id) {
                var el = document.getElementById(id);
                if (el && el.classList.contains('flex')) {
                    if (id === 'import-mode-modal' || id === 'cell-action-modal' || id === 'category-edit-modal') {
                        var cancelBtn = el.querySelector('button[id$="-cancel"]');
                        if (cancelBtn) cancelBtn.click();
                        else el.classList.replace('flex', 'hidden');
                    } else if (id === 'category-modal') {
                        document.getElementById('close-category-modal').click();
                    } else {
                        el.classList.replace('flex', 'hidden');
                    }
                }
            });
            return;
        }

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                appData.currentDate.setDate(appData.currentDate.getDate() - 1);
                renderHeader(); renderGrid(); renderDiary();
                break;
            case 'ArrowRight':
                e.preventDefault();
                appData.currentDate.setDate(appData.currentDate.getDate() + 1);
                renderHeader(); renderGrid(); renderDiary();
                break;
            case 't':
            case 'T':
                appData.currentDate = new Date();
                appData.currentDate.setHours(12, 0, 0, 0);
                renderHeader(); renderGrid(); renderDiary();
                showToast('已跳转到今天', 'info');
                break;
            case '1': switchTab('record'); break;
            case '2': switchTab('diary'); break;
            case '3': switchTab('stats'); break;
        }
    });
}

// ================================================================
// MODULE 11: 初始化
// ================================================================
function initApp() {
    // Dark mode init
    var savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') document.documentElement.classList.add('dark');

    // Render
    renderHeader();
    renderGrid();
    initMultiSelect();
    renderCategoryList();
    renderDiary();
    initEventListeners();
    initKeyboardShortcuts();

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
            }).catch(function(err) {
                console.log('SW registration failed:', err);
            });
        });
    }
}

initApp();
})();