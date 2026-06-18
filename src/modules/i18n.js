// ============================================================
// PENLIVE - Multi-language (i18n) Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Supports English (default) and Hindi. Easy to extend to more languages.
// Persists choice to localStorage.
// ============================================================

export class I18n {
  constructor(app) {
    this.app = app;
    this.lang = 'en';
    this.translations = {
      en: {
        // Title bar
        'New': 'New', 'Clear': 'Clear', 'Record': 'Record',
        'Overlay': 'Overlay', 'Snip': 'Snip', 'PDF': 'PDF',
        'Cursor': 'Cursor', 'Laser': 'Laser', 'Template': 'Template',
        // Recording
        'Start Recording': 'Start Recording',
        'Stop & Save': 'Stop & Save',
        'Video Quality': 'Video Quality',
        'Output Format': 'Output Format',
        'Recent Recordings': 'Recent Recordings',
        'No recordings yet': 'No recordings yet',
        // Tools
        'Pen': 'Pen', 'Highlighter': 'Highlighter', 'Eraser': 'Eraser',
        'Text': 'Text', 'Sticky Note': 'Sticky Note',
        'Size': 'Size', 'Opacity': 'Opacity',
        // Settings
        'Settings': 'Settings', 'Theme': 'Theme', 'Auto-save': 'Auto-save',
        'Performance': 'Performance', 'Hotkeys': 'Hotkeys',
        'System Info': 'System Info',
        // Messages
        'PENLIVE ready — © Er. Raju Kumawat': 'PENLIVE ready — © Er. Raju Kumawat',
        'Recording started': 'Recording started',
        'Canvas cleared': 'Canvas cleared',
      },
      hi: {
        'New': 'नया', 'Clear': 'साफ़ करें', 'Record': 'रिकॉर्ड',
        'Overlay': 'ओवरले', 'Snip': 'स्निप', 'PDF': 'PDF',
        'Cursor': 'कर्सर', 'Laser': 'लेज़र', 'Template': 'टेम्पलेट',
        'Start Recording': 'रिकॉर्डिंग शुरू करें',
        'Stop & Save': 'रोकें और सेव करें',
        'Video Quality': 'वीडियो गुणवत्ता',
        'Output Format': 'आउटपुट फॉर्मेट',
        'Recent Recordings': 'हाल की रिकॉर्डिंग',
        'No recordings yet': 'अभी तक कोई रिकॉर्डिंग नहीं',
        'Pen': 'पेन', 'Highlighter': 'हाइलाइटर', 'Eraser': 'इरेज़र',
        'Text': 'टेक्स्ट', 'Sticky Note': 'स्टिकी नोट',
        'Size': 'आकार', 'Opacity': 'अपारदर्शिता',
        'Settings': 'सेटिंग्स', 'Theme': 'थीम', 'Auto-save': 'ऑटो-सेव',
        'Performance': 'प्रदर्शन', 'Hotkeys': 'हॉटकी',
        'System Info': 'सिस्टम जानकारी',
        'PENLIVE ready — © Er. Raju Kumawat': 'PENLIVE तैयार है — © Er. Raju Kumawat',
        'Recording started': 'रिकॉर्डिंग शुरू हुई',
        'Canvas cleared': 'कैनवास साफ़ कर दिया गया',
      }
    };
  }

  async init() {
    const saved = localStorage.getItem('penlive-lang');
    if (saved && this.translations[saved]) this.lang = saved;
    this.apply();
    this.bindUI();
  }

  t(key) {
    return this.translations[this.lang]?.[key] || key;
  }

  setLang(lang) {
    if (!this.translations[lang]) return;
    this.lang = lang;
    localStorage.setItem('penlive-lang', lang);
    this.apply();
    this.app.toast.show(`Language: ${lang === 'hi' ? 'हिंदी' : 'English'}`, 'success');
  }

  apply() {
    // Update lang label
    const label = document.getElementById('lang-label');
    if (label) label.textContent = this.lang.toUpperCase();

    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      el.placeholder = this.t(key);
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      el.title = this.t(key);
    });
  }

  bindUI() {
    document.getElementById('btn-language')?.addEventListener('click', () => {
      this.setLang(this.lang === 'en' ? 'hi' : 'en');
    });
  }
}
