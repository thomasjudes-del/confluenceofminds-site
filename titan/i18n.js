(() => {
  'use strict';

  const LANGUAGE_KEY = 'ioti:language';
  const queryLanguage = new URLSearchParams(location.search).get('lang');
  let language = queryLanguage === 'fr' || queryLanguage === 'en'
    ? queryLanguage
    : localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en');

  const text = {
    en: {
      weeklyIncident: 'Current incident',
      currentIncident: 'Current incident',
      incidentComplete: 'Incident complete',
      missionBrief: 'Mission brief',
      scoreStage: 'Score',
      sybilleControl: 'Sybille AI control',
      startMission: 'Start mission',
      yourRole: 'Your role',
      openIncident: 'Open incident',
      incoming: 'TITAN / INCOMING',
      live: 'TITAN / LIVE',
      critical: 'TITAN / CRITICAL',
      command: 'Command?',
      scene: 'Scene',
      of: 'of',
      decisionWindow: 'Decision window',
      revealScore: 'Reveal score',
      sameCall: 'Would you have made the same call?',
      scoreAttributed: 'Score attributed by Sybille AI',
      scoreAttributedCaps: 'SCORE ATTRIBUTED BY SYBILLE AI',
      outOf1000: 'out of 1000',
      simulationId: 'Simulation ID',
      health: 'Health',
      energy: 'Energy',
      science: 'Science',
      missionTime: 'Mission time',
      missionComplete: 'Mission complete',
      shareResult: 'Share result',
      playAgain: 'Play again',
      preparingImage: 'Preparing image…',
      decisionPath: 'Decision path',
      playSameIncident: 'Play the same incident',
      imageDownloadedCopied: 'Result image downloaded. Game link copied.',
      imageDownloaded: 'Result image downloaded.',
      imageError: 'The result image could not be generated.',
      languageLabel: 'Language'
    },
    fr: {
      weeklyIncident: 'Incident actuel',
      currentIncident: 'Incident actuel',
      incidentComplete: 'Incident terminé',
      missionBrief: 'Briefing de mission',
      scoreStage: 'Score',
      sybilleControl: 'Contrôle de Sybille AI',
      startMission: 'Commencer la mission',
      yourRole: 'Votre rôle',
      openIncident: 'Ouvrir l’incident',
      incoming: 'TITAN / TRANSMISSION',
      live: 'TITAN / DIRECT',
      critical: 'TITAN / CRITIQUE',
      command: 'Décision ?',
      scene: 'Scène',
      of: 'sur',
      decisionWindow: 'Fenêtre de décision',
      revealScore: 'Révéler le score',
      sameCall: 'Auriez-vous pris la même décision ?',
      scoreAttributed: 'Score attribué par Sybille AI',
      scoreAttributedCaps: 'SCORE ATTRIBUÉ PAR SYBILLE AI',
      outOf1000: 'sur 1000',
      simulationId: 'Identifiant de simulation',
      health: 'Santé',
      energy: 'Énergie',
      science: 'Science',
      missionTime: 'Durée de mission',
      missionComplete: 'Mission terminée',
      shareResult: 'Partager le résultat',
      playAgain: 'Rejouer',
      preparingImage: 'Création de l’image…',
      decisionPath: 'Trajectoire des décisions',
      playSameIncident: 'Jouer au même incident',
      imageDownloadedCopied: 'Image du résultat téléchargée. Lien du jeu copié.',
      imageDownloaded: 'Image du résultat téléchargée.',
      imageError: 'Impossible de générer l’image du résultat.',
      languageLabel: 'Langue'
    }
  };

  function t(key) {
    return text[language]?.[key] ?? text.en[key] ?? key;
  }

  function updateLanguageButtons() {
    document.documentElement.lang = language === 'fr' ? 'fr' : 'en-US';
    document.querySelectorAll('[data-lang]').forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const switcher = document.querySelector('.lang-switch');
    if (switcher) switcher.setAttribute('aria-label', t('languageLabel'));
  }

  function rerenderStage() {
    window.IOTI_APPLY_MISSION_LOCALE?.();
    const stage = app.dataset.stage;
    if (stage === 'brief') return window.briefing();
    if (stage === 'scene') return window.renderScene();
    if (stage === 'sybille') return window.renderSybilleTakeover();
    if (stage === 'score' && window.result) return window.renderScore(window.result);
    return window.home();
  }

  function setLanguage(nextLanguage, rerender = true) {
    if (nextLanguage !== 'en' && nextLanguage !== 'fr') return;
    language = nextLanguage;
    localStorage.setItem(LANGUAGE_KEY, language);
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    updateLanguageButtons();
    if (rerender) rerenderStage();
  }

  window.IOTI_I18N = {
    t,
    setLanguage,
    get language() { return language; }
  };

  updateLanguageButtons();
  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.lang));
  });
})();
