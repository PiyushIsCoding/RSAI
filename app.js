/**
 * RSAI Recall — Exam Practice Engine
 * Complete implementation of Week-by-Week Browse + Multi-Week Shuffled Quiz Mode
 * Supports 2024, 2025 & 2026 PYQs + Study Material
 */

const YEAR_OPTIONS = [
  { value: '2026', label: '2026 (This Year / Current)', badge: '2026 (This Year)' },
  { value: '2025', label: '2025 PYQs', badge: '2025 PYQ' },
  { value: '2024', label: '2024 PYQs', badge: '2024 PYQ' },
  { value: 'all', label: 'All Years (2024 - 2026)', badge: 'All Years (2024 - 2026)' }
];

const WEEK_METADATA = [
  { week: 1, title: "AI capabilities & risks" },
  { week: 2, title: "Robustness & alignment" },
  { week: 3, title: "Machine unlearning" },
  { week: 4, title: "Bias & its sources" },
  { week: 5, title: "Bias in vision-language models" },
  { week: 6, title: "Data privacy" },
  { week: 7, title: "Differential privacy & fairness" },
  { week: 8, title: "Interpretability" },
  { week: 9, title: "AI policies & AGI" },
  { week: 10, title: "AI policy: expert" },
  { week: 11, title: "Safety in autonomous systems" },
  { week: 12, title: "Societal & existential risks" }
];

// App Data
let allQuestions = [];

// Browse State
let currentBrowseWeek = 1;
let browseSource = 'assignment'; // 'assignment' or 'all'
let selectedBrowseYear = '2026';  // '2026', '2025', '2024', or 'all'
let showAnswersMode = false;
let browseUserAnswers = {}; // map of qId -> selected option index or indices
let browseSubmittedAnswers = {}; // map of qId -> whether the answer is locked

// Modal Configuration State
let modalSelectedWeeks = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
let modalSource = 'assignment'; // 'assignment' or 'all'
let modalYear = '2026';         // '2026', '2025', '2024', or 'all'
let quizQuestionCount = 'all';

// Quiz State
let quizQuestions = [];
let quizCurrentIndex = 0;
let quizUserAnswers = {}; // map of index -> { selected: [indices], submitted: bool, isCorrect: bool }
let isQuizReviewMode = false;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestionsData();
  initSidebar();
  renderBrowseView();
  initModalGrid();
});

async function loadQuestionsData() {
  if (window.RSAI_QUESTIONS && Array.isArray(window.RSAI_QUESTIONS)) {
    allQuestions = window.RSAI_QUESTIONS;
  } else {
    try {
      const res = await fetch('questions.json');
      allQuestions = await res.json();
    } catch (err) {
      console.error('Error loading questions:', err);
      alert('Could not load questions data.');
      return;
    }
  }
}

// ============================================================
// QUESTION FILTERING HELPER
// ============================================================
function filterQuestions(questions, yearFilter, sourceFilter, weekFilter = null) {
  return questions.filter(q => {
    // 1. Week matching
    if (weekFilter !== null) {
      if (typeof weekFilter === 'number' && q.week !== weekFilter) return false;
      if (weekFilter instanceof Set && !weekFilter.has(q.week)) return false;
    }

    // 2. Source matching
    if (sourceFilter === 'assignment' && q.source !== 'assignment') return false;

    // 3. Year matching
    if (yearFilter !== 'all') {
      const targetYear = parseInt(yearFilter, 10);
      return q.year === targetYear;
    }

    return true;
  });
}

// ============================================================
// SIDEBAR & WEEK LIST
// ============================================================
function initSidebar() {
  const nav = document.getElementById('weeksNav');
  if (!nav) return;
  nav.innerHTML = '';

  WEEK_METADATA.forEach(w => {
    const qCount = filterQuestions(allQuestions, selectedBrowseYear, browseSource, w.week).length;

    const item = document.createElement('div');
    item.className = `nav-week-item ${w.week === currentBrowseWeek ? 'active' : ''}`;
    item.dataset.week = w.week;

    const formattedNum = String(w.week).padStart(2, '0');
    item.innerHTML = `
      <span class="nav-week-num">${formattedNum}</span>
      <span class="nav-week-title">${escapeHtml(w.title)}</span>
      <span class="nav-week-count">${qCount}</span>
    `;

    item.addEventListener('click', () => {
      selectWeek(w.week);
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.remove('open');
    });

    nav.appendChild(item);
  });
}

