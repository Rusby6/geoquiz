let map;
let marcadores = [];
let datosPueblo = [];
let puntuacion = 0;
let puebloActual = 'javea';
let preguntasRespondidas = new Set();
const PUNTOS_POR_RESPUESTA = 10;
const PUNTOS_PENALIZACION = 5;
let rachaCorrectas = 0;
let pueblosDisponibles = {};
let userMarker = null;

const elementos = {
  mapa: document.getElementById('mapa'),
  panelPregunta: document.getElementById('pregunta-panel'),
  tituloLugar: document.getElementById('titulo-lugar'),
  descripcion: document.getElementById('descripcion'),
  preguntaTexto: document.getElementById('pregunta-texto'),
  opcionesContainer: document.getElementById('opciones-container'),
  feedback: document.getElementById('feedback'),
  btnVolver: document.getElementById('btn-volver'),
  btnMinimizar: document.getElementById('btn-minimizar'),
  puntosDisplay: document.getElementById('puntos'),
  puntosContainer: document.getElementById('puntos-container'),
  puntosExtra: document.getElementById('puntos-extra'),
  selectPueblo: document.getElementById('select-pueblo'),
  headerContainer: document.getElementById('header-container'),
  distanciaContainer: document.getElementById('distancia-container'),
  distanciaValor: document.getElementById('distancia-valor'),
  distanciaBarra: document.getElementById('distancia-barra')
};

document.addEventListener('DOMContentLoaded', async () => {
  await verificarPueblosDisponibles();
  initMap();
  await cargarDatosPueblo(puebloActual);
  
  elementos.selectPueblo.addEventListener('change', async (e) => {
    if (e.target.value === puebloActual) return;
    puebloActual = e.target.value;
    const config = PUEBLOS[puebloActual];
    if (config) {
      map.setView(config.centro, config.zoom);
    }
    await cargarDatosPueblo(puebloActual);
  });

  elementos.btnMinimizar.addEventListener('click', () => {
    elementos.panelPregunta.classList.toggle('panel-minimizado');
  });
});

async function verificarPueblosDisponibles() {
  const pueblos = Object.keys(PUEBLOS);
  
  for (const pueblo of pueblos) {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/Rusby6/geoquiz/main/${pueblo}.json`, { method: 'HEAD' });
      pueblosDisponibles[pueblo] = response.ok;
    } catch (error) {
      pueblosDisponibles[pueblo] = false;
    }
  }
  
  const select = elementos.selectPueblo;
  for (let i = 0; i < select.options.length; i++) {
    const option = select.options[i];
    if (!pueblosDisponibles[option.value] && option.value !== puebloActual) {
      option.disabled = true;
      option.textContent += ' (no disponible)';
    }
  }
}

const PUEBLOS = {
  javea: {
    nombre: "Jávea",
    centro: [38.7896, 0.1666],
    zoom: 13
  },
  denia: {
    nombre: "Denia",
    centro: [38.8400, 0.1100],
    zoom: 14
  },
  calpe: {
    nombre: "Calpe",
    centro: [38.6447, 0.0456],
    zoom: 14
  },
  altea: {
    nombre: "Altea",
    centro: [38.5989, -0.0513],
    zoom: 14
  },
  benidorm: {
    nombre: "Benidorm",
    centro: [38.5411, -0.1229],
    zoom: 14
  }
};

function initMap() {
  const config = PUEBLOS[puebloActual] || PUEBLOS.javea;
  map = L.map(elementos.mapa).setView(config.centro, config.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const iconoUsuario = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149995.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], { icon: iconoUsuario }).addTo(map).bindPopup('Estás aquí');
        map.setView([lat, lng], 16);
      }

      onUserPosition(position);
    }, null, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 27000
    });
  }
}

elementos.btnVolver.addEventListener('click', () => {
  elementos.panelPregunta.classList.add('hidden');
});

async function cargarDatosPueblo(nombrePueblo) {
  try {
    elementos.distanciaContainer.classList.add('hidden');
    
    const response = await fetch(`https://raw.githubusercontent.com/Rusby6/geoquiz/main/${nombrePueblo}.json`);
    if (!response.ok) throw new Error('No se pudo cargar el pueblo');
    datosPueblo = await response.json();
    preguntasRespondidas.clear();
    rachaCorrectas = 0;
    mostrarMarcadores();
    actualizarPuntuacion(0);
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert(`Error al cargar ${nombrePueblo}.json.`);
  }
}

