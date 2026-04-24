//Creo una función llamada 'result' que recibe un nombre, un año y una función de formato.
// Dentro de 'result', uso la función de formato para crear un copyright y lo devuelvo.
let result = function(name, year, formatter) {
    // Llamo a la función de formato con el nombre y el año para obtener el copyright.
    let copyright = formatter(name, year);
    return copyright;
};

// Ahora defino la función 'formatter' que junta el nombre y el año con una barra que los separa.
let formatter = function(name, year) {
    return name + " | " + year;
}

//Ejecuto la función con los datos que yo quiero y el formato que he definido, y luego imprimo el resultado en la consola.
console.log(result("Erik", 2026, formatter));