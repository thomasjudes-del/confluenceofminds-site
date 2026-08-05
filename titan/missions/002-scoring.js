(() => {
  'use strict';
  const M = window.IOTI_M002;
  const effects = [
    ['isolate_bus',0,-12,-5],['hold_sync',-1,-7,4],['route_diagnostics',-2,-10,15],
    ['power_winch',0,-14,-3],['manual_lock',-1,-5,2],['map_tunnel',-3,-7,14],
    ['local_cells',0,-12,8],['shut_lab',0,8,-15],['keep_cryopumps',-1,-13,16],
    ['quench_trunk',0,-5,-12],['split_grid',-1,-9,4],['counterphase',-3,-12,18],
    ['brake_flywheel',0,-8,-5],['dump_heaters',-1,-4,4],['feed_lidar',-2,-11,15],
    ['evacuate_hall',0,-12,-4],['hold_local',-1,-6,5],['preserve_trace',-3,-9,17]
  ];
  M.scoring = {
    id:'incident-002', number:'002',
    role:{id:'chief-engineer',character:'Viktor',weights:{crew:.25,energy:.50,science:.25}},
    initial:{crew:498,energy:162,science:126},
    missionPriorities:{crew:1.05,energy:1.25,science:.95}, sybillePriorities:{crew:1,energy:1.15,science:1.05},
    critical:{crew:484,energy:45},
    scoring:{strategyWeight:.95,speedWeight:.05,crewLossScale:14,energyFloor:45,energyTarget:130,scienceBaseline:126,scienceTarget:180,fastDecisionSeconds:2.5,slowDecisionSeconds:14},
    choiceEffects:Object.fromEntries(effects.map(e => [e[0],{crew:e[1],energy:e[2],science:e[3]}])),
    sybilleEffects:{blackstart:{crew:0,energy:-18,science:-10},island:{crew:-1,energy:-8,science:4},pulse:{crew:-4,energy:-12,science:22}}
  };
})();
