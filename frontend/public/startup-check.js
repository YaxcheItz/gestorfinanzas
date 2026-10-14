// La entrada sigue ofreciendo una salida si la descarga de Angular queda interrumpida.
(() => {
  const root = document.querySelector('app-root');
  if (!root) return;
  const observer = new MutationObserver(() => {
    if (!root.querySelector('.kaptal-launch')) {
      clearTimeout(timer);
      observer.disconnect();
    }
  });
  const timer = setTimeout(() => {
    observer.disconnect();
    const launch = root.querySelector('.kaptal-launch');
    if (!launch) return;
    const message = launch.querySelector('p');
    if (message) message.textContent = 'Está tardando más de lo habitual. Comprueba tu conexión.';
    const retry = document.createElement('a');
    retry.href = location.href;
    retry.textContent = 'Volver a intentar';
    launch.append(retry);
  }, 20000);
  observer.observe(root, { childList: true });
})();
