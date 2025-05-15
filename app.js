let map;
let marcadores = [];
let datosPueblo = [];
let puntuacion = 0;
let puebloActual = 'javea';
let preguntasRespondidas = new Set();
const PUNTOS_POR_RESPUESTA = 10;

const elementos = {
  mapa: document.getElementById('mapa'),
  panelPregunta: document.getElementById('pregunta-panel'),
  tituloLugar: document.getElementById('titulo-lugar'),
  descripcion: document.getElementById('descripcion'),
  preguntaTexto: document.getElementById('pregunta-texto'),
  opcionesContainer: document.getElementById('opciones-container'),
  feedback: document.getElementById('feedback'),
  btnVolver: document.getElementById('btn-volver'),
  puntosDisplay: document.getElementById('puntos')
};

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await cargarDatosPueblo(puebloActual);
});

let userMarker = null;

function initMap() {
  map = L.map(elementos.mapa).setView([38.7896, 0.1666], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Crear o mover el marcador del usuario
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
    const response = await fetch(`https://raw.githubusercontent.com/Rusby6/geoquiz/main/${nombrePueblo}.json`);
    if (!response.ok) throw new Error('No se pudo cargar el pueblo');
    datosPueblo = await response.json();
    preguntasRespondidas.clear();
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
    const marker = L.marker([lugar.coordenadas.lat, lugar.coordenadas.lng], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin">${index + 1}</div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })
    })
      .addTo(map)
      .bindPopup(`<b>${lugar.titulo}</b><br>Click para jugar`)
      .on('click', () => mostrarPreguntasSecuenciales(lugar, `${puebloActual}-${index}`));

    marcadores.push(marker);
  });
}

function onUserPosition(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;

  datosPueblo.forEach((lugar, index) => {
    const distancia = getDistanceFromLatLng(userLat, userLng, lugar.coordenadas.lat, lugar.coordenadas.lng);
    const claveLugar = `${puebloActual}-${index}`;
    if (distancia <= 50 && !preguntasRespondidas.has(claveLugar)) {
      preguntasRespondidas.add(claveLugar);
      mostrarPreguntasSecuenciales(lugar, claveLugar);
    }
  });
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
      elementos.feedback.textContent = "✅ Correcto!";
      elementos.feedback.className = "correct";
      actualizarPuntuacion(puntuacion + PUNTOS_POR_RESPUESTA);
    } else {
      elementos.feedback.textContent = `❌ Incorrecto! La respuesta correcta es: ${opciones[correctaIndex].textContent}`;
      elementos.feedback.className = "incorrect";
    }

    setTimeout(() => {
      indicePregunta++;
      mostrarSiguientePregunta();
    }, 2000);
  }

  mostrarSiguientePregunta();
}

function actualizarPuntuacion(nuevaPuntuacion) {
  puntuacion = nuevaPuntuacion;
  if (elementos.puntosDisplay) {
    elementos.puntosDisplay.textContent = puntuacion;
  }
}
