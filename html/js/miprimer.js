//mi primer archivo js
/*let myName="Erik";
console.log(myName);
console.log(typeof(myName));
let edad=7;
console.log(typeof(edad));
let edadString=String(edad); // realizo la operación de Casting
console.log("He cambiado el tipo de la variable");
console.log(edadString);
console.log(typeof(edadString));
const PI = 3.1416;*/

//FUNCIONES AUTOINVOCADAS
//Esta función coge tres parametros y los suma, hacemos también que el segundo parámetro tenga un valor por defecto de 2, si no se le asigna ningún valor a ese parámetro, se le asignará el valor por defecto
(function(a, b = 2, c) {
    console.log(a + b + c);
})(5, undefined, 7);
//Aquí lo que hacemos es llamar a la función inmediatamente después de definirla, pasándole los argumentos necesarios para que se ejecute correctamente. En este caso, el resultado de la suma será 14 (5 + 2 + 7).