function onSidebarYearChange(val) {
  selectedBrowseYear = val;

  const badge = document.getElementById('browseYearBadge');
  if (badge) {
    const selectedYear = YEAR_OPTIONS.find(option => option.value === val);
    badge.textContent = selectedYear ? selectedYear.badge : 'All Years (2024 - 2026)';
  }

  initSidebar();
  renderBrowseView();
}

function selectWeek(weekNum) {
  currentBrowseWeek = weekNum;

  document.querySelectorAll('.nav-week-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.week, 10) === weekNum);
  });

  switchView('browseView');
  renderBrowseView();

  const meta = WEEK_METADATA.find(m => m.week === weekNum);
  if (meta) {
    document.title = `Week ${meta.week}: ${meta.title} — RSAI Recall`;
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}

// ============================================================
// VIEW SWITCHING
// ============================================================
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ============================================================
// BROWSE VIEW RENDERING
// ============================================================
function renderBrowseView() {
  const meta = WEEK_METADATA.find(m => m.week === currentBrowseWeek) || { week: currentBrowseWeek, title: '' };
  
  const heading = document.getElementById('currentWeekHeading');
  const topic = document.getElementById('currentWeekTopic');
  if (heading) heading.innerHTML = `Week ${meta.week}<span class="dot-accent">.</span>`;
  if (topic) topic.textContent = meta.title;

  // Filter questions for this week, selected year, and source
  const weekQuestions = filterQuestions(allQuestions, selectedBrowseYear, browseSource, currentBrowseWeek);

  // Update badge count
  const countBadge = document.getElementById('browseCountBadge');
  if (countBadge) countBadge.textContent = `${weekQuestions.length} questions`;

  // Render question cards stream
  const container = document.getElementById('questionsStream');
  if (!container) return;
  container.innerHTML = '';

  if (weekQuestions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-dim);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No questions found for Week ${currentBrowseWeek} with current filter.</p>
        <p style="font-size: 0.88rem;">Try selecting "All Years" or "All (+ Notes)".</p>
      </div>
    `;
    return;
  }

  const prefixes = ['A', 'B', 'C', 'D', 'E', 'F'];

  weekQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'browse-card';
    card.id = `qcard-${q.id}`;

    const formattedIndex = String(idx + 1).padStart(2, '0');
    const userSelected = browseUserAnswers[q.id];
    const isSubmitted = browseSubmittedAnswers[q.id] === true;
    const isAnswered = userSelected !== undefined && isSubmitted;
    const selectedOptions = Array.isArray(userSelected) ? userSelected : [userSelected];
    const requiresBrowseSubmit = shouldUseSubmitButton(q);
    const numericInputQuestion = isNumericInputQuestion(q);

    // Year badge string
    const yearLabel = q.year === 'all' ? 'Lecture Notes' : `${q.year} PYQ`;

    // Build options HTML
    let optionsHtml = '';
    q.options.forEach((optText, optIdx) => {
      let extraClass = '';
      const isExpected = isCorrectOption(q, optIdx);

      if (showAnswersMode) {
        if (isExpected) extraClass = 'correct locked';
        else extraClass = 'locked';
      } else if (isAnswered) {
        if (isExpected) extraClass = 'correct locked';
        else if (selectedOptions.includes(optIdx)) extraClass = 'wrong locked';
        else extraClass = 'locked';
      } else if (selectedOptions.includes(optIdx)) {
        extraClass = 'selected';
      }

      optionsHtml += `
        <div class="card-opt-item ${extraClass}" data-qid="${q.id}" data-opt="${optIdx}">
          <span class="opt-prefix">${prefixes[optIdx] || (optIdx + 1)}</span>
          <span class="opt-text">${escapeHtml(optText)}</span>
        </div>
      `;
    });
    if (numericInputQuestion) {
      const numericValue = userSelected === undefined ? '' : String(userSelected);
      optionsHtml = `
        <input class="numeric-answer-input" type="number" step="any"
          value="${escapeHtml(numericValue)}" placeholder="Enter your answer"
          aria-label="Numerical answer" ${isSubmitted || showAnswersMode ? 'disabled' : ''}>
      `;
    }

    // Explanation HTML
    const showExp = showAnswersMode || isAnswered;
    const expHtml = `
      <div class="card-explanation" style="${showExp ? '' : 'display: none;'}">
        <strong>Explanation:</strong> ${escapeHtml(q.explanation || 'Responsible & Safe AI concept.')}
      </div>
    `;

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-q-num">${formattedIndex}</span>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
            <span class="year-badge" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${yearLabel}</span>
            <span style="font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; font-family:var(--font-mono);">${numericInputQuestion ? 'Numerical Answer' : (q.multiSelect ? 'Select all that apply' : 'Single Choice')}</span>
          </div>
          <h2 class="card-q-text">${escapeHtml(q.question)}</h2>
        </div>
      </div>
      <div class="card-options-list">
        ${optionsHtml}
      </div>
      ${requiresBrowseSubmit && !isSubmitted && !showAnswersMode ? `
        <button class="btn-action btn-submit browse-submit-btn" type="button" ${selectedOptions.length === 0 || selectedOptions[0] === undefined ? 'disabled' : ''}>
          Submit Answer
        </button>
      ` : ''}
      ${expHtml}
    `;

    card.querySelectorAll('.card-opt-item').forEach(item => {
      item.addEventListener('click', () => {
        if (showAnswersMode || isSubmitted) return;
        const qid = parseInt(item.dataset.qid, 10);
        const opt = parseInt(item.dataset.opt, 10);
        handleBrowseOptionClick(qid, opt);
      });
    });

    const numericInput = card.querySelector('.numeric-answer-input');
    if (numericInput) {
      numericInput.addEventListener('input', () => {
        if (!showAnswersMode && !isSubmitted) {
          browseUserAnswers[q.id] = numericInput.value;
          const submitButton = card.querySelector('.browse-submit-btn');
          if (submitButton) submitButton.disabled = numericInput.value.trim() === '';
        }
      });
    }

    const submitButton = card.querySelector('.browse-submit-btn');
    if (submitButton) {
      submitButton.addEventListener('click', () => submitBrowseAnswer(q.id));
    }

    container.appendChild(card);
  });

  const scoreBadge = document.getElementById('browseScoreBadge');
  if (scoreBadge) {
    const answered = weekQuestions.filter(q => browseSubmittedAnswers[q.id] === true);
    const correct = answered.filter(q => {
      const selected = browseUserAnswers[q.id];
      if (q.multiSelect) {
        const expected = (Array.isArray(q.answer) ? q.answer : [q.answer]).sort();
        const given = (Array.isArray(selected) ? selected : [selected]).sort();
        return JSON.stringify(expected) === JSON.stringify(given);
      }
      if (isNumericInputQuestion(q)) {
        return Number(selected) === Number(q.answer);
      }
      return isCorrectOption(q, selected);
    }).length;
    scoreBadge.textContent = `${correct} correct`;
  }
}