function mostrarMarcadores() {
  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];

  datosPueblo.forEach((lugar, index) => {
    const claveLugar = `${puebloActual}-${index}`;
    const respondido = preguntasRespondidas.has(claveLugar);
    
    const marker = L.marker([lugar.coordenadas.lat, lugar.coordenadas.lng], {
      icon: L.divIcon({
        className: respondido ? 'custom-marker marker-respondido' : 'custom-marker',
        html: `<div class="marker-pin">${index + 1}</div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })
    })
      .addTo(map)
      .bindPopup(`<b>${lugar.titulo}</b><br>${respondido ? 'Pregunta ya respondida' : 'Click para jugar'}`)
      .on('click', () => {
        if (!respondido) mostrarPreguntasSecuenciales(lugar, claveLugar);
      });

    marcadores.push(marker);
  });
}

function onUserPosition(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;
  let distanciaMinima = Infinity;
  let marcadorCercano = null;

  datosPueblo.forEach((lugar, index) => {
    const claveLugar = `${puebloActual}-${index}`;
    if (preguntasRespondidas.has(claveLugar)) return;
    
    const distancia = getDistanceFromLatLng(userLat, userLng, lugar.coordenadas.lat, lugar.coordenadas.lng);
    
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      marcadorCercano = { lugar, index, distancia };
    }
    
    if (distancia <= 50 && !preguntasRespondidas.has(claveLugar)) {
      preguntasRespondidas.add(claveLugar);
      mostrarPreguntasSecuenciales(lugar, claveLugar);
    }
  });

  // Actualizar UI de distancia
  if (marcadorCercano && marcadorCercano.distancia < 1000) {
    elementos.distanciaValor.textContent = `${Math.round(marcadorCercano.distancia)} m`;
    
    // Barra de progreso (inversa: 100% lejos, 0% cerca)
    const progreso = Math.min(100, (marcadorCercano.distancia / 500) * 100);
    elementos.distanciaBarra.style.width = `${progreso}%`;
    
    // Cambiar color según proximidad
    if (marcadorCercano.distancia < 100) {
      elementos.distanciaContainer.classList.add('cerca');
      elementos.distanciaBarra.style.background = 'var(--color-success)';
    } else {
      elementos.distanciaContainer.classList.remove('cerca');
      elementos.distanciaBarra.style.background = 
        'linear-gradient(90deg, var(--color-danger), var(--color-success))';
    }
    
    elementos.distanciaContainer.classList.remove('hidden');
  } else {
    elementos.distanciaContainer.classList.add('hidden');
  }
}

function getDistanceFromLatLng(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function mostrarPreguntasSecuenciales(lugar, claveLugar) {
  elementos.distanciaContainer.classList.add('hidden');
  let indicePregunta = 0;

  async function mostrarSiguientePregunta() {
    if (indicePregunta >= lugar.preguntas.length) {
      elementos.panelPregunta.classList.add('hidden');
      return;
    }

    const pregunta = lugar.preguntas[indicePregunta];
    elementos.tituloLugar.textContent = lugar.titulo;
    elementos.descripcion.textContent = lugar.descripcion || "Sin descripción";
    elementos.preguntaTexto.textContent = pregunta.texto;
    elementos.opcionesContainer.innerHTML = '';
    elementos.feedback.textContent = '';

    pregunta.opciones.forEach((opcion, index) => {
      const boton = document.createElement('button');
      boton.className = 'opcion-btn';
      boton.textContent = opcion;
      boton.dataset.index = index;
      boton.addEventListener('click', () => {
        validarRespuestaSecuencial(index, pregunta.correcta);
      });
      elementos.opcionesContainer.appendChild(boton);
    });

    elementos.panelPregunta.classList.remove('hidden');
  }

  function validarRespuestaSecuencial(respuestaIndex, correctaIndex) {
    const opciones = document.querySelectorAll('.opcion-btn');
    opciones.forEach(btn => btn.disabled = true);
    
    opciones[respuestaIndex].classList.add('selected');
    
    if (respuestaIndex === correctaIndex) {
      opciones[respuestaIndex].classList.add('correct');
      rachaCorrectas++;
      
      const puntosBase = PUNTOS_POR_RESPUESTA;
      const bonusRacha = rachaCorrectas > 2 ? Math.floor(rachaCorrectas / 2) : 0;
      const puntosGanados = puntosBase + bonusRacha;
      
      elementos.feedback.innerHTML = `✅ <strong>Correcto!</strong> +${puntosGanados} puntos${bonusRacha > 0 ? ` (+${bonusRacha} bonus racha)` : ''}${rachaCorrectas > 2 ? `<br>Racha: ${rachaCorrectas} respuestas correctas` : ''}`;
      elementos.feedback.className = "correct";
      mostrarPuntosExtra(`+${puntosGanados}`, 'puntos-positivos');
      actualizarPuntuacion(puntuacion + puntosGanados);
    } else {
      opciones[respuestaIndex].classList.add('incorrect');
      opciones[correctaIndex].classList.add('correct');
      
      const puntosPerdidos = PUNTOS_PENALIZACION;
      rachaCorrectas = 0;
      
      elementos.feedback.innerHTML = `❌ <strong>Incorrecto!</strong> -${puntosPerdidos} puntos<br>La respuesta correcta es: <strong>${opciones[correctaIndex].textContent}</strong>`;
      elementos.feedback.className = "incorrect";
      mostrarPuntosExtra(`-${puntosPerdidos}`, 'puntos-negativos');
      actualizarPuntuacion(Math.max(0, puntuacion - puntosPerdidos));
    }

    setTimeout(() => {
      indicePregunta++;
      mostrarSiguientePregunta();
    }, 2500);
  }

  mostrarSiguientePregunta();
}

function mostrarPuntosExtra(texto, clase) {
  elementos.puntosExtra.textContent = texto;
  elementos.puntosExtra.className = `mostrando-puntos-extra ${clase}`;
  setTimeout(() => {
    elementos.puntosExtra.classList.remove('mostrando-puntos-extra');
  }, 1000);
}

function actualizarPuntuacion(nuevaPuntuacion) {
  const diferencia = nuevaPuntuacion - puntuacion;
  puntuacion = nuevaPuntuacion;
  
  if (elementos.puntosDisplay) {
    elementos.puntosDisplay.textContent = puntuacion;
    
    if (diferencia > 0) {
      elementos.puntosDisplay.classList.add('ganando-puntos');
      setTimeout(() => {
        elementos.puntosDisplay.classList.remove('ganando-puntos');
      }, 500);
    } else if (diferencia < 0) {
      elementos.puntosDisplay.classList.add('perdiendo-puntos');
      setTimeout(() => {
        elementos.puntosDisplay.classList.remove('perdiendo-puntos');
      }, 500);
    }
  }
}
