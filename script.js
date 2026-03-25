//Mapa 1
var map = L.map("map").setView([20, 0], 2); //Cogemos el elemento "map" del HTML para pintarlo. Con setView, centramos el mapa ([lat, lon], zoom)
let markersMapa1 = []; // Array global para los markers del mapa 1
markTerremotos(map, null, markersMapa1, true); //Llamamos a la función para marcar todos los terremotos en el mapa 1

//Capa del mapa 1
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

//Funcionalidad botón mostrar todos los terremotos en el mapa 1
const botonTodosTerremotos = document.getElementById("boton-todos-terremotos");
botonTodosTerremotos.addEventListener("click", () => {
  markTerremotos(map, null, markersMapa1, true);
});

//Funcionalidad botón mostrar terremotos favoritos en el mapa 1
const botonFavoritos = document.getElementById("boton-favoritos");
botonFavoritos.addEventListener("click", async () => {
  try {
    //Eliminamos los markers actuales
    markersMapa1.forEach((marker) => marker.remove());
    markersMapa1 = [];

    //Obtenemos los favoritos de Firestore y guardamos en favoritosArray
    const favoritosArray = [];
    const querySnapshot = await db.collection("favoritos").get();
    querySnapshot.forEach((favorito) => {
      favoritosArray.push(favorito.data());
    });

    //Mostramos los favoritos en el mapa
    markTerremotos(map, favoritosArray, markersMapa1, true);
  } catch (error) {
    console.error(error);
  }
});

//Mapa 2
var map2 = L.map("map2").setView([20, 0], 2); //Cogemos el elemento "map" del HTML para pintarlo. Con setView, centramos el mapa ([lat, lon], zoom)
let markersMapa2 = []; //Array global para los markers del mapa 2

//Capa del mapa 2
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map2);

//Filtrado por magnitud mapa 2
const inputMagnitud = document.getElementById("input-magnitud");

inputMagnitud.addEventListener("input", async () => {
  const terremotos = await getTerremotos();
  const inputValor = inputMagnitud.value; //Guardamos el valor introducido en el input del HTML
  let terremotosFiltrados;

  if (inputValor === "") {
    //Si no hay valor introducido en el input, creamos un array vacío para que no se muestre nada
    terremotosFiltrados = [];
  } else {
    //Si hay valor introducido en el input, filtramos
    terremotosFiltrados = terremotos.filter((terremoto) => {
      return (
        //Filtramos el array completo de terremotos y nos quedamos con los que no tengan la propiedad Magnitud vacía y comiencen por el valor introducido en el input (para sacar también los decimales)
        terremoto.magnitud != null &&
        terremoto.magnitud.toString().startsWith(inputValor)
      );
    });
  }

  //Se borran los marcadores guardados tanto del mapa como del array
  markersMapa2.forEach((marker) => map2.removeLayer(marker));
  markersMapa2 = [];

  //Llamamos a la función para marcar los terremotos en el mapa
  markTerremotos(map2, terremotosFiltrados, markersMapa2);
});

//Filtrado por fechas mapa 2
const inputFechaInicio = document.getElementById("input-fecha-inicio");
const inputFechaFin = document.getElementById("input-fecha-fin");

inputFechaInicio.addEventListener("change", filterFechas);
inputFechaFin.addEventListener("change", filterFechas);
async function filterFechas() {
  try {
    //Verificamos que tanto en inputFechaInicio como inputFechaFin se haya seleccionado algún valor y no estén vacíos
    if (!inputFechaInicio.value || !inputFechaFin.value) return;

    const fechaInicio = normalizeDate(inputFechaInicio.value); //Convertimos el input en objeto fecha y hora 00:00
    const fechaFin = normalizeDate(inputFechaFin.value); //Convertimos el input en objeto fecha y hora 00:00
    const fechaActual = new Date(); //Convertimos en objeto la fecha actual

    if (fechaInicio > fechaFin)
      alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
    if (fechaInicio > fechaActual)
      alert("La fecha de inicio no puede ser mayor a la fecha actual");
    if (fechaFin > fechaActual)
      alert("La fecha de fin no puede ser mayor a la fecha actual");

    if (
      fechaInicio > fechaFin ||
      fechaInicio > fechaActual ||
      fechaFin > fechaActual
    )
      return; //Si alguna de las fechas input es mayor a la fecha actual, o si la fecha inicio es mayor a la de fin, paramos la función

    const terremotos = await getTerremotos();
    terremotosFiltrados = terremotos.filter((terremoto) => {
      return (
        normalizeDate(terremoto.fecha_inicio) >= fechaInicio &&
        normalizeDate(terremoto.fecha_fin) <= fechaFin
      );
    });

    markersMapa2.forEach((marker) => map2.removeLayer(marker));
    markersMapa2 = [];

    markTerremotos(map2, terremotosFiltrados, markersMapa2);
  } catch (error) {
    console.error(error);
  }
}

