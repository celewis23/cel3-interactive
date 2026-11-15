// Local mockup mail only. No live mail service or customer data is accessed.
window.JuiceboxMail = {
  render(state, setState, raw, goOrders) {
    const m = { folder: 'inbox', open: null, checked: [], query: '', reply: '', replies: {}, ...state.mail };
    const messages = m.messages || raw.map(t => ({
      id: t[0], from: t[1], initials: t[2], time: t[3], unread: t[4], subject: t[5],
      preview: t[6], body: t[7], meta: t[8], email: t[9], folder: 'inbox',
      starred: !!state.starredThreads?.[t[0]],
    }));
    const patch = values => setState({ mail: { ...m, messages, ...values } });
    const update = (ids, values) => messages.map(t => ids.includes(t.id) ? { ...t, ...values } : t);
    const hasDraft = !!(m.draft?.to || m.draft?.subject || m.draft?.body);
    const folders = [['inbox', 'Inbox', '▣'], ['starred', 'Starred', '☆'], ['sent', 'Sent', '➤'], ['drafts', 'Drafts', '▤'], ['archive', 'Archive', '▥'], ['trash', 'Trash', '♲']];
    const inFolder = t => m.folder === 'starred' ? t.starred && t.folder !== 'trash' : t.folder === m.folder;
    const query = m.query.trim().toLowerCase();
    const visible = messages.filter(t => inFolder(t) && (!query || [t.from, t.subject, t.body, t.email].some(v => v.toLowerCase().includes(query))));
    const selected = messages.find(t => t.id === m.open);
    const notify = text => patch({ notice: text });
    const move = (ids, folder) => {
      if (!ids.length) { notify('Select an email first.'); return; }
      patch({ messages: update(ids, { folder }), checked: [], open: null, notice: folder === 'trash' ? 'Moved to Trash. You can restore it from there.' : 'Archived. Find it in Archive.' });
    };
    const draft = m.draft || { to: '', subject: '', body: '' };
    const changeDraft = key => e => patch({ draft: { ...draft, [key]: e.target.value }, notice: '' });
    const sendCompose = e => {
      e?.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.to.trim()) || !draft.subject.trim() || !draft.body.trim()) {
        notify('Enter a valid recipient, subject, and message.'); return;
      }
      const sent = { id: 'sent-' + Date.now(), from: 'Julian', email: draft.to.trim(), to: draft.to.trim(), subject: draft.subject.trim(), body: draft.body.trim(), preview: draft.body.trim(), time: 'Just now', unread: false, starred: false, initials: 'J', meta: 'To ' + draft.to.trim(), folder: 'sent' };
      patch({ messages: [sent, ...messages], draft: null, compose: false, notice: 'Demo email sent. Find it in Sent. Nothing was emailed.' });
    };
    const sendReply = () => {
      if (!m.reply.trim()) { notify('Write a reply before sending.'); return; }
      const sent = { id: 'reply-' + Date.now(), from: 'Julian', email: selected.email, to: selected.email, subject: 'Re: ' + selected.subject, body: m.reply.trim(), preview: m.reply.trim(), time: 'Just now', unread: false, starred: false, initials: 'J', meta: 'To ' + selected.from, folder: 'sent', attached: !!m.attached, bold: !!m.bold, italic: !!m.italic };
      patch({ messages: [sent, ...messages], replies: { ...m.replies, [selected.id]: [...(m.replies[selected.id] || []), sent] }, reply: '', replying: false, attached: false, bold: false, italic: false, notice: 'Demo reply sent. Nothing was emailed.' });
    };
    const allChecked = visible.length > 0 && visible.every(t => m.checked.includes(t.id));
    return {
      mailFolders: folders.map(([id, label, icon]) => ({ label, icon, count: id === 'drafts' ? (hasDraft ? '1' : '') : String(messages.filter(t => id === 'inbox' ? t.folder === id && t.unread : id === 'starred' ? t.starred && t.folder !== 'trash' : t.folder === id).length || ''), active: m.folder === id ? 'page' : undefined, cls: 'jj-mail-folder' + (m.folder === id ? ' active' : ''), pick: () => patch({ folder: id, open: null, checked: [], query: '', notice: '' }) })),
      mailFolderName: folders.find(f => f[0] === m.folder)?.[1] || 'Inbox',
      mailUnread: messages.filter(t => t.folder === 'inbox' && t.unread).length,
      mailQuery: m.query, mailSearch: e => patch({ query: e.target.value, checked: [], open: null }),
      mailList: !selected, mailReading: !!selected, mailNotice: m.notice || '',
      mailRows: visible.map(t => ({ ...t, cls: 'jj-mail-row' + (t.unread ? ' unread' : '') + (m.checked.includes(t.id) ? ' checked' : ''), checked: m.checked.includes(t.id), check: () => patch({ checked: m.checked.includes(t.id) ? m.checked.filter(id => id !== t.id) : [...m.checked, t.id] }), star: t.starred ? '★' : '☆', starLabel: (t.starred ? 'Unstar' : 'Star') + ' email from ' + t.from, starCls: 'jj-mail-icon star' + (t.starred ? ' starred' : ''), toggleStar: () => patch({ messages: update([t.id], { starred: !t.starred }) }), pick: () => patch({ messages: update([t.id], { unread: false }), open: t.id, replying: false, reply: '', attached: false, bold: false, italic: false, notice: '' }) })),
      mailEmpty: visible.length === 0 && m.folder !== 'drafts', mailDrafts: m.folder === 'drafts', mailHasDraft: hasDraft, mailNoDraft: !hasDraft,
      mailRange: visible.length ? '1–' + visible.length + ' of ' + visible.length : '0 messages',
      mailAllChecked: allChecked, mailSelectAll: () => patch({ checked: allChecked ? [] : visible.map(t => t.id) }),
      mailArchive: () => move(selected ? [selected.id] : m.checked, 'archive'), mailTrash: () => move(selected ? [selected.id] : m.checked, 'trash'),
      mailRestore: () => { const ids = selected ? [selected.id] : m.checked; if (!ids.length) { notify('Select an email first.'); return; } patch({ messages: update(ids, { folder: 'inbox' }), checked: [], open: null, notice: 'Moved to Inbox.' }); },
      mailMarkUnread: () => { const ids = selected ? [selected.id] : m.checked; if (!ids.length) { notify('Select an email first.'); return; } patch({ messages: update(ids, { unread: true }), checked: [], open: null, notice: 'Marked as unread.' }); },
      mailRefresh: () => notify('You’re up to date. Showing sample mail.'),
      mailBack: () => patch({ open: null, replying: false, notice: '' }),
      mailSelected: selected ? { ...selected, senderEmail: selected.folder === 'sent' ? 'julian@juliansjuicebox.com' : selected.email, delivery: selected.folder === 'sent' ? 'to ' + selected.email : 'to Julian' } : {}, mailThreadReplies: (m.replies[selected?.id] || []).map(r => ({ ...r, textStyle: 'font-weight:' + (r.bold ? '700' : '400') + ';font-style:' + (r.italic ? 'italic' : 'normal') })),
      mailReplying: !!m.replying, mailNotReplying: !m.replying,
      mailStartReply: () => patch({ replying: true, notice: '' }), mailReply: m.reply, mailSetReply: e => patch({ reply: e.target.value }), mailSendReply: sendReply,
      mailSavedAnswer: () => patch({ reply: 'Hi ' + selected.from + ', thanks for reaching out! Happy to help with your order. I’ll confirm the details shortly.' }),
      mailBold: !!m.bold, mailItalic: !!m.italic, mailAttached: !!m.attached,
      mailToggleBold: () => patch({ bold: !m.bold }), mailToggleItalic: () => patch({ italic: !m.italic }), mailToggleAttach: () => patch({ attached: !m.attached }),
      mailReplyStyle: 'font-weight:' + (m.bold ? '700' : '400') + ';font-style:' + (m.italic ? 'italic' : 'normal'),
      mailDiscardReply: () => patch({ replying: false, reply: '', attached: false, bold: false, italic: false }), mailGoOrders: goOrders,
      mailCompose: !!m.compose, mailOpenCompose: () => patch({ compose: true, notice: '' }),
      mailCloseCompose: () => patch({ compose: false, notice: hasDraft ? 'Draft saved. Find it in Drafts.' : '' }),
      mailComposeKey: e => { if (e.key === 'Escape') patch({ compose: false, notice: hasDraft ? 'Draft saved. Find it in Drafts.' : '' }); },
      mailDiscardCompose: () => patch({ compose: false, draft: null, notice: 'Draft discarded.' }),
      mailDraft: draft, mailSetTo: changeDraft('to'), mailSetSubject: changeDraft('subject'), mailSetBody: changeDraft('body'), mailSendCompose: sendCompose,
    };
  },
};