function handleBrowseOptionClick(qid, selectedOpt) {
  if (browseSubmittedAnswers[qid] === true) return;
  const question = allQuestions.find(q => q.id === qid);
  if (!question) return;
  if (isNumericInputQuestion(question)) return;

  if (question.multiSelect) {
    const selected = Array.isArray(browseUserAnswers[qid]) ? browseUserAnswers[qid] : [];
    const position = selected.indexOf(selectedOpt);
    if (position >= 0) selected.splice(position, 1);
    else selected.push(selectedOpt);
    browseUserAnswers[qid] = selected;
  } else {
    browseUserAnswers[qid] = selectedOpt;
    if (!shouldUseSubmitButton(question)) {
      browseSubmittedAnswers[qid] = true;
    }
  }
  renderBrowseView();
}

function submitBrowseAnswer(qid) {
  if (browseSubmittedAnswers[qid] === true) return;
  const selected = browseUserAnswers[qid];
  if (selected === undefined || selected === '' || (Array.isArray(selected) && selected.length === 0)) return;
  browseSubmittedAnswers[qid] = true;
  renderBrowseView();
}

function setBrowseSource(src) {
  browseSource = src;
  document.querySelectorAll('#browseSourceFilter .source-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.source === src);
  });
  initSidebar();
  renderBrowseView();
}

