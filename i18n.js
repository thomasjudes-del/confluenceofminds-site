(() => {
  const COPY = {
    en: {
      meta: 'Confluence of Minds — stories, games, audio fiction and impossible worlds.',
      navLabel: 'Main navigation',
      navWorlds: 'Worlds',
      navAbout: 'About',
      brandLabel: 'Confluence of Minds — home',
      instagramLabel: 'Confluence of Minds on Instagram',
      switcherLabel: 'Choose language',
      switchToFr: 'Switch to French',
      switchToEn: 'Switch to English',
      heroKicker: 'Stories · games · experiments · impossible worlds',
      heroTitle: 'Too many ideas<br />for one world.',
      heroLede: 'A growing creative universe of speculative stories, interactive experiences, audio fiction and visual worlds.',
      heroCta: 'Explore the worlds',
      scroll: 'Scroll to enter',
      paper1Title: 'STORIES',
      paper1Text: 'Fragments become worlds.',
      paper2Title: 'MEMORY',
      paper2Text: 'Every door changes the map.',
      paper3Title: 'WORLDS',
      paper3Text: 'Enter anywhere.',
      worldsLabel: 'Choose an entrance',
      worldsTitle: 'Worlds',
      cards: {
        titan: ['Incident on Titan', 'A science-fiction game.', 'Enter Titan'],
        anjin: ['Anjin of the Shogun', 'The culture behind <em>Shōgun</em>.', 'Explore the culture'],
        kashgar: ['Chronicles of Kashgar', 'A high-fantasy initiation in Kashgar.', 'Enter CDK'],
        dragons: ['Shattered Dragons', 'Dragons born from ancient human experiments.', 'Wake the dragons'],
        katephomi: ['À la recherche de Katephomi Kitembe', 'A climate adventure inside an unstable game-world.', 'Enter KK'],
        victims: ['Authentiques Victimes', 'A psychological thriller about authorship and algorithms.', 'Enter AV'],
        aitalent: ['AI’s Got Talent', 'The online talent show for AI creations.', 'Enter Talent'],
        wecan: ['We Can / But We Can’t', 'Human power. Collective paralysis.', 'Face the contradictions'],
        silmea: ['Créations SILMEA', 'Immersive films made entirely from sound.', 'Enter Silmea'],
        books: ['Guess the Book', 'Find the books hidden inside the image.', 'See the challenges']
      },
      aboutLabel: 'Different doors. One universe.',
      aboutTitle: 'Come for one world.<br />Get lost in a universe.',
      aboutText: 'Confluence of Minds brings together stories, games, visual series and sound worlds that were never meant to look alike. Each one opens its own door; together, they form a territory still expanding.',
      footer: 'Stories · games · sound · experiments',
      portalStatus: 'PORTAL STATUS',
      portalMessage: 'This world will be connected next.'
    },
    fr: {
      meta: 'Confluence of Minds — récits, jeux, fictions sonores et mondes impossibles.',
      navLabel: 'Navigation principale',
      navWorlds: 'Univers',
      navAbout: 'À propos',
      brandLabel: 'Confluence of Minds — accueil',
      instagramLabel: 'Confluence of Minds sur Instagram',
      switcherLabel: 'Choisir la langue',
      switchToFr: 'Passer en français',
      switchToEn: 'Passer en anglais',
      heroKicker: 'Récits · jeux · expériences · mondes impossibles',
      heroTitle: 'Trop d’idées<br />pour un seul monde.',
      heroLede: 'Un univers créatif en expansion, fait de récits spéculatifs, d’expériences interactives, de fictions sonores et de mondes visuels.',
      heroCta: 'Explorer les univers',
      scroll: 'Descendre pour entrer',
      paper1Title: 'RÉCITS',
      paper1Text: 'Les fragments deviennent des mondes.',
      paper2Title: 'MÉMOIRE',
      paper2Text: 'Chaque porte redessine la carte.',
      paper3Title: 'UNIVERS',
      paper3Text: 'Entrez où vous voulez.',
      worldsLabel: 'Choisissez une porte',
      worldsTitle: 'Univers',
      cards: {
        titan: ['Incident sur Titan', 'Un jeu de science-fiction.', 'Entrer sur Titan'],
        anjin: ['Anjin du Shōgun', 'Les cultures et les codes derrière <em>Shōgun</em>.', 'Explorer la culture'],
        kashgar: ['Chroniques de Kashgar', 'Une initiation de fantasy au cœur de Kashgar.', 'Enter CDK'],
        dragons: ['Shattered Dragons', 'Des dragons nés d’antiques expériences humaines.', 'Réveiller les dragons'],
        katephomi: ['À la recherche de Katephomi Kitembe', 'Une aventure climatique dans un monde-jeu instable.', 'Enter KK'],
        victims: ['Authentiques Victimes', 'Un thriller psychologique sur l’auteur et les algorithmes.', 'Enter AV'],
        aitalent: ['AI’s Got Talent', 'Le concours en ligne des créations par intelligence artificielle.', 'Enter Talent'],
        wecan: ['We Can / But We Can’t', 'Puissance humaine. Paralysie collective.', 'Affronter nos contradictions'],
        silmea: ['Créations SILMEA', 'Des films immersifs entièrement conçus par le son.', 'Enter Silmea'],
        books: ['Devinez le livre', 'Retrouvez les livres cachés dans l’image.', 'Voir les défis']
      },
      aboutLabel: 'Des portes différentes. Un même univers.',
      aboutTitle: 'Venez pour un monde.<br />Perdez-vous dans un univers.',
      aboutText: 'Confluence of Minds rassemble des récits, des jeux, des séries visuelles et des mondes sonores qui n’étaient pas faits pour se ressembler. Chacun ouvre sa propre porte ; ensemble, ils dessinent un territoire en expansion.',
      footer: 'Récits · jeux · son · expériences',
      portalStatus: 'ÉTAT DU PORTAIL',
      portalMessage: 'Cet univers sera bientôt relié.'
    }
  };

  const cardSelectors = {
    titan: '.world-card--titan',
    anjin: '.world-card--anjin',
    kashgar: '.world-card--kashgar',
    dragons: '.world-card--dragons',
    katephomi: '.world-card--katephomi',
    victims: '.world-card--victims',
    aitalent: '.world-card--aitalent',
    wecan: '.world-card--wecan',
    silmea: '.world-card--silmea',
    books: '.world-card--books'
  };

  const one = (selector) => document.querySelector(selector);
  const setText = (selector, value) => {
    const element = one(selector);
    if (element) element.textContent = value;
  };
  const setHtml = (selector, value) => {
    const element = one(selector);
    if (element) element.innerHTML = value;
  };
  const setLabel = (selector, value) => {
    const element = one(selector);
    if (element) element.setAttribute('aria-label', value);
  };

  function createSwitcher() {
    const nav = one('.site-nav');
    if (!nav || one('[data-language-switcher]')) return;

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.dataset.languageSwitcher = '';
    switcher.innerHTML = `
      <button type="button" data-language="fr">FR</button>
      <span aria-hidden="true"></span>
      <button type="button" data-language="en">EN</button>
    `;

    const instagram = nav.querySelector('.instagram-link');
    nav.insertBefore(switcher, instagram || null);

    switcher.querySelectorAll('[data-language]').forEach((button) => {
      button.addEventListener('click', () => applyLanguage(button.dataset.language, true));
    });
  }

  function setCardCopy(key, copy) {
    const card = one(cardSelectors[key]);
    if (!card) return;

    const title = card.querySelector('h3');
    const description = card.querySelector('.world-card__body > p');
    const action = card.querySelector('.world-card__cta, button[data-project-link]');

    if (title) title.textContent = copy[0];
    if (description) description.innerHTML = copy[1];
    if (action) action.innerHTML = `${copy[2]} <span aria-hidden="true">↗</span>`;
  }

  function updateSwitcher(language, copy) {
    const switcher = one('[data-language-switcher]');
    if (!switcher) return;

    switcher.setAttribute('aria-label', copy.switcherLabel);
    switcher.querySelectorAll('[data-language]').forEach((button) => {
      const active = button.dataset.language === language;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', button.dataset.language === 'fr' ? copy.switchToFr : copy.switchToEn);
    });
  }

  function applyLanguage(language, persist = false) {
    const lang = language === 'fr' ? 'fr' : 'en';
    const copy = COPY[lang];

    document.documentElement.lang = lang;
    document.title = 'Confluence of Minds';
    const metaDescription = one('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', copy.meta);

    setLabel('.site-header .brand', copy.brandLabel);
    setLabel('.site-nav', copy.navLabel);
    setLabel('.site-header .instagram-link', copy.instagramLabel);
    setLabel('.site-footer .instagram-link', copy.instagramLabel);
    setText('.site-nav > a[href="#worlds"]', copy.navWorlds);
    setText('.site-nav > a[href="#about"]', copy.navAbout);

    setText('.hero-kicker', copy.heroKicker);
    setHtml('#hero-title', copy.heroTitle);
    setText('.hero-lede', copy.heroLede);
    setHtml('.primary-button', `${copy.heroCta} <span aria-hidden="true">↓</span>`);
    setText('.scroll-cue span', copy.scroll);

    setText('.hero-paper--one b', copy.paper1Title);
    setText('.hero-paper--one span', copy.paper1Text);
    setText('.hero-paper--two b', copy.paper2Title);
    setText('.hero-paper--two span', copy.paper2Text);
    setText('.hero-paper--three b', copy.paper3Title);
    setText('.hero-paper--three span', copy.paper3Text);

    setText('.worlds-heading .section-label', copy.worldsLabel);
    setText('#worlds-title', copy.worldsTitle);
    Object.entries(copy.cards).forEach(([key, cardCopy]) => setCardCopy(key, cardCopy));

    setText('.about-copy .section-label', copy.aboutLabel);
    setHtml('#about-title', copy.aboutTitle);
    setText('.about-copy > p:last-child', copy.aboutText);
    setText('.site-footer > span:nth-child(2)', copy.footer);
    setText('.portal-toast > span', copy.portalStatus);
    setText('[data-toast-message]', copy.portalMessage);

    updateSwitcher(lang, copy);

    if (persist) {
      try { localStorage.setItem('confluence-language', lang); } catch (_) {}
    }

    window.dispatchEvent(new CustomEvent('confluence:languagechange', { detail: { language: lang } }));
  }

  function initialLanguage() {
    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (queryLanguage === 'fr' || queryLanguage === 'en') return queryLanguage;

    try {
      const stored = localStorage.getItem('confluence-language');
      if (stored === 'fr' || stored === 'en') return stored;
    } catch (_) {}

    return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  createSwitcher();
  applyLanguage(initialLanguage());
})();
