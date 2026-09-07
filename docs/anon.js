/**
 * Anonimizador de capturas — versión final, afinada contra los tres ERP.
 *
 * Se inyecta en la pantalla ANTES de tomar cada captura. Solo reescribe texto
 * visible (nodos de texto, valores y placeholders de campos, opciones elegidas
 * y celdas de tablas). No envía nada ni modifica datos del sistema.
 *
 * Los ERP tienen CSP que bloquea <script src> externo, así que este archivo se
 * pega en la consola / javascript_tool y se guarda para la sesión:
 *
 *   sessionStorage.setItem('A','window.A='+A.toString());   // una vez por dominio
 *   eval(sessionStorage.A); A();                            // en cada pantalla
 *
 * Reglas aprendidas por las que hubo que descartar capturas:
 *  - El email debe reemplazarse ANTES que el nombre de empresa: si no, el dominio
 *    queda partido ("usuario@ACME DEMO.cl") y el prefijo real sobrevive.
 *  - Los índices de columna se toman de la ÚLTIMA fila del thead: hay tablas con
 *    doble encabezado que desalinean el mapeo.
 *  - La columna "Nombre" solo se anonimiza si la tabla identifica personas o
 *    empresas (tiene RUT / correo). Si no, se destruyen datos útiles como los
 *    nombres de roles.
 *  - Las columnas que empiezan con "RUT" nunca se tratan como nombre.
 */
window.A = function () {
  var FICT = ['ACME CORP SPA', 'GLOBEX TRADING SPA', 'INITECH SERVICES SPA',
    'UMBRELLA SUPPLIES SPA', 'STARK INDUSTRIES SPA', 'WAYNE ENTERPRISES SPA',
    'SOYLENT FOODS SPA', 'HOOLI TECH SPA', 'VEHEMENT CAPITAL SPA', 'MASSIVE DYNAMIC SPA'];
  var PERS = ['John Doe', 'Jane Smith', 'Mark Brown', 'Emily Clark', 'Robert Lee',
    'Laura Hill', 'Peter Young', 'Anna Reed'];

  // mapeo estable: el mismo original siempre recibe el mismo alias
  window.__map = window.__map || {};
  window.__i = window.__i || 0;

  // Reglas con nombres reales: viven en docs/anon.privado.js (ignorado por git) → window.__PRIVADOS
  var R = (window.__PRIVADOS || []).slice();
  R.push.apply(R, [
    [/\S+@\S+\.\S+/g, 'contact@example.com'],              // SIEMPRE primero
    [/NIUDATA\s*SPA/gi, 'GLOBEX TRADING SPA'],
    [/NIUTAX\s*SPA/gi, 'INITECH SERVICES SPA'],
    [/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g, '11.111.111-1'],
    [/\b\d{7,8}-[\dkK]\b/g, '11111111-1'],
    [/(\+?56\s?)?9[\s.-]?\d{4}[\s.-]?\d{4}\b/g, '+56 9 1234 5678'],
  ]);

  function L(t) { var o = t; R.forEach(function (r) { o = o.replace(r[0], r[1]); }); return o; }

  var c = 0, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = w.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    var v = L(n.nodeValue);
    if (v !== n.nodeValue) { n.nodeValue = v; c++; }
  }

  document.querySelectorAll('input,textarea').forEach(function (e) {
    ['value', 'placeholder'].forEach(function (p) {
      if (!e[p]) return;
      var v = L(e[p]);
      if (v !== e[p]) { e[p] = v; c++; }
    });
  });

  document.querySelectorAll('select').forEach(function (s) {
    var o = s.options[s.selectedIndex];
    if (!o) return;
    var v = L(o.text);
    if (v !== o.text) { o.text = v; c++; }
  });

  // nombre de empresa del encabezado, sea cual sea
  var h = document.querySelector('.media-body h6');
  if (h && h.textContent.trim() !== 'ACME DEMO SPA') { h.textContent = 'ACME DEMO SPA'; c++; }

  // titular del certificado digital
  [].forEach.call(document.querySelectorAll('b,strong'), function (b) {
    if (/Certificado en uso/i.test(b.textContent) && b.nextSibling &&
        b.nextSibling.nodeValue && b.nextSibling.nodeValue.trim().length > 3) {
      b.nextSibling.nodeValue = ' JOHN A. DOE'; c++;
    }
  });

  // columnas de tablas con nombres de personas o empresas
  document.querySelectorAll('table').forEach(function (t) {
    var filas = t.querySelectorAll('tbody tr');
    if (!filas.length) return;
    var nTd = filas[0].children.length;
    var trs = [].slice.call(t.querySelectorAll('thead tr')), hdr = null;
    for (var k = trs.length - 1; k >= 0; k--) {
      if (trs[k].children.length === nTd) { hdr = trs[k]; break; }
    }
    if (!hdr) return;
    var th = [].map.call(hdr.children, function (x) { return x.innerText.trim().toUpperCase(); });
    var ident = th.some(function (x) { return /RUT|CORREO|EMAIL|MAIL/.test(x); });
    var idx = [];
    th.forEach(function (x, i) {
      var esNom = /^NOMBRE$/.test(x) || /TRABAJADOR|COLABORADOR|EMPLEADO/.test(x);
      var esOtro = !/^RUT/.test(x) &&
        /CLIENTE|RECEPTOR|RAZ.N|PROVEEDOR|EMISOR|VENDEDOR|CONTACTO|EMPRESA/.test(x);
      if ((esNom && ident) || esOtro) idx.push({ i: i, pers: /VENDEDOR|CONTACTO|TRABAJADOR|COLABORADOR|EMPLEADO/.test(x) });
    });
    if (!idx.length) return;
    filas.forEach(function (tr) {
      idx.forEach(function (o) {
        var cel = tr.children[o.i];
        if (!cel) return;
        var orig = cel.innerText.trim();
        if (!orig || orig.length < 3 || /^\d+$/.test(orig) || /^Todas las empresas$/i.test(orig)) return;
        if (!window.__map[orig]) {
          window.__map[orig] = o.pers ? PERS[window.__i % PERS.length] : FICT[window.__i % FICT.length];
          window.__i++;
        }
        if (cel.innerText.trim() !== window.__map[orig]) { cel.textContent = window.__map[orig]; c++; }
      });
    });
  });

  return 'anon:' + c;
};