function toggleShowAnswers(checked) {
  showAnswersMode = checked;
  renderBrowseView();
}

// ============================================================
// QUIZ CONFIGURATION MODAL
// ============================================================
function openQuizModal() {
  initModalGrid();
  updateModalStats();
  const modal = document.getElementById('quizModal');
  if (modal) modal.style.display = 'flex';
}

function closeQuizModal() {
  const modal = document.getElementById('quizModal');
  if (modal) modal.style.display = 'none';
}

function setModalYear(yearVal) {
  modalYear = yearVal;
  document.querySelectorAll('#modalYearGroup .toggle-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.year === yearVal);
  });
  initModalGrid();
  updateModalStats();
}

function setModalSource(src) {
  modalSource = src;
  document.querySelectorAll('#modalSourceGroup .toggle-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.source === src);
  });
  initModalGrid();
  updateModalStats();
}

function setQuizQuestionCount(value, isCustom = false) {
  if (value === 'all') {
    quizQuestionCount = 'all';
    document.querySelectorAll('#quizCountGroup .toggle-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.count === 'all');
    });
    const customInput = document.getElementById('customQuizCount');
    if (customInput) customInput.value = '';
    updateModalStats();
    return;
  }

  const count = Number.parseInt(value, 10);
  if (!Number.isInteger(count) || count < 1) {
    if (isCustom) quizQuestionCount = null;
    updateModalStats();
    return;
  }

  quizQuestionCount = count;
  document.querySelectorAll('#quizCountGroup .toggle-pill').forEach(pill => {
    pill.classList.toggle('active', !isCustom && Number(pill.dataset.count) === count);
  });

  if (!isCustom) {
    const customInput = document.getElementById('customQuizCount');
    if (customInput) customInput.value = '';
  }
  updateModalStats();
}

function initModalGrid() {
  const grid = document.getElementById('modalWeeksGrid');
  if (!grid) return;
  grid.innerHTML = '';

  WEEK_METADATA.forEach(w => {
    const card = document.createElement('div');
    const isSelected = modalSelectedWeeks.has(w.week);
    card.className = `modal-week-card ${isSelected ? 'selected' : ''}`;
    card.dataset.week = w.week;

    const count = filterQuestions(allQuestions, modalYear, modalSource, w.week).length;

    card.innerHTML = `
      <span class="mwc-num">Week ${w.week}</span>
      <span class="mwc-topic">${escapeHtml(w.title)}</span>
      <span style="font-size:0.7rem; font-family:var(--font-mono); color:var(--text-dim); margin-top:2px;">${count} Qs</span>
    `;

    card.addEventListener('click', () => {
      if (modalSelectedWeeks.has(w.week)) {
        if (modalSelectedWeeks.size > 1) {
          modalSelectedWeeks.delete(w.week);
          card.classList.remove('selected');
        }
      } else {
        modalSelectedWeeks.add(w.week);
        card.classList.add('selected');
      }
      updateModalStats();
    });

    grid.appendChild(card);
  });
}

function modalSelectAllWeeks() {
  for (let w = 1; w <= 12; w++) modalSelectedWeeks.add(w);
  document.querySelectorAll('.modal-week-card').forEach(c => c.classList.add('selected'));
  updateModalStats();
}

function modalDeselectAllWeeks() {
  modalSelectedWeeks.clear();
  modalSelectedWeeks.add(currentBrowseWeek || 1);
  document.querySelectorAll('.modal-week-card').forEach(c => {
    c.classList.toggle('selected', parseInt(c.dataset.week, 10) === (currentBrowseWeek || 1));
  });
  updateModalStats();
}

