//Creamos el mapa
var map = L.map("map").setView([20, 0], 2); //Cogemos el elemento "map" del HTML para pintarlo. Con setView, centramos el mapa ([lat, lon], zoom)
markTerremotos(); //Llamamos a la función para marcar los elementos en el mapa

//Capa
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

//Función recoger los datos que necesitamos de los terremotos de la API
async function getTerremotos() {
  try {
    const data = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    ).then((res) => res.json());

    return data.features.map((terremoto) => ({
      Titulo: terremoto.properties.title,
      Fecha: new Date(terremoto.properties.time),
      Ubicación: terremoto.properties.place,
      Código: terremoto.id,
      Magnitud: terremoto.properties.mag,
      Coordenadas: [
        terremoto.geometry.coordinates[1], //A la hora de guardar las coordenadas de la API en nuestro array, invertimos de posición latitud y longitud ya que Leaflet necesita formato [latitud, longitud]
        terremoto.geometry.coordinates[0],
      ],
    }));
  } catch (error) {
    console.log(error);
    return [];
  }
}
// getTerremotos().then((resultado) => console.log(resultado));

//Función marcar terremotos en el mapa
async function markTerremotos() {
  try {
    const terremotos = await getTerremotos();
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

      var marker = L.circleMarker(
        [terremoto.Coordenadas[0], terremoto.Coordenadas[1]],
        {
          fillColor: colorMarcador,
          fillOpacity: 1,
          color: "#000",
          opacity: 1,
        },
      ).addTo(map);

      marker.bindPopup(`
      <b>${terremoto.Titulo}</b><br>
      Fecha: ${terremoto.Fecha.toLocaleString()}<br>
      Ubicación: ${terremoto.Ubicación}<br>
      Código: ${terremoto.Código}<br>
      Magnitud: ${terremoto.Magnitud}<br>
    `);
    }
  } catch (error) {
    console.log(error);
  }
}
