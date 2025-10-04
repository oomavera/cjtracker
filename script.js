(function initTimeline() {
  const totalDays = 90;
  const visiblePixelsPerDay = 32;
  const leftPadding = 24;
  const rightPadding = 24;
  const timeline = document.getElementById('timeline');
  const axis = document.getElementById('axis');
  const markers = document.getElementById('markers');
  const customers = document.getElementById('customers');
  const totalWidth = leftPadding + rightPadding + totalDays * visiblePixelsPerDay;
  timeline.style.minWidth = totalWidth + 'px';
  axis.style.left = leftPadding + 'px';
  axis.style.right = rightPadding + 'px';
  function dayToX(day) { const clamped = Math.max(0, Math.min(totalDays, day)); return leftPadding + clamped * visiblePixelsPerDay; }
  for (let d = 0; d <= totalDays; d++) {
    const x = dayToX(d);
    const tick = document.createElement('div'); tick.className = 'tick'; tick.style.left = x + 'px'; markers.appendChild(tick);
    if (d % 5 === 0) {
      const label = document.createElement('div'); label.className = 'tick-label'; label.style.left = x + 'px'; label.textContent = 'Day ' + d; markers.appendChild(label);
      const milestone = document.createElement('div'); milestone.className = 'milestone'; milestone.style.left = x + 'px'; markers.appendChild(milestone);
    }
  }
  const customersData = [{ name: 'AJ', day: 4 }];
  for (const c of customersData) {
    const x = dayToX(c.day);
    const el = document.createElement('div'); el.className = 'customer'; el.style.left = x + 'px';
    const dot = document.createElement('div'); dot.className = 'dot'; el.appendChild(dot);
    const label = document.createElement('div'); label.className = 'label'; label.textContent = ; el.appendChild(label);
    customers.appendChild(el);
  }
  requestAnimationFrame(() => { const centerX = dayToX(4) - timeline.clientWidth / 2; timeline.scrollLeft = Math.max(0, centerX); });
})();