function updateModalStats() {
  const counter = document.getElementById('modalWeekCounter');
  if (counter) {
    counter.textContent = `${modalSelectedWeeks.size} of 12 selected`;
  }

  const matchingQuestions = getFilteredQuizQuestions();
  const requestedCount = quizQuestionCount;
  const selectedCount = requestedCount === 'all'
    ? matchingQuestions.length
    : requestedCount;
  const readyElem = document.getElementById('modalTotalAvailable');
  if (readyElem) {
    readyElem.textContent = `${matchingQuestions.length} available • ${selectedCount || '—'} selected`;
  }

  const countHelp = document.getElementById('quizCountHelp');
  if (countHelp) {
    if (!requestedCount) {
      countHelp.textContent = 'Enter a whole number greater than 0.';
    } else if (requestedCount !== 'all' && requestedCount > matchingQuestions.length) {
      countHelp.textContent = `The quiz will use all ${matchingQuestions.length} available questions.`;
    } else {
      countHelp.textContent = 'A random selection will be taken from the available questions.';
    }
  }

  const startBtn = document.getElementById('startQuizBtn');
  if (startBtn) {
    startBtn.disabled = false;
  }
}

function getFilteredQuizQuestions() {
  return filterQuestions(allQuestions, modalYear, modalSource, modalSelectedWeeks);
}

// ============================================================
// QUIZ ENGINE (WITH QUESTION SHUFFLING)
// ============================================================
function startConfiguredQuiz() {
  const filtered = getFilteredQuizQuestions();
  if (filtered.length === 0) {
    alert('Please select at least one week with available questions.');
    return;
  }
  if (!quizQuestionCount) {
    alert('Please choose a valid number of questions.');
    return;
  }

  // Generate randomized questions while preserving 2026 option order.
  const questionCount = quizQuestionCount === 'all'
    ? filtered.length
    : Math.min(quizQuestionCount, filtered.length);
  quizQuestions = prepareQuizQuestions(filtered, questionCount);
  quizCurrentIndex = 0;
  isQuizReviewMode = false;

  quizUserAnswers = {};
  for (let i = 0; i < quizQuestions.length; i++) {
    quizUserAnswers[i] = {
      selected: [],
      numericAnswer: '',
      submitted: false,
      isCorrect: false
    };
  }

  closeQuizModal();
  switchView('quizView');

  const reviewBar = document.getElementById('reviewStatusBar');
  if (reviewBar) reviewBar.style.display = 'none';

  renderCurrentQuizQuestion();
  updateQuizTopBar();
}

/**
 * Shuffles questions and, for years other than 2026, shuffles options
 * while accurately re-mapping the correct answer indices.
 */
function prepareQuizQuestions(questions, questionCount = questions.length) {
  const list = questions.map(q => JSON.parse(JSON.stringify(q)));

  // 1. Shuffle question array (Fisher-Yates)
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  // Keep only the requested number of randomly selected questions.
  list.length = questionCount;

  // 2. Preserve the source option order for 2026. The other question banks
  // retain their existing randomized option behavior.
  list.forEach(q => {
    if (q.year === 2026) return;

    const originalOptions = q.options;
    const isCorrectFn = (idx) => Array.isArray(q.answer) ? q.answer.includes(idx) : q.answer === idx;

    const indexed = originalOptions.map((text, idx) => ({
      text,
      isCorrect: isCorrectFn(idx)
    }));

    // Fisher-Yates shuffle options
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }

    q.options = indexed.map(item => item.text);

    // Re-map answers to new positions
    if (q.multiSelect) {
      q.answer = [];
      indexed.forEach((item, newIdx) => {
        if (item.isCorrect) q.answer.push(newIdx);
      });
    } else {
      q.answer = indexed.findIndex(item => item.isCorrect);
    }
  });

  return list;
}

