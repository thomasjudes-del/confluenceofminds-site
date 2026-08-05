(() => {
  'use strict';
  const M = window.IOTI_M002;
  if (!M?.en || !M?.fr || !M?.scenes || !M?.scoring || !M?.getSceneTransmission) throw new Error('Mission 002 modules are incomplete.');
  const locales = { en: M.en, fr: M.fr };
  locales.en.scenes = locales.en.scenes.map(s => ({title:s[0],choices:s.slice(1)}));
  locales.fr.scenes = locales.fr.scenes.map(s => ({title:s[0],choices:s.slice(1)}));
  const getSybilleDecision = (id, language='en') => ({id,label:locales[language][id],effects:{...M.decisionEffects[id]},line:locales[language][`${id}Line`]});
  window.IOTI_MISSION_DEFINITION = {
    id:'002',
    game:{id:'incident-002',number:'002',title:locales.en.title,role:locales.en.role,character:{name:'Viktor',avatar:'assets/crew-canon/viktor.webp'},initial:{health:84,energy:64,science:22},scenes:M.scenes},
    scoring:M.scoring, locales,
    hero:{
      parts:[
        'assets/mission-002/hero-violet-line-cinematic-0.txt',
        'assets/mission-002/hero-violet-line-cinematic-1.txt',
        'assets/mission-002/hero-violet-line-cinematic-2.txt',
        'assets/mission-002/hero-violet-line-cinematic-3.txt',
        'assets/mission-002/hero-violet-line-cinematic-4.txt',
        'assets/mission-002/hero-violet-line-cinematic-5.txt',
        'assets/mission-002/hero-violet-line-cinematic-6.txt'
      ],
      type:'image/webp',
      alt:'Hestia power station beneath Saturn as a violet electrical front crosses Titan'
    },
    theme:{id:'violet-grid',accent:'#8f7cff',accent2:'#d2ccff',ambientRgb:'108, 82, 210',blue:'#72c8ff',cardBackground:'#080611',cardAccent:'#9b89ff',cardAccent2:'#75d5ff'},
    sybille:{options:['blackstart','island','pulse'],image:'assets/mission-002/scene-bus.svg',inference:{groups:{blackstart:['isolate_bus','power_winch','shut_lab','quench_trunk','brake_flywheel','evacuate_hall'],island:['hold_sync','manual_lock','local_cells','split_grid','dump_heaters','hold_local'],pulse:['route_diagnostics','map_tunnel','keep_cryopumps','counterphase','feed_lidar','preserve_trace']},tieBreak:['island','blackstart','pulse']}},
    getSybilleDecision, getSceneTransmission:M.getSceneTransmission
  };
})();
