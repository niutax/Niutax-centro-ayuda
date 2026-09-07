// Centro de Ayuda Niutax ERP — búsqueda, tema, TOC y visor de capturas.
(function () {
  var BASE = window.HELP_BASE || '';

  /* ------------------------------------------------------------------ tema */
  var btnTema = document.getElementById('tema');
  if (btnTema) {
    btnTema.addEventListener('click', function () {
      var actual = document.documentElement.dataset.tema;
      if (!actual) {
        actual = matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
      }
      var nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.dataset.tema = nuevo;
      try { localStorage.setItem('niutax-help-tema', nuevo); } catch (e) {}
    });
  }

  /* -------------------------------------------------------------- búsqueda */
  var indice = null;
  var cargando = null;

  function cargarIndice() {
    if (indice) return Promise.resolve(indice);
    if (!cargando) {
      cargando = fetch(BASE + '/buscar.json')
        .then(function (r) { return r.json(); })
        .then(function (d) { indice = d; return d; })
        .catch(function () { return (indice = []); });
    }
    return cargando;
  }

  var DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

  function normalizar(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(DIACRITICOS, '');
  }

  function buscar(q) {
    var terminos = normalizar(q).split(/\s+/).filter(Boolean);
    if (!terminos.length) return [];
    return indice
      .map(function (it) {
        var titulo = normalizar(it.t), resumen = normalizar(it.s), cuerpo = normalizar(it.k + ' ' + it.cn);
        var puntos = 0;
        for (var i = 0; i < terminos.length; i++) {
          var t = terminos[i], hit = 0;
          if (titulo.indexOf(t) === 0) hit += 12;
          else if (titulo.indexOf(t) > -1) hit += 8;
          if (resumen.indexOf(t) > -1) hit += 3;
          if (cuerpo.indexOf(t) > -1) hit += 1;
          if (!hit) return null;
          puntos += hit;
        }
        return { it: it, puntos: puntos };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.puntos - a.puntos; })
      .slice(0, 8)
      .map(function (r) { return r.it; });
  }

  function pintar(caja, resultados, q) {
    if (!q) { caja.hidden = true; caja.innerHTML = ''; return; }
    if (!resultados.length) {
      caja.innerHTML = '<p class="vacio">Sin resultados para «' + q.replace(/[<>&]/g, '') + '». Prueba con otra palabra o escríbenos a soporte@niutax.cl</p>';
      caja.hidden = false;
      return;
    }
    caja.innerHTML = resultados
      .map(function (r) {
        return '<a href="' + BASE + r.u + '"><span class="r-chip" style="color:' + r.col + '">' + r.c + '</span>' +
          '<b>' + r.t + '</b><span>' + r.s + '</span></a>';
      })
      .join('');
    caja.hidden = false;
  }

  function conectar(input, caja) {
    if (!input || !caja) return;
    var sel = -1;

    function actualizar() {
      var q = input.value.trim();
      cargarIndice().then(function () { pintar(caja, buscar(q), q); sel = -1; });
    }

    input.addEventListener('focus', cargarIndice);
    input.addEventListener('input', actualizar);
    input.addEventListener('keydown', function (e) {
      var items = caja.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        sel = e.key === 'ArrowDown' ? Math.min(sel + 1, items.length - 1) : Math.max(sel - 1, 0);
        for (var i = 0; i < items.length; i++) items[i].classList.toggle('sel', i === sel);
        items[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && sel > -1 && items[sel]) {
        e.preventDefault();
        location.href = items[sel].getAttribute('href');
      } else if (e.key === 'Escape') {
        caja.hidden = true;
        input.blur();
      }
    });
    document.addEventListener('click', function (e) {
      if (!caja.contains(e.target) && e.target !== input) caja.hidden = true;
    });
  }

  conectar(document.getElementById('q'), document.getElementById('resultados'));
  conectar(document.getElementById('q-hero'), document.getElementById('resultados-hero'));

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      var campo = document.getElementById('q-hero') || document.getElementById('q');
      if (campo) campo.focus();
    }
  });

  /* ------------------------------------ offset de anclas = alto del header */
  var cabecera = document.querySelector('.top');

  function ajustarOffsetAnclas() {
    if (!cabecera) return;
    var alto = Math.ceil(cabecera.getBoundingClientRect().height) + 16;
    document.documentElement.style.setProperty('--offset-anclas', alto + 'px');
  }

  ajustarOffsetAnclas();
  window.addEventListener('resize', ajustarOffsetAnclas);
  if (window.ResizeObserver && cabecera) new ResizeObserver(ajustarOffsetAnclas).observe(cabecera);

  /* ------------------------------- reposicionar el ancla tras cargar todo */
  if (location.hash) {
    // Chrome restaura el scroll anterior de la URL y pisa el salto al ancla.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('load', function () {
      var destino = document.getElementById(location.hash.slice(1));
      if (!destino) return;
      ajustarOffsetAnclas();
      var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--offset-anclas'), 10) || 88;
      window.scrollTo({ top: destino.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'instant' });
    });
  }

  /* -------------------------------------------------------- TOC scrollspy */
  var enlacesToc = [].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (enlacesToc.length && 'IntersectionObserver' in window) {
    var destinos = enlacesToc
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    var obs = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          enlacesToc.forEach(function (a) {
            a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id);
          });
        });
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 }
    );
    destinos.forEach(function (d) { obs.observe(d); });
  }

  /* ---------------------------------------------------- visor de capturas */
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('.captura img') : null;
    if (!img) return;
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<img src="' + img.src + '" alt="' + (img.alt || '') + '">';
    lb.addEventListener('click', function () { lb.remove(); });
    document.addEventListener('keydown', function cerrar(ev) {
      if (ev.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', cerrar); }
    });
    document.body.appendChild(lb);
  });

  /* ------------------------------------------------------- ¿fue útil? */
  var util = document.querySelector('.util');
  if (util) {
    util.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-util]');
      if (!b) return;
      util.querySelector('.util-btns').hidden = true;
      util.querySelector('.util-ok').hidden = false;
      try {
        var k = 'niutax-help-util';
        var d = JSON.parse(localStorage.getItem(k) || '{}');
        d[location.pathname] = b.dataset.util;
        localStorage.setItem(k, JSON.stringify(d));
      } catch (err) {}
    });
  }
})();