function renderCurrentQuizQuestion() {
  const q = quizQuestions[quizCurrentIndex];
  const state = quizUserAnswers[quizCurrentIndex];
  if (!q) return;

  // Year tag string
  const yearText = q.year === 'all' ? 'Lecture Notes' : `${q.year} PYQ`;

  // Meta tags
  document.getElementById('quizWeekTag').textContent = `Week ${q.week}`;
  document.getElementById('quizSourceTag').textContent = `${yearText} • ${q.source === 'assignment' ? 'Assignment' : 'Study Notes'}`;
  document.getElementById('quizTypeTag').textContent = isNumericInputQuestion(q)
    ? 'Numerical Answer'
    : (q.multiSelect ? 'Select all that apply' : 'Single Choice');

  // Question number & text
  document.getElementById('quizQNum').textContent = String(quizCurrentIndex + 1).padStart(2, '0');
  document.getElementById('quizQText').textContent = q.question;

  // Options list
  const container = document.getElementById('quizOptionsList');
  container.innerHTML = '';
  const prefixes = ['A', 'B', 'C', 'D', 'E', 'F'];

  q.options.forEach((optText, idx) => {
    const item = document.createElement('div');
    item.className = 'card-opt-item';
    item.dataset.index = idx;

    if (state.selected.includes(idx)) {
      item.classList.add('selected');
    }

    if (state.submitted || isQuizReviewMode) {
      item.classList.add('locked');
      const isExpected = isCorrectOption(q, idx);
      const isChosen = state.selected.includes(idx);

      if (isExpected) {
        item.classList.add('correct');
      } else if (isChosen && !isExpected) {
        item.classList.add('wrong');
      }
    } else {
      item.addEventListener('click', () => toggleQuizOption(idx));
    }

    item.innerHTML = `
      <span class="opt-prefix">${prefixes[idx] || (idx + 1)}</span>
      <span class="opt-text">${escapeHtml(optText)}</span>
    `;

    container.appendChild(item);
  });
  if (isNumericInputQuestion(q)) {
    const numericInput = document.createElement('input');
    numericInput.className = 'numeric-answer-input';
    numericInput.type = 'number';
    numericInput.step = 'any';
    numericInput.placeholder = 'Enter your answer';
    numericInput.value = state.numericAnswer;
    numericInput.disabled = state.submitted || isQuizReviewMode;
    numericInput.setAttribute('aria-label', 'Numerical answer');
    numericInput.addEventListener('input', () => {
      state.numericAnswer = numericInput.value;
      submitBtn.disabled = numericInput.value.trim() === '';
    });
    container.appendChild(numericInput);
  }

  // Submit button
  const submitBtn = document.getElementById('quizSubmitBtn');
  if (state.submitted || isQuizReviewMode) {
    submitBtn.style.display = 'none';
  } else if (shouldUseSubmitButton(q)) {
    submitBtn.style.display = 'inline-flex';
    submitBtn.disabled = isNumericInputQuestion(q)
      ? state.numericAnswer.trim() === ''
      : state.selected.length === 0;
  } else {
    submitBtn.style.display = 'none';
  }

  // Explanation Box
  const expBox = document.getElementById('quizExplanation');
  const expHeader = document.getElementById('quizExpHeader');
  const expText = document.getElementById('quizExpText');

  if (state.submitted || isQuizReviewMode) {
    expBox.style.display = 'block';
    expBox.className = 'quiz-explanation ' + (state.isCorrect ? 'correct-box' : 'wrong-box');

    if (expHeader) {
      expHeader.innerHTML = state.isCorrect
        ? `<span>✓ Correct Answer</span>`
        : `<span>✕ Incorrect Answer</span>`;
    }

    let correctText = '';
    if (Array.isArray(q.answer)) {
      const letters = q.answer.map(a => prefixes[a] || (a + 1)).join(', ');
      correctText = `<strong>Correct Option(s):</strong> ${letters}<br>`;
    } else if (isNumericInputQuestion(q)) {
      correctText = `<strong>Correct Answer:</strong> ${q.answer}<br>`;
    } else if (typeof q.answer === 'number') {
      correctText = `<strong>Correct Option:</strong> ${prefixes[q.answer] || (q.answer + 1)}<br>`;
    }

    expText.innerHTML = `${correctText}${escapeHtml(q.explanation || 'Responsible & Safe AI concept.')}`;
  } else {
    expBox.style.display = 'none';
  }

  // Prev / Next buttons
  const prevBtn = document.getElementById('quizPrevBtn');
  const nextBtn = document.getElementById('quizNextBtn');

  if (prevBtn) prevBtn.disabled = quizCurrentIndex === 0;
  if (nextBtn) {
    if (quizCurrentIndex === quizQuestions.length - 1) {
      nextBtn.innerHTML = `Finish Quiz <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      nextBtn.innerHTML = `Next <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }
  }

  updateQuizTopBar();
}

