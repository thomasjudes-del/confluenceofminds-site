(() => {
  'use strict';
  const M = window.IOTI_M002;
  const rows = [
    ['scene-grid.svg', ['⬡',2,-12,-5,'isolate_bus'], ['⌁',-1,-7,4,'hold_sync'], ['△',-2,-10,15,'route_diagnostics']],
    ['scene-tunnel.svg', ['●',4,-14,-3,'power_winch'], ['◇',-1,-5,2,'manual_lock'], ['△',-3,-7,14,'map_tunnel']],
    ['scene-archive.svg', ['▣',1,-12,8,'local_cells'], ['⬡',0,8,-15,'shut_lab'], ['⚗',-1,-13,16,'keep_cryopumps']],
    ['scene-trunk.svg', ['⬡',1,-5,-12,'quench_trunk'], ['⌁',-1,-9,4,'split_grid'], ['△',-3,-12,18,'counterphase']],
    ['scene-flywheel.svg', ['◉',2,-8,-5,'brake_flywheel'], ['≋',-1,-4,4,'dump_heaters'], ['△',-2,-11,15,'feed_lidar']],
    ['scene-bus.svg', ['●',3,-12,-4,'evacuate_hall'], ['⌁',-1,-6,5,'hold_local'], ['△',-3,-9,17,'preserve_trace']]
  ];
  M.scenes = rows.map((row, i) => ({
    image: `assets/mission-002/${row[0]}`,
    title: M.en.scenes[i][0],
    choices: row.slice(1).map((c, j) => ({ icon:c[0], effects:{health:c[1],energy:c[2],science:c[3]}, tag:c[4], label:M.en.scenes[i][j+1] }))
  }));
  M.decisionEffects = {
    blackstart:{health:4,energy:-18,science:-10}, island:{health:-1,energy:-8,science:4}, pulse:{health:-4,energy:-12,science:22}
  };
})();
