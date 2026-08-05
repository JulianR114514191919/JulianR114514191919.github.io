const load = (name) => new Promise((ok, bad) => {
  const el = document.createElement('script');
  el.src = new URL(name, import.meta.url);
  el.onload = ok;
  el.onerror = () => bad(new Error(name + ' 載不進來'));
  document.body.appendChild(el);
});
await load('markup.js');
await load('base.js');
await load('app.js');
await import('./live.js');
