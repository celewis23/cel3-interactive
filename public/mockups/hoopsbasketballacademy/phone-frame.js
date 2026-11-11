(() => {
  "use strict";

  function wrap() {
    var root = document.getElementById("dc-root");
    if (!root || root.dataset.hoopsFramed) return;
    root.dataset.hoopsFramed = "1";

    var shell = document.createElement("div");
    shell.className = "hoops-phone-shell";
    var frame = document.createElement("div");
    frame.className = "hoops-phone-frame";

    root.parentNode.insertBefore(shell, root);
    frame.appendChild(root);
    shell.appendChild(frame);

    var caption = document.createElement("a");
    caption.className = "hoops-phone-caption";
    caption.href = "/mockups/hoopsbasketballacademy";
    caption.textContent = "← All designs · Hoops Basketball Academy preview";
    shell.appendChild(caption);

    var roles = document.createElement('nav');
    roles.className = 'hoops-role-switcher';
    roles.setAttribute('aria-label', 'Preview role');
    var selected = document.querySelector('script[data-role]')?.dataset.role;
    roles.innerHTML = ['coach', 'parent', 'athlete'].map(function(role) {
      return '<a href="/mockups/hoopsbasketballacademy/app/' + role + '"' + (role === selected ? ' aria-current="page"' : '') + '>' + role[0].toUpperCase() + role.slice(1) + '</a>';
    }).join('');
    shell.insertBefore(roles, frame);

  }

  if (document.getElementById("dc-root")) {
    wrap();
  } else {
    var observer = new MutationObserver(function () {
      if (document.getElementById("dc-root")) {
        wrap();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
