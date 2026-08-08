(() => {
  const recipient = ['thomas.judes', 'gmail.com'].join('@');
  const language = document.documentElement.lang === 'fr' ? 'fr' : 'en';

  const copy = {
    en: {
      contactSubject: 'Confluence of Minds — Contact',
      contactBody: 'Hi,\n\nI am getting in touch about Confluence of Minds.\n\n',
      notifySubject: 'Confluence of Minds — Notify me when a new world opens',
      notifyBody: 'Hi,\n\nPlease notify me when a new world opens on Confluence of Minds.\n\n'
    },
    fr: {
      contactSubject: 'Confluence of Minds — Contact',
      contactBody: 'Bonjour,\n\nJe vous contacte au sujet de Confluence of Minds.\n\n',
      notifySubject: 'Confluence of Minds — Me prévenir quand un nouveau monde s’ouvre',
      notifyBody: 'Bonjour,\n\nJe souhaite être prévenu(e) lorsqu’un nouveau monde s’ouvre sur Confluence of Minds.\n\n'
    }
  }[language];

  const openMail = (subject, body) => {
    const href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  document.querySelectorAll('[data-contact-action]').forEach((button) => {
    button.addEventListener('click', () => openMail(copy.contactSubject, copy.contactBody));
  });

  document.querySelectorAll('[data-notify-action]').forEach((button) => {
    button.addEventListener('click', () => openMail(copy.notifySubject, copy.notifyBody));
  });
})();