function toggleQuizOption(idx) {
  const q = quizQuestions[quizCurrentIndex];
  const state = quizUserAnswers[quizCurrentIndex];
  if (state.submitted || isQuizReviewMode) return;

  if (q.multiSelect) {
    const pos = state.selected.indexOf(idx);
    if (pos > -1) state.selected.splice(pos, 1);
    else state.selected.push(idx);
  } else {
    state.selected = [idx];
    if (!shouldUseSubmitButton(q)) {
      submitQuizAnswer();
      return;
    }
  }

  document.querySelectorAll('#quizOptionsList .card-opt-item').forEach(el => {
    const optIdx = parseInt(el.dataset.index, 10);
    el.classList.toggle('selected', state.selected.includes(optIdx));
  });

  const submitBtn = document.getElementById('quizSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = state.selected.length === 0;
  }
}

function shouldUseSubmitButton(q) {
  return q.multiSelect || isNumericQuestion(q);
}

function isNumericInputQuestion(q) {
  return q.numeric === true || q.type === 'numeric' || q.inputType === 'number';
}

function isNumericQuestion(q) {
  if (isNumericInputQuestion(q)) return true;
  return /\b(calculate|compute|estimate|formula|how many|numerical|numeric|round to|what is the value)\b/i.test(q.question);
}

function submitQuizAnswer() {
  const q = quizQuestions[quizCurrentIndex];
  const state = quizUserAnswers[quizCurrentIndex];
  if (state.submitted) return;
  if (isNumericInputQuestion(q)) {
    if (state.numericAnswer.trim() === '') return;
    state.submitted = true;
    state.isCorrect = Number(state.numericAnswer) === Number(q.answer);
    renderCurrentQuizQuestion();
    return;
  }
  if (state.selected.length === 0) return;

  state.submitted = true;

  if (q.multiSelect) {
    const expected = Array.isArray(q.answer) ? [...q.answer].sort() : [q.answer];
    const given = [...state.selected].sort();
    state.isCorrect = JSON.stringify(expected) === JSON.stringify(given);
  } else {
    state.isCorrect = state.selected[0] === q.answer;
  }

  renderCurrentQuizQuestion();
}

function prevQuizQuestion() {
  if (quizCurrentIndex > 0) {
    quizCurrentIndex--;
    renderCurrentQuizQuestion();
  }
}

function nextQuizQuestion() {
  if (quizCurrentIndex < quizQuestions.length - 1) {
    quizCurrentIndex++;
    renderCurrentQuizQuestion();
  } else {
    finishQuizAndShowResults();
  }
}

function updateQuizTopBar() {
  const total = quizQuestions.length;
  const current = quizCurrentIndex + 1;

  document.getElementById('quizProgressText').textContent = `Question ${current} of ${total}`;
  const pct = total > 0 ? (current / total) * 100 : 0;
  document.getElementById('quizProgressBar').style.width = `${pct}%`;

  let correct = 0;
  let answered = 0;
  Object.values(quizUserAnswers).forEach(ans => {
    if (ans.submitted) {
      answered++;
      if (ans.isCorrect) correct++;
    }
  });

  document.getElementById('quizScoreCorrect').textContent = correct;
  document.getElementById('quizScoreAnswered').textContent = answered;
}

function exitQuiz() {
  if (!isQuizReviewMode && Object.values(quizUserAnswers).some(a => a.submitted)) {
    if (!confirm('Exit quiz? Current progress will be discarded.')) return;
  }
  switchView('browseView');
}

