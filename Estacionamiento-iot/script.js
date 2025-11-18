// script.js (Iconos encima + Firebase + Resumen General)

// =========================
//  FIREBASE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtor7OjQhBaKc3AOpArVfwXpHXJgJy1c8",
  authDomain: "estacionamiento-iot-c4a2d.firebaseapp.com",
  databaseURL: "https://estacionamiento-iot-c4a2d-default-rtdb.firebaseio.com",
  projectId: "estacionamiento-iot-c4a2d",
  storageBucket: "estacionamiento-iot-c4a2d.appspot.com",
  messagingSenderId: "1085568211295",
  appId: "1:1085568211295:web:04eb66a9469bfe7215beea"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =========================
//  LOGS
// =========================
const actividadEl = document.getElementById("actividad");

function log(msg) {
  const n = document.createElement("div");
  n.className = "log";
  n.textContent = `${new Date().toLocaleTimeString()} — ${msg}`;
  actividadEl.prepend(n);
}

// =========================
//  ICONOS
// =========================
function iconForSpace(state) {
  if (state === "Ocupado") return "img/auto_espacio.png";
  if (state === "Libre") return "img/espacio_libre.png";
  return "img/sin_datos.png";
}

function iconForIR(value) {
  const v = Number(value);

  if (v === 1) return "img/auto_entrada.png";
  if (v === 0) return "img/espacio.png";
  return "img/sin_datos.png";
}

// =========================
//  RESUMEN (OCUPADOS / LIBRES)
// =========================
let totalOcupados = 0;
let totalLibres = 0;

const ocupadosEl = document.getElementById("ocupados");
const libresEl = document.getElementById("libres");

function actualizarResumen() {
  ocupadosEl.textContent = totalOcupados;
  libresEl.textContent = totalLibres;
}

// =========================
//  ESPACIOS
// =========================
const espacios = [
  { id: 1, ruta: "espacios/espacio1" },
  { id: 2, ruta: "espacios/espacio2" },
  { id: 3, ruta: "espacios/espacio3" }
];

// Reiniciar contadores globales
function resetConteo() {
  totalOcupados = 0;
  totalLibres = 0;
}

resetConteo();

espacios.forEach(e => {

  const card = document.getElementById(`card${e.id}`);
  const distanciaEl = document.getElementById(`distancia${e.id}`);
  const estadoEl = document.getElementById(`estado${e.id}`);
  const iconEl = document.getElementById(`icon${e.id}`);

  onValue(ref(db, e.ruta), snap => {
    const data = snap.val();

    // Reiniciar conteo antes de procesar todos los sensores
    resetConteo();

    // Para asegurar que TODOS los espacios se cuenten,
    // volvemos a leerlos uno por uno:
    espacios.forEach(sp => {
      const ref2 = ref(db, sp.ruta);
      onValue(ref2, snap2 => {
        const d2 = snap2.val();
        if (d2 && d2.estado === "Ocupado") totalOcupados++;
        if (d2 && d2.estado === "Libre") totalLibres++;
        actualizarResumen();
      }, { onlyOnce: true });
    });

    // ==== SI NO HAY DATOS ====
    const top = card.querySelector(".top");

    if (!data) {
      distanciaEl.textContent = "-- cm";
      estadoEl.textContent = "Sin datos";
      top.className = "top loading";
      card.className = "card";
      iconEl.src = "img/sin_datos.png";
      log(`Espacio ${e.id}: Sin datos`);
      return;
    }

    // Distancia arriba
    const distText = (typeof data.distancia === "number")
      ? `${data.distancia.toFixed(1)} cm`
      : "-- cm";

    distanciaEl.textContent = distText;

    // Estado abajo
    const estadoVal = data.estado || "Sin datos";
    estadoEl.textContent = estadoVal;

    // Icono según estado
    iconEl.src = iconForSpace(estadoVal);

    // Estilos visuales
    if (estadoVal === "Ocupado") {
      top.className = "top ocupado";
      card.className = "card ocupado pulse";
      setTimeout(() => card.classList.remove("pulse"), 3000);
      log(`Espacio ${e.id}: Ocupado (${distText})`);
    } else if (estadoVal === "Libre") {
      top.className = "top libre";
      card.className = "card libre";
      log(`Espacio ${e.id}: Libre (${distText})`);
    } else {
      top.className = "top loading";
      card.className = "card";
      log(`Espacio ${e.id}: Estado desconocido -> ${estadoVal}`);
    }

  });
});

// =========================
//  SENSOR IR
// =========================
const cardIR = document.getElementById("cardIR");
const topIR = document.getElementById("topIR");
const estadoIR = document.getElementById("estadoIR");
const distanciaIR = document.getElementById("distanciaIR");
const iconIR = document.getElementById("iconIR");

onValue(ref(db, "sensorIR/valor"), snap => {
  const v = snap.val();

  if (v === null || v === undefined) {
    distanciaIR.textContent = "--";
    estadoIR.textContent = "Sin datos";
    topIR.className = "top loading";
    cardIR.className = "card";
    iconIR.src = "img/sin_datos.png";
    log("Sensor IR: Sin datos");
    return;
  }

  const num = Number(v);

  if (num === 1) {
    distanciaIR.textContent = "Auto entrando";
    estadoIR.textContent = "Auto entrando";
    topIR.className = "top ocupado";
    cardIR.className = "card ocupado pulse";
    iconIR.src = "img/auto_entrada.png";
    setTimeout(() => cardIR.classList.remove("pulse"), 3000);
    log("Entrada: Detectado");
  } else if (num === 0) {
    distanciaIR.textContent = "Entrada libre";
    estadoIR.textContent = "Entrada libre";
    topIR.className = "top libre";
    cardIR.className = "card libre";
    iconIR.src = "img/libre.png";
    log("Entrada: No detectado");
  } else {
    distanciaIR.textContent = String(v);
    estadoIR.textContent = "Sin datos";
    topIR.className = "top loading";
    cardIR.className = "card";
    iconIR.src = "img/sin_datos.png";
    log(`Entrada: Valor inesperado -> ${v}`);
  }
});

