/**
 * ============================================================================
 * SMART PARKING SYSTEM - JAVASCRIPT MODULE
 * ============================================================================
 * Sistema de gestión inteligente de estacionamiento en tiempo real
 * Tecnologías: Firebase Realtime Database, Vanilla JavaScript ES6+
 * Autor: Jason Tab
 * Versión: 2.0.0
 * ============================================================================
 */

// ============================================================================
// MÓDULOS DE FIREBASE
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onValue, 
  set 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ============================================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAtor7OjQhBaKc3AOpArVfwXpHXJgJy1c8",
  authDomain: "estacionamiento-iot-c4a2d.firebaseapp.com",
  databaseURL: "https://estacionamiento-iot-c4a2d-default-rtdb.firebaseio.com",
  projectId: "estacionamiento-iot-c4a2d",
  storageBucket: "estacionamiento-iot-c4a2d.appspot.com",
  messagingSenderId: "1085568211295",
  appId: "1:1085568211295:web:04eb66a9469bfe7215beea"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// SISTEMA DE REGISTRO DE ACTIVIDAD (LOGS)
// ============================================================================
const activityContainer = document.getElementById("actividad");

/**
 * Registra un evento en el sistema de actividad
 * @param {string} message - Mensaje a registrar
 * @param {string} type - Tipo de mensaje (info, success, warning, error)
 */
function logActivity(message, type = "info") {
  const logEntry = document.createElement("div");
  logEntry.className = "activity-log";
  
  const timestamp = new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  
  logEntry.innerHTML = `
    <span class="activity-log-time">${timestamp}</span> — ${message}
  `;
  
  // Insertar al inicio del contenedor
  activityContainer.insertBefore(logEntry, activityContainer.firstChild);
  
  // Limitar el número de logs visibles (máximo 50)
  const logs = activityContainer.querySelectorAll(".activity-log");
  if (logs.length > 50) {
    logs[logs.length - 1].remove();
  }
  
  // Animar entrada
  logEntry.style.opacity = "0";
  setTimeout(() => {
    logEntry.style.opacity = "1";
  }, 10);
}

// ============================================================================
// GESTIÓN DE ICONOS POR ESTADO
// ============================================================================
/**
 * Obtiene la ruta del icono según el estado del espacio
 * @param {string} state - Estado del espacio (Ocupado, Libre, etc.)
 * @returns {string} Ruta del icono correspondiente
 */
function getIconForState(state) {
  const icons = {
    "Ocupado": "img/auto_espacio.png",
    "Libre": "img/espacio_libre.png",
    "Auto entrando": "img/auto_entrada.png",
    "Entrada libre": "img/libre.png"
  };
  
  return icons[state] || "img/sin_datos.png";
}

// ============================================================================
// SISTEMA DE RESUMEN GENERAL
// ============================================================================
let totalOccupiedSpaces = 0;
let totalAvailableSpaces = 0;

const occupiedElement = document.getElementById("ocupados");
const availableElement = document.getElementById("libres");
const carsDetectedElement = document.getElementById("autosDetectados");

/**
 * Actualiza los contadores del resumen general
 */
function updateSummary() {
  occupiedElement.textContent = totalOccupiedSpaces;
  availableElement.textContent = totalAvailableSpaces;
  
  // Animación de actualización
  [occupiedElement, availableElement].forEach(el => {
    el.style.transform = "scale(1.1)";
    setTimeout(() => {
      el.style.transform = "scale(1)";
    }, 200);
  });
}

/**
 * Reinicia los contadores de espacios
 */
function resetSpaceCounters() {
  totalOccupiedSpaces = 0;
  totalAvailableSpaces = 0;
}

// ============================================================================
// CONFIGURACIÓN DE ESPACIOS DE ESTACIONAMIENTO
// ============================================================================
const parkingSpaces = [
  { id: 1, path: "espacios/espacio1", name: "Espacio 1" },
  { id: 2, path: "espacios/espacio2", name: "Espacio 2" },
  { id: 3, path: "espacios/espacio3", name: "Espacio 3" }
];

/**
 * Actualiza la UI de una tarjeta de espacio de estacionamiento
 * @param {Object} space - Configuración del espacio
 * @param {Object} data - Datos del sensor
 */
function updateParkingCard(space, data) {
  const card = document.getElementById(`card${space.id}`);
  const header = card.querySelector(".parking-card-header");
  const distanceElement = document.getElementById(`distancia${space.id}`);
  const statusElement = document.getElementById(`estado${space.id}`);
  const iconElement = document.getElementById(`icon${space.id}`);
  
  // Si no hay datos
  if (!data) {
    distanceElement.textContent = "-- cm";
    statusElement.textContent = "Sin datos";
    header.className = "parking-card-header status-loading";
    iconElement.src = "img/sin_datos.png";
    return;
  }
  
  // Formatear distancia
  const distanceText = typeof data.distancia === "number" 
    ? `${data.distancia.toFixed(1)} cm` 
    : "-- cm";
  
  distanceElement.textContent = distanceText;
  
  // Actualizar estado
  const status = data.estado || "Sin datos";
  statusElement.textContent = status;
  iconElement.src = getIconForState(status);
  
  // Aplicar estilos según estado y registrar solo cambios importantes
  if (status === "Ocupado") {
    header.className = "parking-card-header status-occupied";
    card.classList.add("pulse");
    setTimeout(() => card.classList.remove("pulse"), 4500);
    logActivity(`${space.name}: Vehículo detectado (${distanceText})`, "info");
  } else if (status === "Libre") {
    header.className = "parking-card-header status-available";
    card.classList.remove("pulse");
    logActivity(`${space.name}: Espacio disponible (${distanceText})`, "success");
  } else {
    header.className = "parking-card-header status-loading";
    card.classList.remove("pulse");
  }
}

