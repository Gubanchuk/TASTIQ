// Keep the mobile header outside the scrolling page. Its height can change
// with the safe area, text size, font loading and the visible navigation rows.
const shell = document.querySelector('.app-shell');
if (shell && typeof ResizeObserver === 'function') {
  const root = document.documentElement;
  const reserveHeight = () => {
    root.style.setProperty('--app-shell-height', shell.getBoundingClientRect().height + 'px');
    root.classList.add('has-measured-shell');
  };
  reserveHeight();
  new ResizeObserver(reserveHeight).observe(shell, {box: 'border-box'});
}
