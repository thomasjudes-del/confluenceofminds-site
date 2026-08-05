(() => {
  'use strict';

  window.IOTI_MISSION_REGISTRY = {
    currentMissionId: '002',
    missions: [
      {
        id: '002',
        number: '002',
        title: 'The Violet Line',
        status: 'current',
        date: '2026-08-05',
        config: 'missions/002.js'
      },
      {
        id: '001',
        number: '001',
        title: 'The Black Window',
        status: 'archived',
        date: '2026-08-04',
        config: 'missions/001.js',
        canonicalPath: [1, 1, 2, 0, 1],
        canonicalTags: ['sample_first', 'docking_power', 'transfer_sample', 'cut_loop', 'kill_heat'],
        canonicalSybilleDecision: 'vent',
        canonicalOutcome: { crew: 498, energy: 162, science: 126 }
      }
    ]
  };
})();
