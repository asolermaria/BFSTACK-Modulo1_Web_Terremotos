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
    const user = auth.currentUser;
    //Si no hay usuario logueado en la sesión
    if (!user) {
      alert("Debes iniciar sesión para ver tus favoritos");
      return;
    }

    //Eliminamos los markers actuales
    markersMapa1.forEach((marker) => marker.remove());
    markersMapa1 = [];

    //Obtenemos los favoritos del usuario de Firestore y guardamos en favoritosArray
    const favoritosArray = [];
    const querySnapshot = await db
      .collection("favoritos")
      .where("uid", "==", user.uid)
      .get();

    querySnapshot.forEach((doc) => {
      favoritosArray.push({
        //Guardamos en el array todas las propiedades del terremoto guardado en Firestore
        id: doc.id,
        ...doc.data(),
      });
    });

    //Mostramos los favoritos del usuario en el mapa
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
    //Verificamos que tanto en inputFechaInicio como inputFechaFin se haya seleccionado algún valor
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
        <b>${terremoto.titulo}</b><br><br>
        Fecha inicio: ${terremoto.fecha_inicio.toLocaleString()}<br><br>
        Fecha fin: ${terremoto.fecha_fin.toLocaleString()}<br><br>
        Ubicación: ${terremoto.ubicacion}<br><br>
        Código: ${terremoto.codigo}<br><br>
        Magnitud: ${terremoto.magnitud}<br><br>
        ${esMapa1 ? `<button>Favorito</button>` : ""} `); //Si es mapa1, creamos el botón favorito en el popup

      //Funcionalidad boton añadir favorito a Firestore
      marker.on("popupopen", (event) => {
        //Cuando se abra el popup del marcador del terremoto
        const botonFavorito = event.popup._contentNode.querySelector("button"); //Guardamos el boton favorito en una variable
        botonFavorito.addEventListener("click", async () => {
          //Cuando se haga click en el botón para añadir el terremoto a favoritos
          const user = auth.currentUser; //Guardamos el usuario actual de la sesión en una variable
          if (!user) {
            alert("Debes iniciar sesión para añadir favoritos");
            return;
          }
          //Guardamos en la variable query si el usuario ya ha guardado ese terremoto como favorito
          const query = await db
            .collection("favoritos")
            .where("uid", "==", user.uid)
            .where("codigo", "==", terremoto.codigo)
            .get();
          if (!query.empty) {
            //Si hay datos en la variable query (el usuario ya ha guardado ese terremoto como favorito)
            alert("Este terremoto ya está en favoritos");
            return;
          }
          //Si el terremoto no se ha añadido a favoritos, lo guardamos:
          db.collection("favoritos") //Añadimos a coleccion favoritos de firestore
            .add({
              uid: user.uid,
              titulo: terremoto.titulo,
              fecha_inicio: terremoto.fecha_inicio.toLocaleString(),
              fecha_fin: terremoto.fecha_fin.toLocaleString(),
              ubicacion: terremoto.ubicacion,
              codigo: terremoto.codigo,
              magnitud: terremoto.magnitud,
              coordenadas: terremoto.coordenadas,
            });
          alert("Terremoto añadido a favoritos");
          //Deshabilitamos el boton y le cambiamos el texto
          botonFavorito.textContent = "Terremoto favorito ⭐";
          botonFavorito.disabled = true;
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
const app = firebase.initializeApp(firebaseConfig); //Inicializar Firebase
const db = firebase.firestore(); //Inicializar Firestore
const auth = firebase.auth(); //Inicializar Auth

//Registro de usuario en Firebase Auth
//Firebase Auth hace validaciones automáticas:
// - El correo debe tener @ y un dominio válido.
// - No permite crear dos usuarios con el mismo correo.
// - La contraseña debe tener al menos 6 caracteres.
const formRegistro = document.getElementById("form-registro");
formRegistro.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("correo").value;
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  //Validamos si las contraseñas coinciden
  if (password !== password2) {
    alert("Las contraseñas no coinciden");
    return;
  }
  try {
    //Crear usuario en Firebase Auth
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password,
    );
    alert("Registro exitoso");
    formRegistro.reset();

    //Guardar datos del usuario en Firestore en la coleccion usuarios
    await db.collection("usuarios").doc(userCredential.user.uid).set({
      //El documento será el id del usuario
      email: email, //El documento contendrá el correo del usuario
    });
  } catch (error) {
    console.error(error);
    alert(error);
  }
});

//Inicio de sesión de usuario en Firebase Auth
const formLogin = document.getElementById("form-inicio-sesion");
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("correo2").value;
  const password = document.getElementById("password3").value;

  try {
    //Iniciar sesión en Firebase Auth
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password,
    );
    alert("Inicio de sesión exitoso");
    formLogin.reset();
  } catch (error) {
    console.error(error);
    alert(error);
  }
});

//Cerrar sesión de usuario en Firebase Auth
document.getElementById("cerrar-sesion").addEventListener("click", async () => {
  try {
    await auth.signOut(); //Cierra la sesión
    alert("Sesión cerrada");

    markersMapa1.forEach((marker) => marker.remove());
    markersMapa1 = []; //Borramos los marcadores del mapa 1 y el array de marcadores
  } catch (error) {
    console.error(error);
  }
});

//Listener de estado del usuario
auth.onAuthStateChanged((user) => {
  //Revisa si hay un usuario en la sesión
  const botonLogout = document.getElementById("cerrar-sesion");
  const nombreUsuario = document.getElementById("nombre-usuario");
  if (user) {
    //Si hay usuario en la sesión
    botonLogout.style.display = "block"; //Mostramos botonLogout en el HTML
    nombreUsuario.textContent = "Bienvenid@, " + user.email + " !";
    nombreUsuario.style.display = "block"; //Mostramos el correo del usuario en el HTML
  } else {
    //Si no, los ocultamos
    botonLogout.style.display = "none";
    nombreUsuario.style.display = "none";
  }
});