/**
 * Anonimizador del módulo tributario (niu.tax).
 *
 * Niutax es multi-empresa por diseño: sus paneles listan la CARTERA COMPLETA de
 * clientes del usuario, no una sola empresa. Por eso no sirve el criterio de `A()`,
 * que colapsa todos los RUT a `11.111.111-1`: además de aplastar la pantalla, borra
 * la idea de que cada fila es una empresa distinta.
 *
 * Aquí cada RUT y cada razón social distinta recibe un alias PROPIO y ESTABLE, de
 * modo que la captura sigue mostrando una cartera creíble sin revelar a nadie. El
 * mapeo se guarda en window.__rut / window.__map, así que la misma empresa mantiene
 * su alias entre pantallas mientras dure la pestaña.
 *
 * Uso:
 *   sessionStorage.setItem('T','window.T='+T.toString());   // una vez por dominio
 *   eval(sessionStorage.T); T();                            // en cada pantalla
 */
window.T = function () {
  var FICT = ['ACME CORP SPA', 'GLOBEX TRADING SPA', 'INITECH SERVICES SPA',
    'UMBRELLA SUPPLIES SPA', 'STARK INDUSTRIES SPA', 'WAYNE ENTERPRISES SPA',
    'SOYLENT FOODS SPA', 'HOOLI TECH SPA', 'VEHEMENT CAPITAL SPA', 'MASSIVE DYNAMIC SPA',
    'CYBERDYNE SYSTEMS SPA', 'TYRELL CORP SPA', 'OSCORP HOLDINGS SPA', 'DUFF BREWING SPA',
    'BLUTH COMPANY SPA', 'PIED PIPER LTDA', 'NAKATOMI TRADING SPA', 'GEKKO CAPITAL SPA',
    'PRESTIGE WORLDWIDE SPA', 'DUNDER MIFFLIN LTDA'];
  var PERS = ['John Doe', 'Jane Smith', 'Mark Brown', 'Emily Clark', 'Robert Lee',
    'Laura Hill', 'Peter Young', 'Anna Reed', 'David Ward', 'Sarah Bell',
    'Thomas Gray', 'Julia Fox', 'Henry Cole', 'Nora Bishop'];

  window.__map = window.__map || {};   // razón social → alias
  window.__rut = window.__rut || {};   // rut original → rut ficticio
  window.__gen = window.__gen || {};   // rut ficticio ya emitido → no volver a mapearlo
  window.__per = window.__per || {};   // persona natural → alias
  window.__i = window.__i || 0;
  window.__ri = window.__ri || 0;
  window.__pi = window.__pi || 0;

  // RUT ficticios con dígito verificador coherente, para que la pantalla no delate el retoque
  function dv(n) {
    var s = 0, m = 2, x = String(n);
    for (var i = x.length - 1; i >= 0; i--) { s += parseInt(x[i], 10) * m; m = m === 7 ? 2 : m + 1; }
    var r = 11 - (s % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  }
  function puntos(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rutFalso() {
    var base = 76000000 + (window.__ri++) * 137911;   // paso primo: no se repite ni se adivina
    return { conPuntos: puntos(base) + '-' + dv(base), sinPuntos: base + '-' + dv(base) };
  }
  // Idempotente: si el RUT que encuentra es uno que este anonimizador ya emitió,
  // lo deja pasar. Sin esto, correr T() dos veces en la misma pantalla reasigna los
  // alias y la cartera cambia de RUT entre capturas de la misma pantalla.
  function aliasRut(orig) {
    var k = orig.replace(/\./g, '');
    if (window.__gen[k]) return orig;
    if (!window.__rut[k]) {
      window.__rut[k] = rutFalso();
      window.__gen[window.__rut[k].sinPuntos.replace(/\./g, '')] = 1;
    }
    return orig.indexOf('.') > -1 ? window.__rut[k].conPuntos : window.__rut[k].sinPuntos;
  }

  // Personas naturales sueltas en texto libre. Aparecen, por ejemplo, en la columna
  // ROL de Usuarios como "Usuario de <nombre real>": el rol no es un dato público.
  function aliasPersona(nom) {
    if (!window.__per[nom]) window.__per[nom] = PERS[window.__pi++ % PERS.length];
    return window.__per[nom];
  }
  var RE_NOMBRE = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+(?:de|del|la|las|los))?(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+';

  var RE_RUT = /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g;
  var c = 0;

  function L(t) {
    return t
      .replace(/\S+@\S+\.\S+/g, 'contact@example.com')                    // email primero, siempre
      .replace(RE_RUT, aliasRut)
      .replace(/(\+?56\s?)?9[\s.-]?\d{4}[\s.-]?\d{4}\b/g, '+56 9 1234 5678')
      .replace(new RegExp('(Usuario|Contador|Cliente|Ejecutivo|Asistente)\\s+de\\s+(' + RE_NOMBRE + ')', 'g'),
        function (m, rol, nom) { return rol + ' de ' + aliasPersona(nom); })
      .replace(/NIUDATA\s*SPA/gi, 'GLOBEX TRADING SPA')
      .replace(/NIUTAX\s*SPA/gi, 'INITECH SERVICES SPA');
  }

  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = w.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    var v = L(n.nodeValue);
    if (v !== n.nodeValue) { n.nodeValue = v; c++; }
  }

  document.querySelectorAll('input,textarea').forEach(function (e) {
    ['value', 'placeholder'].forEach(function (p) {
      if (!e[p]) return;
      var v = L(e[p]);
      if (v !== e[p]) { e[p] = v; c++; }
    });
  });

  // Los selectores de RUT listan la cartera entera con el formato "RUT - RAZÓN SOCIAL".
  // L() solo sabe reescribir el RUT, así que el nombre hay que aliasarlo aparte: si no,
  // basta con desplegar el combo para que la captura muestre miles de clientes reales.
  function aliasEntidad(nom) {
    // Idempotencia: si ya es un alias emitido, devolverlo tal cual. Sin esto, correr
    // T() dos veces en la misma pantalla reasigna los nombres y la misma empresa
    // aparece con distinto alias en capturas contiguas.
    if (FICT.indexOf(nom) > -1 || PERS.indexOf(nom) > -1) return nom;
    if (!window.__map[nom]) {
      var esEmpresa = /\b(SPA|S\.?A\.?|LTDA|LIMITADA|EIRL|SOCIEDAD|COMERCIAL|INVERSIONES|SERVICIOS|CONSTRUCTORA|TRANSPORTES|AGRICOLA|ASESORIAS)\b/i.test(nom);
      window.__map[nom] = esEmpresa ? FICT[window.__i++ % FICT.length] : PERS[window.__pi++ % PERS.length];
    }
    return window.__map[nom];
  }
  function rutNombre(t) {
    return L(t).replace(/^(\s*\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\s*-\s*(\S.*)$/,
      function (m, rut, nom) { return rut + ' - ' + aliasEntidad(nom.trim()); });
  }
  document.querySelectorAll('select').forEach(function (s) {
    [].forEach.call(s.options, function (o) {
      var v = rutNombre(o.text);
      if (v !== o.text) { o.text = v; c++; }
    });
  });

  // El ERP usa select2: el combo que se VE no es el <select>, es un <span> que replica
  // el texto (y lo repite en el atributo title y en los <li> del desplegable abierto).
  // Reescribir solo los <option> deja la razón social real a la vista.
  document.querySelectorAll('.select2-selection__rendered, .select2-results__option').forEach(function (e) {
    var v = rutNombre(e.textContent);
    if (v !== e.textContent) { e.textContent = v; c++; }
    if (e.title) e.title = rutNombre(e.title);
  });

  // Usuario de la barra superior
  document.querySelectorAll('.media-body h6, .user-name, .username').forEach(function (e) {
    var v = L(e.textContent);
    if (v !== e.textContent) { e.textContent = v; c++; }
  });

  // Razones sociales en tablas: columnas de nombre/empresa que acompañan a un RUT
  document.querySelectorAll('table').forEach(function (t) {
    var filas = t.querySelectorAll('tbody tr');
    if (!filas.length) return;
    var nTd = filas[0].children.length;
    var trs = [].slice.call(t.querySelectorAll('thead tr')), hdr = null;
    for (var k = trs.length - 1; k >= 0; k--) {
      if (trs[k].children.length === nTd) { hdr = trs[k]; break; }
    }
    if (!hdr) return;
    var th = [].map.call(hdr.children, function (x) { return x.innerText.trim().toUpperCase(); });
    // "NOMBRE" a secas solo es un nombre propio si la tabla identifica a alguien.
    // En /administracion/roles la columna NOMBRE son nombres de rol (Administrador,
    // Contador): anonimizarlos destruye el contenido que el artículo necesita mostrar.
    var ident = th.some(function (x) { return /RUT|CORREO|EMAIL|MAIL/.test(x); });
    var idx = [];
    th.forEach(function (x, i) {
      if (/^RUT/.test(x)) return;                       // nunca tratar una columna RUT como nombre
      var generico = /^NOMBRE$/.test(x);
      var explicito = /RAZ.N|CONTRIBUYENTE|SOCIO|PROPIETARIO|TITULAR|BENEFICIARIO/.test(x) ||
        /^(EMPRESA|CLIENTE)$/.test(x);
      if ((generico && ident) || explicito) {
        idx.push({ i: i, pers: /SOCIO|PROPIETARIO|TITULAR|BENEFICIARIO/.test(x) });
      }
    });
    if (!idx.length) return;
    filas.forEach(function (tr) {
      idx.forEach(function (o) {
        var cel = tr.children[o.i];
        if (!cel) return;
        var orig = cel.innerText.trim();
        if (!orig || orig.length < 3 || /^[\d.,$%-]+$/.test(orig)) return;
        if (/^(todas|todos|sin datos|pendiente|aceptada|enviada|observada|guardada)/i.test(orig)) return;
        // El alias se elige por la FORMA del dato, no por el título de la columna:
        // una misma columna ("Nombre", "Razón social") mezcla personas naturales y
        // empresas. Sin esto, la lista de usuarios —que son personas— salía llena de
        // razones sociales ficticias y la pantalla dejaba de tener sentido.
        if (!window.__map[orig]) {
          var esEmpresa = /\b(SPA|S\.?A\.?|LTDA|LIMITADA|EIRL|SOCIEDAD|COMERCIAL|INVERSIONES|SERVICIOS|CONSTRUCTORA|TRANSPORTES|AGRICOLA|ASESORIAS)\b/i.test(orig);
          window.__map[orig] = (o.pers || !esEmpresa)
            ? PERS[window.__pi++ % PERS.length]
            : FICT[window.__i++ % FICT.length];
        }
        if (cel.innerText.trim() !== window.__map[orig]) { cel.textContent = window.__map[orig]; c++; }
      });
    });
  });

  // Red de seguridad final. Las reglas anteriores dependen de que la razón social esté
  // en una columna reconocible; el formulario F29 la pone en una tabla sin <thead>, así
  // que se escapaba. El sufijo societario (SPA, LTDA, S.A., EIRL…) es una señal fiable:
  // cualquier texto que lo lleve es una empresa y se aliasa, esté donde esté.
  var RE_EMPRESA = /^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .,&'\-]{4,}\s(SPA|S\.?A\.?|LTDA\.?|LIMITADA|EIRL|E\.I\.R\.L\.?)$/i;
  var w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n2;
  while ((n2 = w2.nextNode())) {
    var t2 = n2.nodeValue.trim();
    if (!t2 || t2.length < 6 || !RE_EMPRESA.test(t2)) continue;
    var a2 = aliasEntidad(t2);
    if (a2 !== t2) { n2.nodeValue = n2.nodeValue.replace(t2, a2); c++; }
  }

  return 'trib:' + c + ' (ruts:' + Object.keys(window.__rut).length +
         ' empresas:' + Object.keys(window.__map).length + ')';
};

/** Enmascara números de cuenta bancaria: usar solo en pantallas de bancos,
 *  porque en libros contables un número de 8 dígitos puede ser un folio. */
window.M = function () {
  var c = 0, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = w.nextNode())) {
    var t = n.nodeValue.trim();
    if (/^\d{8,12}$/.test(t)) { n.nodeValue = n.nodeValue.replace(t, '••••' + t.slice(-4)); c++; }
  }
  return 'mask:' + c;
};