// ============================================================
// RESULTS & REVIEW
// ============================================================
function finishQuizAndShowResults() {
  const total = quizQuestions.length;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  const weekScores = {};

  quizQuestions.forEach((q, idx) => {
    if (!weekScores[q.week]) weekScores[q.week] = { correct: 0, total: 0 };
    weekScores[q.week].total++;

    const ans = quizUserAnswers[idx];
    if (ans && ans.submitted) {
      if (ans.isCorrect) {
        correct++;
        weekScores[q.week].correct++;
      } else {
        wrong++;
      }
    } else {
      skipped++;
    }
  });

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  document.getElementById('resCorrectCount').textContent = correct;
  document.getElementById('resWrongCount').textContent = wrong;
  document.getElementById('resSkippedCount').textContent = skipped;
  document.getElementById('resultsPercentage').textContent = `${percentage}%`;

  const heading = document.getElementById('resultsHeading');
  const desc = document.getElementById('resultsDesc');

  if (percentage >= 80) {
    heading.textContent = 'Excellent Work!';
    heading.style.color = '#38bdf8';
  } else if (percentage >= 50) {
    heading.textContent = 'Good Practice!';
    heading.style.color = '#10b981';
  } else {
    heading.textContent = 'Keep Studying!';
    heading.style.color = '#f97316';
  }

  desc.textContent = `You scored ${correct} out of ${total} questions (${percentage}%)`;

  const dial = document.getElementById('resultsDialFill');
  if (dial) {
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percentage / 100) * circumference;
    dial.style.strokeDashoffset = offset;
    dial.style.stroke = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#38bdf8' : '#f97316';
  }

  const breakdownGrid = document.getElementById('resultsBreakdownGrid');
  if (breakdownGrid) {
    breakdownGrid.innerHTML = '';
    Object.keys(weekScores).map(Number).sort((a, b) => a - b).forEach(w => {
      const stat = weekScores[w];
      const pct = Math.round((stat.correct / stat.total) * 100);
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <span class="breakdown-item-week">Week ${w}</span>
        <span class="breakdown-item-score">${stat.correct} / ${stat.total}</span>
        <span style="font-size:0.75rem; color:var(--text-dim);">${pct}% accuracy</span>
      `;
      breakdownGrid.appendChild(item);
    });
  }

  switchView('resultsView');
}

function showResultsView() {
  finishQuizAndShowResults();
}

function reviewQuiz() {
  isQuizReviewMode = true;
  quizCurrentIndex = 0;

  const reviewBar = document.getElementById('reviewStatusBar');
  if (reviewBar) reviewBar.style.display = 'flex';

  switchView('quizView');
  renderCurrentQuizQuestion();
}

function retryQuiz() {
  startConfiguredQuiz();
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  const quizView = document.getElementById('quizView');
  if (!quizView || !quizView.classList.contains('active')) return;

  const key = e.key.toUpperCase();
  const q = quizQuestions[quizCurrentIndex];
  if (!q) return;

  const keyMap = { 'A': 0, '1': 0, 'B': 1, '2': 1, 'C': 2, '3': 2, 'D': 3, '4': 3, 'E': 4, '5': 4 };
  if (keyMap[key] !== undefined && keyMap[key] < q.options.length) {
    const state = quizUserAnswers[quizCurrentIndex];
    if (state && !state.submitted && !isQuizReviewMode) {
      e.preventDefault();
      toggleQuizOption(keyMap[key]);
    }
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const state = quizUserAnswers[quizCurrentIndex];
    if (state && !state.submitted && !isQuizReviewMode &&
      (isNumericInputQuestion(q) ? state.numericAnswer.trim() !== '' : state.selected.length > 0)) {
      submitQuizAnswer();
    } else {
      nextQuizQuestion();
    }
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextQuizQuestion();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevQuizQuestion();
  }
});

// Helpers
function isCorrectOption(q, idx) {
  if (Array.isArray(q.answer)) return q.answer.includes(idx);
  return q.answer === idx;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
