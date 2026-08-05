(() => {
  'use strict';

  const definition = window.IOTI_MISSION_DEFINITION;
  const context = window.IOTI_MISSION_CONTEXT;
  const tr = (key, fallback) => window.IOTI_I18N?.t(key) || fallback;
  const isFrench = () => window.IOTI_I18N?.language === 'fr';
  const theme = definition?.theme || {};
  const BRAND_LABEL = 'confluenceofminds.com/titan/';

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function shareUrl() {
    const url = new URL('https://confluenceofminds.com/titan/');
    url.searchParams.set('incident', context?.selectedMissionId || mission.number);
    if (isFrench()) url.searchParams.set('lang', 'fr');
    return url;
  }

  function formatDelta(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function drawPath(ctx, path, y, accent) {
    const size = 54;
    const gap = 22;
    (path || []).forEach((choice, index) => {
      const x = 105 + index * (size + gap);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      roundedRect(ctx, x, y, size, size, 9);
      ctx.stroke();
      ctx.fillStyle = accent;
      if (choice === 0) {
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (choice === 1) {
        roundedRect(ctx, x + 11, y + 11, size - 22, size - 22, 5);
        ctx.fill();
      } else {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + size - 12);
        ctx.lineTo(x + size - 12, y + 12);
        ctx.stroke();
      }
    });
  }

  function drawMetric(ctx, label, initialValue, finalValue, y, accent) {
    const delta = finalValue - initialValue;
    ctx.fillStyle = '#a7a4b5';
    ctx.font = '700 24px "Space Mono", monospace';
    ctx.fillText(label.toUpperCase(), 105, y);
    ctx.fillStyle = '#f4f1ff';
    ctx.font = '700 42px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(finalValue), 800, y + 8);
    ctx.fillStyle = delta < 0 ? '#ff9f91' : accent;
    ctx.font = '700 24px "Space Mono", monospace';
    ctx.fillText(formatDelta(delta), 970, y + 4);
    ctx.textAlign = 'left';
  }

  async function createResultPng(result) {
    try { await document.fonts?.ready; } catch (_) {}

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    const background = theme.cardBackground || '#08090d';
    const accent = theme.cardAccent || '#ed8d32';
    const accent2 = theme.cardAccent2 || '#ffc979';

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const glow = ctx.createRadialGradient(860, 120, 20, 860, 120, 480);
    glow.addColorStop(0, `${accent}66`);
    glow.addColorStop(1, `${accent}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(360, 0, 720, 620);

    ctx.strokeStyle = `${accent2}33`;
    ctx.lineWidth = 2;
    roundedRect(ctx, 52, 52, 976, 1246, 34);
    ctx.stroke();

    ctx.fillStyle = accent2;
    ctx.font = '700 26px "Space Mono", monospace';
    ctx.fillText('INCIDENT ON TITAN', 105, 130);
    ctx.fillStyle = '#aaa6b6';
    ctx.font = '700 21px "Space Mono", monospace';
    ctx.fillText(`INCIDENT ${mission.number}  /  ${mission.role.toUpperCase()}`, 105, 194);

    ctx.fillStyle = '#f5f1ff';
    ctx.font = '600 58px Rajdhani, sans-serif';
    ctx.fillText(mission.title.toUpperCase(), 105, 278);

    ctx.strokeStyle = `${accent}55`;
    ctx.beginPath();
    ctx.moveTo(105, 326);
    ctx.lineTo(975, 326);
    ctx.stroke();

    ctx.fillStyle = '#b9b3ca';
    ctx.font = '700 21px "Space Mono", monospace';
    ctx.fillText(tr('scoreAttributedCaps', 'SCORE ATTRIBUTED BY SYBILLE AI'), 105, 405);
    ctx.fillStyle = accent;
    ctx.font = '600 245px Rajdhani, sans-serif';
    ctx.fillText(String(result.score), 95, 640);
    ctx.fillStyle = '#9d96ad';
    ctx.font = '700 21px "Space Mono", monospace';
    ctx.fillText(tr('outOf1000', 'OUT OF 1000').toUpperCase(), 108, 690);

    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundedRect(ctx, 78, 735, 924, 294, 28);
    ctx.fill();
    ctx.strokeStyle = `${accent}33`;
    ctx.stroke();

    const canonical = result.canonical || { initial: definition.scoring.initial, final: definition.scoring.initial };
    const labels = isFrench()
      ? { crew: 'Équipage', energy: 'Énergie', science: 'Science', path: 'Trajectoire de décision', same: 'Jouez au même incident' }
      : { crew: 'Crew', energy: 'Energy', science: 'Science', path: 'Decision path', same: 'Play the same incident' };
    drawMetric(ctx, labels.crew, canonical.initial.crew, canonical.final.crew, 815, accent2);
    drawMetric(ctx, labels.energy, canonical.initial.energy, canonical.final.energy, 890, accent2);
    drawMetric(ctx, labels.science, canonical.initial.science, canonical.final.science, 965, accent2);

    ctx.fillStyle = '#aaa6b6';
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText(labels.path.toUpperCase(), 105, 1090);
    drawPath(ctx, result.path || [], 1120, accent2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#bcb5ca';
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText(result.simulation || '', 975, 1165);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.moveTo(105, 1212);
    ctx.lineTo(975, 1212);
    ctx.stroke();
    ctx.fillStyle = accent2;
    ctx.font = '700 20px "Space Mono", monospace';
    ctx.fillText(labels.same.toUpperCase(), 105, 1260);
    ctx.fillStyle = '#918c9b';
    ctx.font = '400 19px "Space Mono", monospace';
    ctx.fillText(BRAND_LABEL, 105, 1293);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG generation failed')), 'image/png', 1);
    });
  }

  function download(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }

  window.shareResult = async function themedMissionShare() {
    const result = window.result || window.loadStoredResult?.();
    if (!result) return;
    const button = document.querySelector('[data-action="share-result"]');
    const originalLabel = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = tr('preparingImage', 'Preparing image…');
    }

    try {
      const blob = await createResultPng(result);
      const filename = `incident-on-titan-${mission.number}-${result.score}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const gameUrl = shareUrl();
      const text = `Incident ${mission.number} · ${mission.title}\n${mission.role.toUpperCase()}\n${tr('scoreAttributedCaps', 'SCORE ATTRIBUTED BY SYBILLE AI')}: ${result.score}\n${result.simulation}`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: `Incident on Titan — ${mission.title}`, text, url: gameUrl.toString(), files: [file] });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.warn('Native image sharing failed.', error);
        }
      }

      download(blob, filename);
      try {
        await navigator.clipboard?.writeText(`${text}\n${gameUrl}`);
        alert(tr('imageDownloadedCopied', 'Result image downloaded. Game link copied.'));
      } catch (_) {
        alert(tr('imageDownloaded', 'Result image downloaded.'));
      }
    } catch (error) {
      console.error(error);
      alert(tr('imageError', 'The result image could not be generated.'));
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || tr('shareResult', 'Share result');
      }
    }
  };
})();