// Uso: pegar primero docs/anon.privado.js (si existe) y luego este archivo.
if (typeof window !== 'undefined' && document.body) A();
/* ────────────────────────────────────────────────────────────────────────────
 * Reglas agregadas el 07-09-2026 al cerrar las capturas de NiuHR y Niutax.
 * Cada una nació de una fuga concreta que obligó a descartar una captura.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * NiuHR — H(): en este módulo TODA columna de persona es un trabajador.
 *  - El thead puede tener menos celdas que el tbody (columna de avatar sin <th>):
 *    se alinea por la derecha en vez de exigir el mismo número. Sin esto, la lista
 *    de Usuarios mostró nombres, correos y empresas reales.
 *  - NOMBRE se aliasa solo si la tabla identifica a alguien (tiene RUT/EMAIL); en
 *    Cargos y Departamentos "Nombre" es el nombre del cargo, no de una persona.
 *  - ROL puede traer "Operador RRHH de <nombre real>".
 *  - Avatares: todos al silueta por defecto (hay fotos reales).
 *  - Razones sociales por sufijo (SPA/LTDA/S.A./EIRL) estén donde estén.
 *  - Direcciones IP → 10.0.0.1 (Historial de firmas).
 */
window.H = function () {
  var PERS = ['John Doe','Jane Smith','Mark Brown','Emily Clark','Robert Lee','Laura Hill','Peter Young','Anna Reed','David Ward','Sarah Bell','Thomas Gray','Julia Fox'];
  var FICT = ['ACME CORP SPA','GLOBEX TRADING SPA','INITECH SERVICES SPA','UMBRELLA SUPPLIES SPA','STARK INDUSTRIES SPA','WAYNE ENTERPRISES SPA','SOYLENT FOODS SPA','HOOLI TECH SPA','VEHEMENT CAPITAL SPA','MASSIVE DYNAMIC SPA'];
  window.__per = window.__per || {}; window.__pi = window.__pi || 0; window.__emp = window.__emp || {}; window.__ei = window.__ei || 0;
  var YA = /^(John Doe|Jane Smith|Mark Brown|Emily Clark|Robert Lee|Laura Hill|Peter Young|Anna Reed|David Ward|Sarah Bell|Thomas Gray|Julia Fox|ACME DEMO SPA)$/i;
  var SKIP = /^(test|todos.*|todas.*|firmante eliminado|sin acceso|con acceso|-|—|niudata|niutax|administrador|encargado|operador.*|contador|usuario|solo lectura)$/i;
  function alias(nom) { nom = nom.trim(); if (!nom || nom.length < 4 || YA.test(nom) || SKIP.test(nom)) return nom; if (!window.__per[nom]) window.__per[nom] = PERS[window.__pi++ % PERS.length]; return window.__per[nom]; }
  function aliasEmp(nom) { nom = nom.trim(); if (FICT.indexOf(nom) > -1 || /ACME DEMO/.test(nom)) return nom; if (!window.__emp[nom]) window.__emp[nom] = FICT[window.__ei++ % FICT.length]; return window.__emp[nom]; }
  var c = 0;
  document.querySelectorAll('table').forEach(function (t) {
    var filas = t.querySelectorAll('tbody tr'); if (!filas.length) return;
    var nTd = filas[0].children.length;
    var trs = [].slice.call(t.querySelectorAll('thead tr')); if (!trs.length) return;
    var hdr = trs[trs.length - 1], nTh = hdr.children.length, off = nTd - nTh; if (off < 0) off = 0;
    var th = [].map.call(hdr.children, function (x) { return x.innerText.trim().toUpperCase(); });
    var ident = th.some(function (x) { return /RUT|CORREO|EMAIL|MAIL/.test(x); });
    var idx = [], rol = [];
    th.forEach(function (x, i) {
      if (/EMPLEADO|TRABAJADOR|COLABORADOR|FIRMADO|FIRMANTE|USUARIO|SOLICITANTE|APROBADO|RESPONSABLE|APELLIDO/.test(x) || (/^NOMBRE/.test(x) && ident)) idx.push(i + off);
      if (/^ROL/.test(x)) rol.push(i + off);
    });
    filas.forEach(function (tr) {
      idx.forEach(function (i) { var cel = tr.children[i]; if (!cel) return; var o = cel.innerText.trim(); var v = alias(o); if (v !== o) { cel.textContent = v; c++; } });
      rol.forEach(function (i) { var cel = tr.children[i]; if (!cel) return; var w0 = document.createTreeWalker(cel, NodeFilter.SHOW_TEXT, null), n0; while ((n0 = w0.nextNode())) { var v0 = n0.nodeValue.replace(/\bde\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/g, function (m, nom) { return 'de ' + alias(nom); }); if (v0 !== n0.nodeValue) { n0.nodeValue = v0; c++; } } });
    });
    var imgs = [].slice.call(t.querySelectorAll('tbody img')); if (imgs.length > 1) { var cnt = {}; imgs.forEach(function (im) { cnt[im.src] = (cnt[im.src] || 0) + 1; }); var def = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0]; imgs.forEach(function (im) { if (im.src !== def) { im.src = def; c++; } }); }
  });
  var RE = /\b(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+){2,3}[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g;
  var RE_EMP = /\b[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .,&'\-]{2,}\s(?:SPA|S\.?A\.?|LTDA\.?|LIMITADA|EIRL|E\.I\.R\.L\.?)\b/g;
  function txt(t) { return t.replace(RE, function (m) { return alias(m); }).replace(RE_EMP, function (m) { return aliasEmp(m); }); }
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = w.nextNode())) { var t = n.nodeValue; if (!t.trim()) continue; var v = txt(t); if (v !== t) { n.nodeValue = v; c++; } }
  document.querySelectorAll('option').forEach(function (o) { var v = txt(o.text); if (v !== o.text) { o.text = v; c++; } });
  document.querySelectorAll('.select2-selection__rendered').forEach(function (e) { var v = txt(e.textContent); if (v !== e.textContent) { e.textContent = v; c++; } if (e.title) e.title = txt(e.title); });
  var w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n2;
  while ((n2 = w2.nextNode())) { var t2 = n2.nodeValue; var v2 = t2.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '10.0.0.1'); if (v2 !== t2) { n2.nodeValue = v2; c++; } }
  return 'hr:' + c;
};

