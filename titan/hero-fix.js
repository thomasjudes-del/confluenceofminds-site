(() => {
  'use strict';

  const hero = document.querySelector('#heroImage');
  const app = document.querySelector('#app');
  const definition = window.IOTI_MISSION_DEFINITION;
  if (!hero || !app) return;

  const heroConfig = definition?.hero || {};
  let missionHeroUrl = heroConfig.src || null;
  let generatedObjectUrl = null;

  function applyHero() {
    if (!missionHeroUrl) return;
    hero.onload = () => hero.classList.add('loaded');
    hero.onerror = error => console.error('Mission hero failed to load', error);
    hero.src = missionHeroUrl;
    hero.alt = heroConfig.alt || 'A human base beneath Saturn on Titan';
  }

  async function loadBase64Parts(parts, type = 'image/webp') {
    const urls = parts.map(path => new URL(`${path}?v=56`, document.baseURI));
    const responses = await Promise.all(urls.map(url => fetch(url, { cache: 'no-store' })));
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`Hero chunk ${index} returned ${response.status}`);
    });

    const base64 = (await Promise.all(responses.map(response => response.text())))
      .join('')
      .replace(/\s+/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

    generatedObjectUrl = URL.createObjectURL(new Blob([bytes], { type }));
    missionHeroUrl = generatedObjectUrl;
    applyHero();
  }

  async function loadLegacyStoryboardHero() {
    await loadBase64Parts(
      [0, 1, 2, 3].map(index => `assets/start-${index}.txt`),
      'image/webp'
    );
  }

  window.IOTI_SET_MISSION_HERO = applyHero;

  if (missionHeroUrl) {
    applyHero();
  } else if (Array.isArray(heroConfig.parts) && heroConfig.parts.length) {
    loadBase64Parts(heroConfig.parts, heroConfig.type || 'image/webp')
      .catch(error => console.error('Could not load the mission hero', error));
  } else {
    loadLegacyStoryboardHero()
      .catch(error => console.error('Could not load the Titan storyboard hero', error));
  }

  addEventListener('beforeunload', () => {
    if (generatedObjectUrl) URL.revokeObjectURL(generatedObjectUrl);
  }, { once: true });
})();