//Función para recoger los datos de los terremotos de la API
async function getTerremotos() {
  try {
    const data = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    ).then((res) => res.json());

    return data.features.map((terremoto) => ({
      titulo: terremoto.properties.title,
      fecha_inicio: new Date(terremoto.properties.time), //Con new Date pasamos el valor de timestampt (API) a objeto fecha
      fecha_fin: new Date(terremoto.properties.updated), //Con new Date pasamos el valor de timestampt (API) a objeto fecha
      ubicacion: terremoto.properties.place,
      codigo: terremoto.id,
      magnitud: terremoto.properties.mag,
      coordenadas: [
        terremoto.geometry.coordinates[1], //A la hora de guardar las coordenadas de la API en nuestro array, invertimos de posición latitud y longitud ya que Leaflet necesita el formato inverso [latitud, longitud]
        terremoto.geometry.coordinates[0],
      ],
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

//Función para marcar los terremotos y añadir popups de los terremotos en el mapa
async function markTerremotos(
  mapa,
  terremotos = null,
  markers,
  esMapa1 = false,
) {
  try {
    if (!terremotos) {
      //Si no se pasan terremotos, obtenemos todos
      terremotos = await getTerremotos();
    }

    //Dependiendo la magnitud de cada terremoto, el marcador tendrá un color u otro
    for (let terremoto of terremotos) {
      let colorMarcador;
      if (terremoto.magnitud < 1) colorMarcador = "#F0F0F0";
      else if (terremoto.magnitud < 2) colorMarcador = "#008000";
      else if (terremoto.magnitud < 3) colorMarcador = "#808000";
      else if (terremoto.magnitud < 4) colorMarcador = "#FFFF00";
      else if (terremoto.magnitud < 5) colorMarcador = "#F0E130";
      else if (terremoto.magnitud < 6) colorMarcador = "#FFA500";
      else if (terremoto.magnitud < 7) colorMarcador = "#FF0000";
      else if (terremoto.magnitud >= 7) colorMarcador = "#FF00FF";

      //Marcador
      var marker = L.circleMarker(
        [terremoto.coordenadas[0], terremoto.coordenadas[1]],
        {
          fillColor: colorMarcador, //Color relleno marcador
          fillOpacity: 1, //Opacidad relleno marcador
          color: "#000", //Color borde marcador
          opacity: 1, //Opacidad borde marcador
        },
      ).addTo(mapa);

      //Popup del marcador
      marker.bindPopup(`
        <b>${terremoto.titulo}</b><br>
        Fecha inicio: ${terremoto.fecha_inicio.toLocaleString()}<br>
        Fecha fin: ${terremoto.fecha_fin.toLocaleString()}<br>
        Ubicación: ${terremoto.ubicacion}<br>
        Código: ${terremoto.codigo}<br>
        Magnitud: ${terremoto.magnitud}<br>
        ${esMapa1 ? `<button>Favorito</button>` : ""} `); //Si es mapa1, creamos el botón favorito en el popup

      //Funcionalidad boton añadir favorito a Firestore
      marker.on("popupopen", (event) => {
        //Cuando se abra el popup del marcador del terremoto
        const botonFavorito = event.popup._contentNode.querySelector("button"); //Guardamos el boton favorito en una variable
        botonFavorito.addEventListener("click", () => {
          db.collection("favoritos") //Añadimos a coleccion favoritos de firestore
            .add({
              titulo: terremoto.titulo,
              fecha_inicio: terremoto.fecha_inicio.toLocaleString(),
              fecha_fin: terremoto.fecha_fin.toLocaleString(),
              ubicacion: terremoto.ubicacion,
              codigo: terremoto.codigo,
              magnitud: terremoto.magnitud,
              coordenadas: terremoto.coordenadas,
            });
        });
      });

      //Añadimos cada marcador al array
      markers.push(marker);
    }
  } catch (error) {
    console.error(error);
  }
}

//Función para convertir a objeto fecha y aplicar hora 00:00h
function normalizeDate(date) {
  const fecha = new Date(date);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

//FIREBASE

//Configuración proyecto firebase
const firebaseConfig = {
  apiKey: "AIzaSyCPkI7rlte3aSt-xv9e-mXSbpuS72CQqps",
  authDomain: "primer-proyecto-51aae.firebaseapp.com",
  projectId: "primer-proyecto-51aae",
  storageBucket: "primer-proyecto-51aae.firebasestorage.app",
  messagingSenderId: "656011203905",
  appId: "1:656011203905:web:0315fc3d8b18ed6edc7dc0",
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();

// Inicializar Auth
const auth = firebase.auth();

