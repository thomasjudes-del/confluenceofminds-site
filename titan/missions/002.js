(() => {
  'use strict';

  const locales = {
    en: {
      title: 'The Violet Line',
      role: 'Chief Engineer',
      incidentLabel: 'Current incident',
      incoming: 'HESTIA / INCOMING',
      live: 'HESTIA / LIVE',
      critical: 'HESTIA / CRITICAL',
      homeTransmission: 'ONE ENGINEER.\nONE FAILING GRID.\nSIX DECISIONS.\nSYBILLE AI WILL COMPLETE THE PATTERN.',
      approxTime: '≈ 5 minutes',
      briefTransmission: 'SATURN MAGNETOTAIL COMPRESSION IN PROGRESS.\nHESTIA GRID PHASE DRIFT: 11.8 DEGREES.\nFOUR TECHNICIANS ARE INSIDE TUNNEL D-9.\nNYSA CRYO-ARCHIVE HAS 24 MINUTES OF COOLING.',
      takeoverPreamble: 'INDUCED CURRENT FRONT AT THE MAIN BUS.\nHESTIA RESERVE: 17%.\nGRID DECISION WINDOW OPEN.',
      takeoverCommand: 'COMMAND MODEL COMPLETE.\nENGINEERING AUTHORITY TRANSFERRED TO SYBILLE AI.',
      blackstart: 'Black-start Hestia',
      island: 'Island the four bases',
      pulse: 'Fire the counterphase pulse',
      blackstartLine: 'SYBILLE AI BLACK-STARTS HESTIA.',
      islandLine: 'SYBILLE AI ISLANDS THE FOUR BASES.',
      pulseLine: 'SYBILLE AI FIRES THE COUNTERPHASE PULSE.',
      scenes: [
        { title: 'Phase drift', choices: ['Isolate Hestia bus', 'Hold grid synchronised', 'Route diagnostics to Acheron'] },
        { title: 'Tunnel D-9', choices: ['Power the rescue winch', 'Cycle the lock manually', 'Map the current through D-9'] },
        { title: 'Nysa warming', choices: ['Move the archive to cells', 'Shut down the lab wing', 'Keep the cryopumps online'] },
        { title: 'Grid echo', choices: ['Quench the north trunk', 'Split the bases into islands', 'Inject a counterphase test'] },
        { title: 'Flywheel overspeed', choices: ['Brake the flywheel', 'Dump power into heaters', 'Feed Acheron lidar'] },
        { title: 'The violet line', choices: ['Evacuate the turbine hall', 'Hold Hestia local grid', 'Preserve the phase trace'] }
      ]
    },
    fr: {
      title: 'La Ligne violette',
      role: 'Ingénieur en chef',
      incidentLabel: 'Incident actuel',
      incoming: 'HESTIA / TRANSMISSION',
      live: 'HESTIA / DIRECT',
      critical: 'HESTIA / CRITIQUE',
      homeTransmission: 'UN INGÉNIEUR.\nUN RÉSEAU EN DÉFAILLANCE.\nSIX DÉCISIONS.\nSYBILLE AI ACHÈVERA LE MODÈLE.',
      approxTime: '≈ 5 minutes',
      briefTransmission: 'COMPRESSION DE LA MAGNÉTOQUEUE DE SATURNE EN COURS.\nDÉPHASAGE DU RÉSEAU HESTIA : 11,8 DEGRÉS.\nQUATRE TECHNICIENS SONT DANS LE TUNNEL D-9.\nL’ARCHIVE CRYOGÉNIQUE DE NYSA A 24 MINUTES DE REFROIDISSEMENT.',
      takeoverPreamble: 'FRONT DE COURANT INDUIT AU JEU DE BARRES PRINCIPAL.\nRÉSERVE HESTIA : 17 %.\nFENÊTRE DE DÉCISION DU RÉSEAU OUVERTE.',
      takeoverCommand: 'MODÈLE DE COMMANDE COMPLET.\nAUTORITÉ D’INGÉNIERIE TRANSFÉRÉE À SYBILLE AI.',
      blackstart: 'Redémarrer Hestia à froid',
      island: 'Îloter les quatre bases',
      pulse: 'Déclencher l’impulsion en opposition de phase',
      blackstartLine: 'SYBILLE AI REDÉMARRE HESTIA À FROID.',
      islandLine: 'SYBILLE AI ÎLOTE LES QUATRE BASES.',
      pulseLine: 'SYBILLE AI DÉCLENCHE L’IMPULSION EN OPPOSITION DE PHASE.',
      scenes: [
        { title: 'Dérive de phase', choices: ['Isoler le bus Hestia', 'Maintenir le réseau synchronisé', 'Router le diagnostic vers Acheron'] },
        { title: 'Tunnel D-9', choices: ['Alimenter le treuil de secours', 'Manœuvrer le sas à la main', 'Cartographier le courant via D-9'] },
        { title: 'Nysa se réchauffe', choices: ['Basculer l’archive sur batteries', 'Couper l’aile du laboratoire', 'Maintenir les cryopompes'] },
        { title: 'Écho du réseau', choices: ['Éteindre le tronçon nord', 'Îloter les bases', 'Tester une opposition de phase'] },
        { title: 'Survitesse du volant', choices: ['Freiner le volant', 'Dissiper dans les chauffages', 'Alimenter le lidar d’Acheron'] },
        { title: 'La ligne violette', choices: ['Évacuer la salle des turbines', 'Maintenir le réseau local', 'Préserver la trace de phase'] }
      ]
    }
  };

  const sceneBlueprints = [
    {
      image: 'assets/mission-002/scene-grid.svg',
      choices: [
        { icon: '⬡', effects: { health: 2, energy: -12, science: -5 }, tag: 'isolate_bus' },
        { icon: '⌁', effects: { health: -1, energy: -7, science: 4 }, tag: 'hold_sync' },
        { icon: '△', effects: { health: -2, energy: -10, science: 15 }, tag: 'route_diagnostics' }
      ]
    },
    {
      image: 'assets/mission-002/scene-tunnel.svg',
      choices: [
        { icon: '●', effects: { health: 4, energy: -14, science: -3 }, tag: 'power_winch' },
        { icon: '◇', effects: { health: -1, energy: -5, science: 2 }, tag: 'manual_lock' },
        { icon: '△', effects: { health: -3, energy: -7, science: 14 }, tag: 'map_tunnel' }
      ]
    },
    {
      image: 'assets/mission-002/scene-archive.svg',
      choices: [
        { icon: '▣', effects: { health: 1, energy: -12, science: 8 }, tag: 'local_cells' },
        { icon: '⬡', effects: { health: 0, energy: 8, science: -15 }, tag: 'shut_lab' },
        { icon: '⚗', effects: { health: -1, energy: -13, science: 16 }, tag: 'keep_cryopumps' }
      ]
    },
    {
      image: 'assets/mission-002/scene-trunk.svg',
      choices: [
        { icon: '⬡', effects: { health: 1, energy: -5, science: -12 }, tag: 'quench_trunk' },
        { icon: '⌁', effects: { health: -1, energy: -9, science: 4 }, tag: 'split_grid' },
        { icon: '△', effects: { health: -3, energy: -12, science: 18 }, tag: 'counterphase' }
      ]
    },
    {
      image: 'assets/mission-002/scene-flywheel.svg',
      choices: [
        { icon: '◉', effects: { health: 2, energy: -8, science: -5 }, tag: 'brake_flywheel' },
        { icon: '≋', effects: { health: -1, energy: -4, science: 4 }, tag: 'dump_heaters' },
        { icon: '△', effects: { health: -2, energy: -11, science: 15 }, tag: 'feed_lidar' }
      ]
    },
    {
      image: 'assets/mission-002/scene-bus.svg',
      choices: [
        { icon: '●', effects: { health: 3, energy: -12, science: -4 }, tag: 'evacuate_hall' },
        { icon: '⌁', effects: { health: -1, energy: -6, science: 5 }, tag: 'hold_local' },
        { icon: '△', effects: { health: -3, energy: -9, science: 17 }, tag: 'preserve_trace' }
      ]
    }
  ];

  const scenes = sceneBlueprints.map((scene, sceneIndex) => ({
    image: scene.image,
    title: locales.en.scenes[sceneIndex].title,
    choices: scene.choices.map((choice, choiceIndex) => ({
      ...choice,
      label: locales.en.scenes[sceneIndex].choices[choiceIndex]
    }))
  }));

  const decisionEffects = {
    blackstart: { health: 4, energy: -18, science: -10 },
    island: { health: -1, energy: -8, science: 4 },
    pulse: { health: -4, energy: -12, science: 22 }
  };

  function getSybilleDecision(id, language = 'en') {
    const copy = locales[language] || locales.en;
    return {
      id,
      label: copy[id],
      effects: { ...decisionEffects[id] },
      line: copy[`${id}Line`]
    };
  }

  function getSceneTransmission(language, index, flags) {
    const fr = language === 'fr';

    if (index === 0) {
      return fr
        ? 'HESTIA / BUS PRINCIPAL.\nDÉPHASAGE : 11,8 DEGRÉS ET EN HAUSSE.\nCOURANT INDUIT DÉTECTÉ DANS DEUX TRONÇONS.\nAUCUN DISJONCTEUR NE RESTE OUVERT.'
        : 'HESTIA / MAIN BUS.\nPHASE DRIFT: 11.8 DEGREES AND RISING.\nINDUCED CURRENT DETECTED IN TWO TRUNKS.\nNO BREAKER WILL STAY OPEN.';
     