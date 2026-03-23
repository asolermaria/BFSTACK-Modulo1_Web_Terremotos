//Mapa 1
var map = L.map("map").setView([20, 0], 2); //Cogemos el elemento "map" del HTML para pintarlo. Con setView, centramos el mapa ([lat, lon], zoom)
markTerremotos(map); //Llamamos a la función para marcar todos los terremotos en el mapa

//Capa del mapa 1
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

//Función para recoger los datos que necesitamos de todos los terremotos de la API
async function getTerremotos() {
  try {
    const data = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    ).then((res) => res.json());

    return data.features.map((terremoto) => ({
      Titulo: terremoto.properties.title,
      Fecha_inicio: new Date(terremoto.properties.time),
      Fecha_fin: new Date(terremoto.properties.updated),
      Ubicación: terremoto.properties.place,
      Código: terremoto.id,
      Magnitud: terremoto.properties.mag,
      Coordenadas: [
        terremoto.geometry.coordinates[1], //A la hora de guardar las coordenadas de la API en nuestro array, invertimos de posición latitud y longitud ya que Leaflet necesita el formato inverso [latitud, longitud]
        terremoto.geometry.coordinates[0],
      ],
    }));
  } catch (error) {
    console.log(error);
    return [];
  }
}

//Función para marcar los terremotos y añadir popups de los terremotos en el mapa
async function markTerremotos(mapa, terremotos = null, markersArray = []) {
  try {
    if (!terremotos) {
      //Si no se pasan terremotos, obtenemos todos
      terremotos = await getTerremotos();
    }

    //Dependiendo la magnitud de cada terremoto, el marcador tendrá un color u otro
    for (let terremoto of terremotos) {
      let colorMarcador;
      if (terremoto.Magnitud < 1) colorMarcador = "#F0F0F0";
      else if (terremoto.Magnitud < 2) colorMarcador = "#008000";
      else if (terremoto.Magnitud < 3) colorMarcador = "#808000";
      else if (terremoto.Magnitud < 4) colorMarcador = "#FFFF00";
      else if (terremoto.Magnitud < 5) colorMarcador = "#F0E130";
      else if (terremoto.Magnitud < 6) colorMarcador = "#FFA500";
      else if (terremoto.Magnitud < 7) colorMarcador = "#FF0000";
      else if (terremoto.Magnitud >= 7) colorMarcador = "#FF00FF";

      //Marcador
      var marker = L.circleMarker(
        [terremoto.Coordenadas[0], terremoto.Coordenadas[1]],
        {
          fillColor: colorMarcador, //Color relleno marcador
          fillOpacity: 1, //Opacidad relleno marcador
          color: "#000", //Color borde marcador
          opacity: 1, //Opacidad borde marcador
        },
      ).addTo(mapa);

      //Popup del marcador
      marker.bindPopup(`
        <b>${terremoto.Titulo}</b><br>
        Fecha inicio: ${terremoto.Fecha_inicio.toLocaleString()}<br>
        Fecha fin: ${terremoto.Fecha_fin.toLocaleString()}<br>
        Ubicación: ${terremoto.Ubicación}<br>
        Código: ${terremoto.Código}<br>
        Magnitud: ${terremoto.Magnitud}<br>
        `);

      //Añadimos cada marcador al array
      markersArray.push(marker);
    }
  } catch (error) {
    console.log(error);
  }
}

//Mapa 2
var map2 = L.map("map2").setView([20, 0], 2); //Cogemos el elemento "map" del HTML para pintarlo. Con setView, centramos el mapa ([lat, lon], zoom)

//Capa del mapa 2
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map2);

//Filtrado por magnitud
const inputMagnitud = document.getElementById("input-magnitud");
let markers = []; //Array donde se van a guardar los marcadores de los terremotos filtrados
inputMagnitud.addEventListener("input", async () => {
  const terremotos = await getTerremotos();
  const inputValor = inputMagnitud.value; //Guardamos el valor introducido en el input del HTML
  let terremotosFiltrados;

  if (inputValor === "") {
    //Si no hay valor introducido en el input, creamos un array vacío para que no se muestre nada
    terremotosFiltrados = [];
  } else {
    //Si hay valor introducido en el input, filtramos

    //Convertimos a número el valor introducido en el input
    const inputNumero = Number(inputValor);
    terremotosFiltrados = terremotos.filter((terremoto) => {
      return (
        //Filtramos el array completo de terremotos y nos quedamos con los que no tengan la propiedad Magnitud vacía y comiencen por el valor introducido en el input (para sacar también los decimales)
        terremoto.Magnitud != null &&
        terremoto.Magnitud.toString().startsWith(inputNumero)
      );
    });
  }

  //Cada vez que cambia el input, se borran los marcadores guardados tanto del mapa como del array
  markers.forEach((marker) => map2.removeLayer(marker));
  markers = [];

  //Llamamos a la función para marcar los terremotos en el mapa
  markTerremotos(map2, terremotosFiltrados, markers);
});

//Filtrado por fechas
const inputFechaInicio = document.getElementById("input-fecha-inicio");
const inputFechaFin = document.getElementById("input-fecha-fin");

//Función para convertir a objeto fecha y aplicar hora 00:00h
function normalizeDate(date) {
  const fecha = new Date(date);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}


inputFechaInicio.addEventListener("change", comprobarFechas);
inputFechaFin.addEventListener("change", comprobarFechas);

async function comprobarFechas() {
  //Verificamos que tanto en inputFechaInicio como inputFechaFin se haya seleccionado algún valor y no estén vacíos
  if (!inputFechaInicio.value || !inputFechaFin.value) return;

  const fechaInicio = normalizeDate(inputFechaInicio.value); //Convertimos el input en objeto fecha y hora 00:00
  const fechaFin = normalizeDate(inputFechaFin.value); //Convertimos el input en objeto fecha y hora 00:00
  const fechaActual = new Date(); //Convertimos en objeto la fecha actual

  if (fechaInicio > fechaFin) {
    alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
    return;
  }

  if (fechaInicio > fechaActual || fechaFin > fechaActual) {
    if (fechaInicio > fechaActual) {
      alert("La fecha de inicio no puede ser mayor a la fecha actual");
    }
    if (fechaFin > fechaActual) {
      alert("La fecha de fin no puede ser mayor a la fecha actual");
    }
    return;
  }

  const terremotos = await getTerremotos();
  terremotosFiltrados = terremotos.filter((terremoto) => {
    return (
      normalizeDate(new Date(terremoto.Fecha_inicio)) >= fechaInicio &&
      normalizeDate(new Date(terremoto.Fecha_fin)) <= fechaFin
    );
  });

  markers.forEach((marker) => map2.removeLayer(marker));
  markers = [];

  markTerremotos(map2, terremotosFiltrados, markers);
}
