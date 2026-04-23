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
(function(a, b = 2, c) {
    console.log(a + b + c);
})(5, undefined, 7);