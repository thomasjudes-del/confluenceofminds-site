(() => {
  'use strict';

  function countMatches(flags, tags) {
    return (tags || []).reduce((score, tag) => score + (flags.has(tag) ? 1 : 0), 0);
  }

  function infer(definition, flags, language = 'en') {
    const inference = definition?.sybille?.inference;
    if (!inference?.groups) {
      if (typeof definition?.inferSybilleDecision === 'function') {
        return definition.inferSybilleDecision(flags, language);
      }
      const fallback = definition?.sybille?.options?.[0];
      return definition?.getSybilleDecision?.(fallback, language) || null;
    }

    const scores = Object.fromEntries(
      Object.entries(inference.groups).map(([decisionId, tags]) => [decisionId, countMatches(flags, tags)])
    );
    const highest = Math.max(...Object.values(scores));
    const tieBreak = inference.tieBreak || definition.sybille.options || Object.keys(scores);
    const selectedId = tieBreak.find(decisionId => scores[decisionId] === highest)
      || Object.keys(scores).find(decisionId => scores[decisionId] === highest);

    return definition.getSybilleDecision(selectedId, language);
  }

  window.IOTI_SYBILLE_ENGINE = { infer };
})();
