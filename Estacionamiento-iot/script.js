// ✅ Importar módulos Firebase v11 (correctos para navegador)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 🔥 Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtor7OjQhBaKc3AOpArVfwXpHXJgJy1c8",
  authDomain: "estacionamiento-iot-c4a2d.firebaseapp.com",
  databaseURL: "https://estacionamiento-iot-c4a2d-default-rtdb.firebaseio.com",
  projectId: "estacionamiento-iot-c4a2d",
  storageBucket: "estacionamiento-iot-c4a2d.firebasestorage.app",
  messagingSenderId: "1085568211295",
  appId: "1:1085568211295:web:04eb66a9469bfe7215beea",
  measurementId: "G-PT67NHYGSG"
};

// 🔧 Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🎯 Referencias del DOM
const card = document.getElementById("sensor-card");
const estadoEl = document.getElementById("estado");
const distanciaEl = document.getElementById("distancia");
const registroLista = document.getElementById("registro-lista");
const ocupadosEl = document.getElementById("ocupados");
const libresEl = document.getElementById("libres");

let ultimoEstado = "";

// 🔄 Escuchar los datos en tiempo real
const refSensor = ref(db, "espacios/espacio1");

onValue(refSensor, (snapshot) => {
  const data = snapshot.val();

  if (!data) {
    estadoEl.textContent = "Sin datos";
    card.className = "card loading";
    return;
  }

  distanciaEl.textContent = data.distancia?.toFixed(2) || "--";
  estadoEl.textContent = data.estado || "--";

  if (data.estado === "Ocupado") {
    card.className = "card ocupado";
    ocupadosEl.textContent = "1";
    libresEl.textContent = "0";
  } else if (data.estado === "Libre") {
    card.className = "card libre";
    ocupadosEl.textContent = "0";
    libresEl.textContent = "1";
  } else {
    card.className = "card loading";
    ocupadosEl.textContent = "0";
    libresEl.textContent = "0";
  }

  // 📜 Registrar cambios
  if (data.estado !== ultimoEstado) {
    const li = document.createElement("li");
    li.textContent = `${new Date().toLocaleTimeString()} → ${data.estado} (${data.distancia?.toFixed(1) || "--"} cm)`;
    registroLista.prepend(li);
    ultimoEstado = data.estado;
  }
});
