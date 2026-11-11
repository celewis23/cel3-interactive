// Demo data stays in this browser tab; these previews never call the live API.
window.hoopsDemo = {
  restore(role, defaults) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`hoops.demo.v2.${role}`));
      return saved && typeof saved === 'object' && !Array.isArray(saved)
        ? { ...defaults, ...saved, run: false }
        : defaults;
    } catch { return defaults; }
  },
  save(role, state) {
    try { sessionStorage.setItem(`hoops.demo.v2.${role}`, JSON.stringify(state)); } catch { /* Private storage can be disabled. */ }
  },
  downloadReceipt(child) {
    const text = `HOOPS BASKETBALL ACADEMY\nSAMPLE RECEIPT — NOT A REAL PAYMENT\n\nAthlete: ${child}\nNovember membership\nPaid Nov 9 · Demo Visa ending 41\nThis is sample preview data only.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoops-${child.toLowerCase()}-sample-receipt.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
