(() => {
  'use strict';

  const registry = window.IOTI_MISSION_REGISTRY;
  if (!registry?.currentMissionId || !Array.isArray(registry.missions)) {
    throw new Error('IOTI mission registry is unavailable.');
  }

  const normalizeId = value => {
    const match = String(value || '').trim().match(/^(?:incident-)?(\d{1,3})$/i);
    return match ? match[1].padStart(3, '0') : null;
  };

  const currentEntry = registry.missions.find(item => item.id === registry.currentMissionId);
  if (!currentEntry) throw new Error('IOTI current mission is not registered.');

  const url = new URL(location.href);
  const requestedRaw = url.searchParams.get('incident');
  const requestedId = normalizeId(requestedRaw);
  const requestedEntry = requestedId
    ? registry.missions.find(item => item.id === requestedId)
    : null;
  const selectedEntry = requestedEntry || currentEntry;

  if (requestedRaw && !requestedEntry) {
    url.searchParams.delete('incident');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  window.IOTI_MISSION_CONTEXT = {
    currentMissionId: registry.currentMissionId,
    selectedMissionId: selectedEntry.id,
    isArchived: selectedEntry.status === 'archived' || selectedEntry.id !== registry.currentMissionId,
    requestedMissionId: requestedId,
    selectedEntry,
    registry
  };

  const configs = Array.isArray(selectedEntry.config) ? selectedEntry.config : [selectedEntry.config];
  configs.forEach(config => {
    const separator = config.includes('?') ? '&' : '?';
    document.write(`<script src="${config}${separator}v=56"><\/script>`);
  });
})();
