(() => {
  "use strict";

  const HISTORY_KEY = "wikigolf_history";
  const MAX_HISTORY = 200;

  const els = {
    langSelect: document.getElementById("lang-select"),
    gameBar: document.getElementById("game-bar"),
    startTitle: document.getElementById("start-title"),
    goalTitle: document.getElementById("goal-title"),
    clickCount: document.getElementById("click-count"),
    timer: document.getElementById("timer"),
    newGameBtn: document.getElementById("new-game-btn"),
    historyBtn: document.getElementById("history-btn"),
    previewGoalBtn: document.getElementById("preview-goal-btn"),
    goalPreviewModal: document.getElementById("goal-preview-modal"),
    goalPreviewLoading: document.getElementById("goal-preview-loading"),
    goalPreviewView: document.getElementById("goal-preview-view"),
    goalPreviewCloseBtn: document.getElementById("goal-preview-close-btn"),
    breadcrumb: document.getElementById("breadcrumb"),
    articleContainer: document.getElementById("article-container"),
    startScreen: document.getElementById("start-screen"),
    startBtn: document.getElementById("start-btn"),
    loading: document.getElementById("loading"),
    articleView: document.getElementById("article-view"),
    winModal: document.getElementById("win-modal"),
    winSummary: document.getElementById("win-summary"),
    winNewGameBtn: document.getElementById("win-newgame-btn"),
    winCloseBtn: document.getElementById("win-close-btn"),
    historyModal: document.getElementById("history-modal"),
    rankingList: document.getElementById("ranking-list"),
    historyList: document.getElementById("history-list"),
    historyCloseBtn: document.getElementById("history-close-btn"),
    clearHistoryBtn: document.getElementById("clear-history-btn"),
    toast: document.getElementById("toast"),
  };

  const SHADOW_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    div, p, span, a, ul, ol, li, table, td, th, h1, h2, h3, h4, h5, h6, figure, img, sup, small {
      font-family: "Hiragino Sans", "Yu Gothic", "Segoe UI", system-ui, sans-serif;
      color: #1b1b1b;
      font-size: 16px;
      line-height: 1.7;
    }
    a { color: #2a6f3f; cursor: pointer; text-decoration: none; }
    a:hover { text-decoration: underline; }
    h1, h2, h3 { border-bottom: 1px solid #dcdfe3; padding-bottom: 4px; margin-top: 1.2em; }
    p { margin: 0.6em 0; }
    table { border-collapse: collapse; margin: 10px 0; }
    table.infobox {
      float: right;
      margin: 0 0 12px 16px;
      border: 1px solid #a2a9b1;
      background: #f8f9fa;
      font-size: 13px;
      max-width: 320px;
    }
    table.infobox td, table.infobox th { border: 1px solid #a2a9b1; padding: 4px 8px; }
    table.wikitable { border: 1px solid #a2a9b1; }
    table.wikitable td, table.wikitable th { border: 1px solid #a2a9b1; padding: 4px 8px; }
    .thumb { margin: 8px 0; }
    .thumbinner {
      border: 1px solid #c8ccd1;
      background: #f8f9fa;
      padding: 4px;
      display: inline-block;
    }
    .tright { float: right; margin-left: 16px; }
    .tleft { float: left; margin-right: 16px; }
    img { max-width: 100%; height: auto; }
    .mw-editsection { display: none; }
    .reference, sup.reference { font-size: 0.75em; }
    .reflist { font-size: 0.85em; }
    .hatnote, .dablink { font-style: italic; color: #444; margin: 0.4em 0; }
    .navbox, .vertical-navbox, .metadata, .ambox { display: none; }
    ul, ol { padding-left: 1.6em; }
    .mw-parser-output { overflow-wrap: break-word; }
  `;

  const state = {
    lang: "ja",
    startTitle: null,
    goalTitle: null,
    goalHtml: null,
    currentTitle: null,
    clicks: 0,
    path: [],
    startTime: null,
    timerHandle: null,
    finished: false,
  };

  let shadowRoot = null;
  let goalPreviewShadowRoot = null;

  function apiBase() {
    return `https://${state.lang}.wikipedia.org/w/api.php`;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { els.toast.hidden = true; }, 2200);
  }

  function normTitle(t) {
    return (t || "").replace(/_/g, " ").trim();
  }

  async function fetchRandomMainTitle() {
    const url = `${apiBase()}?action=query&list=random&rnnamespace=0&rnlimit=1&rnfilterredir=nonredirects&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("random fetch failed");
    const data = await res.json();
    const item = data?.query?.random?.[0];
    if (!item) throw new Error("no random article");
    return item.title;
  }

  async function resolveTitle(title) {
    const url = `${apiBase()}?action=query&titles=${encodeURIComponent(title)}&redirects=1&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("resolve fetch failed");
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;
    return { title: page.title, ns: page.ns, pageid: page.pageid };
  }

  async function fetchArticleHtml(title) {
    const url = `${apiBase()}?action=parse&page=${encodeURIComponent(title)}&prop=text&redirects=1&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("parse fetch failed");
    const data = await res.json();
    if (data.error || !data.parse) throw new Error(data.error?.info || "parse error");
    return {
      title: data.parse.title,
      html: data.parse.text["*"],
    };
  }

  function setLoading(isLoading) {
    els.loading.hidden = !isLoading;
    if (isLoading) els.articleView.hidden = true;
  }

  function ensureShadow() {
    if (!shadowRoot) {
      shadowRoot = els.articleView.attachShadow({ mode: "open" });
      shadowRoot.addEventListener("click", onArticleClick);
    }
  }

  function renderArticle(title, html) {
    ensureShadow();
    shadowRoot.innerHTML = `<style>${SHADOW_CSS}</style><div class="mw-parser-output">${html}</div>`;
    els.articleView.hidden = false;
    els.loading.hidden = true;
    els.articleView.scrollTop = 0;
  }

  function ensureGoalPreviewShadow() {
    if (!goalPreviewShadowRoot) {
      goalPreviewShadowRoot = els.goalPreviewView.attachShadow({ mode: "open" });
      goalPreviewShadowRoot.addEventListener("click", (evt) => {
        const anchor = evt.composedPath().find((n) => n.tagName === "A");
        if (!anchor) return;
        evt.preventDefault();
        showToast("プレビューではリンクを辿れません");
      });
    }
  }

  function renderGoalPreview(html) {
    ensureGoalPreviewShadow();
    goalPreviewShadowRoot.innerHTML = `<style>${SHADOW_CSS}</style><div class="mw-parser-output">${html}</div>`;
  }

  async function openGoalPreview() {
    els.goalPreviewModal.hidden = false;
    if (state.goalHtml) {
      renderGoalPreview(state.goalHtml);
      els.goalPreviewLoading.hidden = true;
      return;
    }
    els.goalPreviewLoading.hidden = false;
    try {
      const article = await fetchArticleHtml(state.goalTitle);
      state.goalHtml = article.html;
      renderGoalPreview(article.html);
    } catch (err) {
      showToast("ゴール記事の読み込みに失敗しました");
    } finally {
      els.goalPreviewLoading.hidden = true;
    }
  }

  function extractCandidateTitle(href) {
    if (!href) return null;
    if (href.startsWith("./")) {
      href = href.slice(2);
    } else if (href.startsWith("/wiki/")) {
      href = href.slice(6);
    } else {
      return null;
    }
    href = href.split("#")[0].split("?")[0];
    if (!href) return null;
    try {
      href = decodeURIComponent(href);
    } catch (e) { /* keep as-is */ }
    return normTitle(href);
  }

  async function onArticleClick(evt) {
    const anchor = evt.composedPath().find((n) => n.tagName === "A");
    if (!anchor) return;
    evt.preventDefault();
    const href = anchor.getAttribute("href") || "";

    if (href.startsWith("#")) {
      const id = decodeURIComponent(href.slice(1));
      const target = shadowRoot.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const candidate = extractCandidateTitle(href);
    if (!candidate) {
      showToast("このリンクは辿れません");
      return;
    }
    await navigateTo(candidate);
  }

  async function navigateTo(rawTitle) {
    if (state.finished) return;
    setLoading(true);
    try {
      const resolved = await resolveTitle(rawTitle);
      if (!resolved || resolved.ns !== 0) {
        setLoading(false);
        els.articleView.hidden = false;
        showToast("記事ページではありません");
        return;
      }
      const article = await fetchArticleHtml(resolved.title);
      state.clicks += 1;
      state.currentTitle = article.title;
      state.path.push(article.title);
      renderArticle(article.title, article.html);
      updateStatsUI();
      updateBreadcrumb();
      checkWin();
    } catch (err) {
      setLoading(false);
      els.articleView.hidden = false;
      showToast("読み込みに失敗しました");
    }
  }

  function updateStatsUI() {
    els.clickCount.textContent = String(state.clicks);
  }

  function updateBreadcrumb() {
    els.breadcrumb.hidden = false;
    els.breadcrumb.innerHTML = "";
    state.path.forEach((title, idx) => {
      if (idx > 0) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "→";
        els.breadcrumb.appendChild(sep);
      }
      const crumb = document.createElement("span");
      crumb.className = "crumb" + (idx === state.path.length - 1 ? " current" : "");
      crumb.textContent = title;
      els.breadcrumb.appendChild(crumb);
    });
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function startTimer() {
    state.startTime = Date.now();
    stopTimer();
    state.timerHandle = setInterval(() => {
      const elapsed = (Date.now() - state.startTime) / 1000;
      els.timer.textContent = formatTime(elapsed);
    }, 1000);
  }

  function stopTimer() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function checkWin() {
    if (state.currentTitle === state.goalTitle) {
      finishGame();
    }
  }

  function finishGame() {
    state.finished = true;
    stopTimer();
    const elapsedSeconds = (Date.now() - state.startTime) / 1000;
    const entry = {
      date: new Date().toISOString(),
      lang: state.lang,
      start: state.startTitle,
      goal: state.goalTitle,
      clicks: state.clicks,
      timeSeconds: Math.round(elapsedSeconds),
      path: state.path.slice(),
    };
    saveHistoryEntry(entry);
    els.winSummary.textContent =
      `${state.startTitle} → ${state.goalTitle}\nクリック数: ${state.clicks} / タイム: ${formatTime(elapsedSeconds)}`;
    els.winSummary.style.whiteSpace = "pre-line";
    els.winModal.hidden = false;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistoryEntry(entry) {
    const history = loadHistory();
    history.push(entry);
    while (history.length > MAX_HISTORY) history.shift();
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  function renderRanking() {
    const history = loadHistory();
    const sorted = history.slice().sort((a, b) => {
      if (a.clicks !== b.clicks) return a.clicks - b.clicks;
      return a.timeSeconds - b.timeSeconds;
    }).slice(0, 20);

    els.rankingList.innerHTML = "";
    if (sorted.length === 0) {
      els.rankingList.innerHTML = `<div class="empty-msg">まだ記録がありません</div>`;
      return;
    }
    sorted.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <span class="rank">${idx + 1}</span>
        <span class="route">${escapeHtml(entry.start)}<span class="sep">→</span>${escapeHtml(entry.goal)}</span>
        <span class="metrics">${entry.clicks}クリック / ${formatTime(entry.timeSeconds)}</span>
      `;
      els.rankingList.appendChild(row);
    });
  }

  function renderHistory() {
    const history = loadHistory().slice().reverse();
    els.historyList.innerHTML = "";
    if (history.length === 0) {
      els.historyList.innerHTML = `<div class="empty-msg">まだ記録がありません</div>`;
      return;
    }
    history.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "list-row";
      const d = new Date(entry.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      row.innerHTML = `
        <span class="metrics">${dateStr}</span>
        <span class="route">${escapeHtml(entry.start)}<span class="sep">→</span>${escapeHtml(entry.goal)}</span>
        <span class="metrics">${entry.clicks}クリック / ${formatTime(entry.timeSeconds)}</span>
      `;
      els.historyList.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function beginGame() {
    els.startScreen.hidden = true;
    els.gameBar.hidden = true;
    els.breadcrumb.hidden = true;
    els.articleView.hidden = true;
    setLoading(true);

    state.clicks = 0;
    state.path = [];
    state.finished = false;
    state.goalHtml = null;
    els.clickCount.textContent = "0";
    els.timer.textContent = "00:00";

    try {
      let start = await fetchRandomMainTitle();
      let goal = await fetchRandomMainTitle();
      let guard = 0;
      while (normTitle(goal) === normTitle(start) && guard < 5) {
        goal = await fetchRandomMainTitle();
        guard += 1;
      }
      const [startArticle, goalArticle] = await Promise.all([
        fetchArticleHtml(start),
        fetchArticleHtml(goal),
      ]);

      state.startTitle = startArticle.title;
      state.goalTitle = goalArticle.title;
      state.goalHtml = goalArticle.html;
      state.currentTitle = startArticle.title;
      state.path = [startArticle.title];

      els.startTitle.textContent = state.startTitle;
      els.goalTitle.textContent = state.goalTitle;
      els.gameBar.hidden = false;

      renderArticle(startArticle.title, startArticle.html);
      updateStatsUI();
      updateBreadcrumb();
      startTimer();
    } catch (err) {
      setLoading(false);
      els.startScreen.hidden = false;
      showToast("ゲームの開始に失敗しました。もう一度お試しください");
    }
  }

  function closeWinModal() {
    els.winModal.hidden = true;
  }

  function openHistoryModal() {
    renderRanking();
    renderHistory();
    els.historyModal.hidden = false;
  }

  function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    els.rankingList.hidden = tabName !== "ranking";
    els.historyList.hidden = tabName !== "history";
  }

  els.startBtn.addEventListener("click", beginGame);
  els.newGameBtn.addEventListener("click", beginGame);
  els.winNewGameBtn.addEventListener("click", () => { closeWinModal(); beginGame(); });
  els.winCloseBtn.addEventListener("click", closeWinModal);
  els.historyBtn.addEventListener("click", openHistoryModal);
  els.previewGoalBtn.addEventListener("click", openGoalPreview);
  els.goalPreviewCloseBtn.addEventListener("click", () => { els.goalPreviewModal.hidden = true; });
  els.historyCloseBtn.addEventListener("click", () => { els.historyModal.hidden = true; });
  els.clearHistoryBtn.addEventListener("click", () => {
    if (confirm("履歴とランキングをすべて消去しますか?")) {
      localStorage.removeItem(HISTORY_KEY);
      renderRanking();
      renderHistory();
    }
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  els.langSelect.addEventListener("change", (e) => {
    state.lang = e.target.value;
  });
})();
