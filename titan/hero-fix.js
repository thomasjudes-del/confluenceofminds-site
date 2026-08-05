(() => {
  'use strict';

  const hero = document.querySelector('#heroImage');
  const app = document.querySelector('#app');
  const definition = window.IOTI_MISSION_DEFINITION;
  if (!hero || !app) return;

  let missionHeroUrl = definition?.hero?.src || null;

  function applyHero() {
    if (!missionHeroUrl) return;
    hero.onload = () => hero.classList.add('loaded');
    hero.onerror = error => console.error('Mission hero failed to load', error);
    hero.src = missionHeroUrl;
    hero.alt = definition?.hero?.alt || 'A human base beneath Saturn on Titan';
  }

  async function loadLegacyStoryboardHero() {
    try {
      const urls = [0, 1, 2, 3].map(index => new URL(`assets/start-${index}.txt?v=55`, document.baseURI));
      const responses = await Promise.all(urls.map(url => fetch(url, { cache: 'no-store' })));
      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(`Hero chunk ${index} returned ${response.status}`);
      });

      const parts = await Promise.all(responses.map(response => response.text()));
      const base64 = parts.join('').replace(/\s+/g, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

      missionHeroUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      applyHero();
      addEventListener('beforeunload', () => URL.revokeObjectURL(missionHeroUrl), { once: true });
    } catch (error) {
      console.error('Could not load the Titan storyboard hero', error);
    }
  }

  window.IOTI_SET_MISSION_HERO = applyHero;
  if (missionHeroUrl) applyHero();
  else loadLegacyStoryboardHero();
})();
