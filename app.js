// Variables globales
let map;
let marcadores = [];
let datosPueblo = [];
let puntuacion = 0;
let puebloActual = '';
const PUNTOS_POR_RESPUESTA = 10;

// Elementos del DOM
const elementos = {
  mapa: document.getElementById('mapa'),
  selectorPueblo: document.getElementById('selector-pueblo'),
  panelPregunta: document.getElementById('pregunta-panel'),
  tituloLugar: document.getElementById('titulo-lugar'),
  descripcion: document.getElementById('descripcion'),
  preguntaTexto: document.getElementById('pregunta-texto'),
  opcionesContainer: document.getElementById('opciones-container'),
  feedback: document.getElementById('feedback'),
  btnVolver: document.getElementById('btn-volver'),
  puntosDisplay: document.getElementById('puntos')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
});

function initMap() {
  // Mapa centrado en la zona de Jávea/Denia por defecto
  map = L.map(elementos.mapa).setView([38.7896, 0.1666], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

function setupEventListeners() {
  // Cambio de pueblo
  elementos.selectorPueblo.addEventListener('change', async (e) => {
    puebloActual = e.target.value;
    if (puebloActual) {
      await cargarDatosPueblo(puebloActual);
    }
  });

  // Botón volver
  elementos.btnVolver.addEventListener('click', () => {
    elementos.panelPregunta.classList.add('hidden');
  });
}

async function cargarDatosPueblo(nombrePueblo) {
  try {
    // Cargar desde GitHub (asegúrate de que la URL sea correcta)
    const response = await fetch(`https://raw.githubusercontent.com/Rusby6/geoquiz/main/${nombrePueblo}.json`);
    
    if (!response.ok) throw new Error('No se pudo cargar el pueblo');
    
    datosPueblo = await response.json();
    mostrarMarcadores();
    actualizarPuntuacion(0); // Resetear puntuación al cambiar de pueblo
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert(`Error al cargar ${nombrePueblo}.json. ¿Está en GitHub?`);
  }
}

function mostrarMarcadores() {
  // Limpiar marcadores anteriores
  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];

  // Añadir nuevos marcadores
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
    .on('click', () => mostrarPregunta(lugar));

    marcadores.push(marker);
  });

  // Ajustar vista para mostrar todos los marcadores
  if (datosPueblo.length > 0) {
    const group = new L.featureGroup(marcadores);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function mostrarPregunta(lugar) {
  // Mostrar datos del lugar
  elementos.tituloLugar.textContent = lugar.titulo;
  elementos.descripcion.textContent = lugar.descripcion || "Sin descripción";
  
  // Mostrar la primera pregunta (puedes modificar para elegir aleatoria)
  const pregunta = lugar.preguntas[0]; 
  elementos.preguntaTexto.textContent = pregunta.texto;
  
  // Generar opciones
  elementos.opcionesContainer.innerHTML = '';
  pregunta.opciones.forEach((opcion, index) => {
    const boton = document.createElement('button');
    boton.className = 'opcion-btn';
    boton.textContent = opcion;
    boton.dataset.index = index;
    boton.addEventListener('click', () => validarRespuesta(index, pregunta.correcta));
    elementos.opcionesContainer.appendChild(boton);
  });
  
  // Mostrar panel
  elementos.panelPregunta.classList.remove('hidden');
  elementos.feedback.textContent = '';
}

function validarRespuesta(respuestaIndex, correctaIndex) {
  const opciones = document.querySelectorAll('.opcion-btn');
  
  // Deshabilitar todos los botones
  opciones.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('selected');
  });
  
  // Resaltar selección
  opciones[respuestaIndex].classList.add('selected');
  
  // Verificar respuesta
  if (respuestaIndex === correctaIndex) {
    elementos.feedback.textContent = "✅ Correcto!";
    elementos.feedback.className = "correct";
    actualizarPuntuacion(puntuacion + PUNTOS_POR_RESPUESTA);
  } else {
    elementos.feedback.textContent = `❌ Incorrecto! La respuesta correcta es: ${opciones[correctaIndex].textContent}`;
    elementos.feedback.className = "incorrect";
  }
}

function actualizarPuntuacion(nuevaPuntuacion) {
  puntuacion = nuevaPuntuacion;
  elementos.puntosDisplay.textContent = puntuacion;
}