/**
 * NiuHR — P(): nombres de trabajadores en MAYÚSCULAS dentro de la campana de
 * notificaciones ("Se han agregado 5 día(s) de vacaciones a NOMBRE APELLIDO…").
 * SOLO dentro de la campana: aplicado a toda la página convirtió los cargos
 * ("VENDEDOR DE TIENDA") en personas y hubo que descartar la captura.
 */
window.P = function () {
  var PERS = ['John Doe','Jane Smith','Mark Brown','Emily Clark','Robert Lee','Laura Hill','Peter Young','Anna Reed'];
  var YA = /^(ACME|GLOBEX|INITECH|JOHN|JANE|MARK|EMILY|ROBERT|LAURA|PETER|ANNA)\b/;
  window.__per = window.__per || {}; window.__pi = window.__pi || 0;
  var RE = /\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+){2,}\b/g;
  var c = 0;
  document.querySelectorAll('.dropdown-menu, .notification, [class*=notif]').forEach(function (root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var t = n.nodeValue; if (!t.trim()) continue; var v = t.replace(RE, function (m) { if (YA.test(m)) return m; if (!window.__per[m]) window.__per[m] = PERS[window.__pi++ % PERS.length].toUpperCase(); return window.__per[m]; }); if (v !== t) { n.nodeValue = v; c++; } }
  });
  return 'pers:' + c;
};