/**
 * Cuenta los espacios ocupados y libres en tiempo real
 */
function countParkingSpaces() {
  resetSpaceCounters();
  
  const promises = parkingSpaces.map(space => {
    return new Promise(resolve => {
      const spaceRef = ref(database, space.path);
      onValue(spaceRef, snapshot => {
        const data = snapshot.val();
        if (data) {
          if (data.estado === "Ocupado") totalOccupiedSpaces++;
          if (data.estado === "Libre") totalAvailableSpaces++;
        }
        resolve();
      }, { onlyOnce: true });
    });
  });
  
  Promise.all(promises).then(() => {
    updateSummary();
  });
}

// ============================================================================
// MONITOREO DE ESPACIOS DE ESTACIONAMIENTO
// ============================================================================
parkingSpaces.forEach(space => {
  const spaceRef = ref(database, space.path);
  
  onValue(spaceRef, snapshot => {
    const data = snapshot.val();
    updateParkingCard(space, data);
    countParkingSpaces();
  });
});

// ============================================================================
// SENSOR DE ENTRADA (IR) Y CONTADOR DE VEHÍCULOS
// ============================================================================
const entranceCard = document.getElementById("cardIR");
const entranceHeader = document.getElementById("topIR");
const entranceStatus = document.getElementById("estadoIR");
const entranceDistance = document.getElementById("distanciaIR");
const entranceIcon = document.getElementById("iconIR");

const carCounterRef = ref(database, "sensorIR/contador");

// Inicializar contador de vehículos detectados
onValue(carCounterRef, snapshot => {
  const count = snapshot.val() || 0;
  carsDetectedElement.textContent = count;
});

// Monitorear sensor de entrada
const entranceSensorRef = ref(database, "sensorIR/valor");

onValue(entranceSensorRef, snapshot => {
  const value = snapshot.val();
  
  // Validar datos
  if (value === null || value === undefined) {
    entranceDistance.textContent = "--";
    entranceStatus.textContent = "Sin datos";
    entranceHeader.className = "parking-card-header status-loading";
    entranceIcon.src = "img/sin_datos.png";
    return;
  }
  
  const sensorValue = Number(value);
  
  // Vehículo detectado
  if (sensorValue === 1) {
    entranceDistance.textContent = "Auto entrando";
    entranceStatus.textContent = "Auto entrando";
    entranceHeader.className = "parking-card-header status-occupied";
    entranceCard.classList.add("pulse");
    entranceIcon.src = "img/auto_entrada.png";
    
    setTimeout(() => entranceCard.classList.remove("pulse"), 4500);
    
    logActivity("🚗 Vehículo detectado en la entrada", "info");
    
    // Incrementar contador
    onValue(carCounterRef, counterSnapshot => {
      let currentCount = counterSnapshot.val() || 0;
      currentCount++;
      set(carCounterRef, currentCount);
      carsDetectedElement.textContent = currentCount;
      
      // Animación del contador
      carsDetectedElement.style.transform = "scale(1.2)";
      setTimeout(() => {
        carsDetectedElement.style.transform = "scale(1)";
      }, 300);
      
    }, { onlyOnce: true });
    
  } 
  // Entrada libre
  else if (sensorValue === 0) {
    entranceDistance.textContent = "Entrada libre";
    entranceStatus.textContent = "Entrada libre";
    entranceHeader.className = "parking-card-header status-available";
    entranceCard.classList.remove("pulse");
    entranceIcon.src = "img/libre.png";
    logActivity("Entrada: Despejada", "success");
  } 
  // Valor inesperado
  else {
    entranceDistance.textContent = String(value);
    entranceStatus.textContent = "Sin datos";
    entranceHeader.className = "parking-card-header status-loading";
    entranceIcon.src = "img/sin_datos.png";
  }
});

// ============================================================================
// INICIALIZACIÓN DEL SISTEMA
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("%c🚗 Smart Parking System", "font-size: 20px; font-weight: bold; color: #00ffd5;");
  console.log("%cSistema inicializado correctamente", "font-size: 14px; color: #00e5a8;");
  console.log("%c© 2025 El Portón | Desarrollado por Jason Tab", "font-size: 12px; color: #94a3b8;");
  
  // Limpiar mensaje inicial después de cargar
  setTimeout(() => {
    activityContainer.innerHTML = '';
    logActivity("Sistema iniciado - Esperando detección de sensores...", "info");
  }, 1000);
});

// ============================================================================
// MANEJO DE ERRORES GLOBALES
// ============================================================================
window.addEventListener("error", (event) => {
  console.error("Error del sistema:", event.error);
});

// ============================================================================
// EXPORTAR FUNCIONES (OPCIONAL)
// ============================================================================
export {
  logActivity,
  updateSummary,
  updateParkingCard
};