/**
 * Niutax — G(): listas "RUT - NOMBRE" dentro de celdas (Grupos). T() reescribe el RUT
 * y las razones sociales con sufijo; una persona natural detrás de "RUT - " quedaba.
 */
window.G = function () {
  var FICT = ['ACME CORP SPA','GLOBEX TRADING SPA','INITECH SERVICES SPA','UMBRELLA SUPPLIES SPA','STARK INDUSTRIES SPA','WAYNE ENTERPRISES SPA','SOYLENT FOODS SPA','HOOLI TECH SPA','VEHEMENT CAPITAL SPA','MASSIVE DYNAMIC SPA','CYBERDYNE SYSTEMS SPA','TYRELL CORP SPA','OSCORP HOLDINGS SPA','DUFF BREWING SPA','BLUTH COMPANY SPA','PIED PIPER LTDA','NAKATOMI TRADING SPA','GEKKO CAPITAL SPA','PRESTIGE WORLDWIDE SPA','DUNDER MIFFLIN LTDA'];
  var PERS = ['John Doe','Jane Smith','Mark Brown','Emily Clark','Robert Lee','Laura Hill','Peter Young','Anna Reed','David Ward','Sarah Bell','Thomas Gray','Julia Fox','Henry Cole','Nora Bishop'];
  window.__map = window.__map || {}; window.__i = window.__i || 0; window.__pi = window.__pi || 0;
  function alias(nom) { nom = nom.trim(); if (FICT.indexOf(nom) > -1 || PERS.indexOf(nom) > -1 || /ACME DEMO/.test(nom)) return nom; if (!window.__map[nom]) { var e = /\b(SPA|S\.?A\.?|LTDA|LIMITADA|EIRL|SOCIEDAD|COMERCIAL|INVERSIONES|SERVICIOS|CONSTRUCTORA|TRANSPORTES|AGRICOLA|ASESORIAS)\b/i.test(nom); window.__map[nom] = e ? FICT[window.__i++ % FICT.length] : PERS[window.__pi++ % PERS.length]; } return window.__map[nom]; }
  var RE = /(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\s*-\s*([^,;|\n]{3,}?)(?=\s*(?:[,;|\n]|$))/g;
  var c = 0, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while ((n = w.nextNode())) { var t = n.nodeValue; if (!/-[\dkK]\s*-\s*\S/.test(t)) continue; var v = t.replace(RE, function (m, rut, nom) { return rut + ' - ' + alias(nom); }); if (v !== t) { n.nodeValue = v; c++; } }
  return 'g:' + c;
};

/**
 * Niutax — U(): personas naturales en MAYÚSCULAS dentro de celdas (3+ palabras, sin
 * dígitos). La razón social de una persona natural es su nombre completo con dos
 * apellidos y no lleva sufijo societario, así que la red RE_EMPRESA de T() no la ve.
 * Lista negra de estados que también son 3 palabras en mayúscula ("TG EN PROCESO").
 * Se aplica a td, option y select2; NO al resto de la página.
 */
window.U = function () {
  var FICT = ['ACME CORP SPA','GLOBEX TRADING SPA','INITECH SERVICES SPA','UMBRELLA SUPPLIES SPA','STARK INDUSTRIES SPA','WAYNE ENTERPRISES SPA','SOYLENT FOODS SPA','HOOLI TECH SPA','VEHEMENT CAPITAL SPA','MASSIVE DYNAMIC SPA','CYBERDYNE SYSTEMS SPA','TYRELL CORP SPA','OSCORP HOLDINGS SPA','DUFF BREWING SPA','BLUTH COMPANY SPA','PIED PIPER LTDA','NAKATOMI TRADING SPA','GEKKO CAPITAL SPA','PRESTIGE WORLDWIDE SPA','DUNDER MIFFLIN LTDA'];
  var PERS = ['JOHN DOE','JANE SMITH','MARK BROWN','EMILY CLARK','ROBERT LEE','LAURA HILL','PETER YOUNG','ANNA REED','DAVID WARD','SARAH BELL','THOMAS GRAY','JULIA FOX','HENRY COLE','NORA BISHOP','OSCAR STONE','CLARA WELLS','ETHAN MOSS','GRACE LANE'];
  window.__map = window.__map || {}; window.__i = window.__i || 0; window.__pi = window.__pi || 0;
  var NEGRA = /^(TG EN PROCESO|NO VIGENTE|NO INFORMADO|SIN DATOS|CON REPAROS|EN PROCESO|NO AFECTO.*|RENTA PRESUNTA|REGIMEN GENERAL|A REGIMEN GENERAL|CON CONTABILIDAD|SIN CONTABILIDAD|TOTAL.*|RUTS PERTENECIENTES.*|VER LOS ACUSES.*|TODAS LAS EMPRESAS|ACME DEMO SPA)$/;
  var RE = /^[A-ZÁÉÍÓÚÑ]{2,}(?:\s+(?:[A-ZÁÉÍÓÚÑ]{2,}|DE|DEL|LA|LAS|LOS|Y|E)){2,}$/;
  function alias(nom) { if (FICT.indexOf(nom) > -1 || PERS.indexOf(nom) > -1 || NEGRA.test(nom)) return nom; if (!window.__map[nom]) { var emp = /\b(SPA|S\.?A\.?|LTDA|LIMITADA|EIRL|SOCIEDAD|COMERCIAL|INVERSIONES|SERVICIOS|CONSTRUCTORA|TRANSPORTES|AGRICOLA|ASESORIAS|INMOBILIARIA|IMPORTADORA|EXPORTADORA|DISTRIBUIDORA|CONSULTORA|HOLDING)\b/.test(nom); window.__map[nom] = emp ? FICT[window.__i++ % FICT.length] : PERS[window.__pi++ % PERS.length]; } return window.__map[nom]; }
  var c = 0;
  document.querySelectorAll('td, .select2-selection__rendered, option').forEach(function (cel) {
    var w = document.createTreeWalker(cel, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var t = n.nodeValue.trim(); if (!t || /\d/.test(t) || !RE.test(t)) continue; var v = alias(t); if (v !== t) { n.nodeValue = n.nodeValue.replace(t, v); c++; } }
  });
  return 'u:' + c;
};

/* Orden de uso por módulo:
 *   NiuHR  → A(); P(); H();
 *   Niutax → T(); G(); U();      (y nunca abrir el combo "Filtrar ruts")
 * Recorte posterior obligatorio: scratchpad/recortar.js (ver docs/ESTADO.md). */
