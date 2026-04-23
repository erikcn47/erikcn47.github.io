let result = function(name, year, formatter) {
    let copyright = formatter(name, year);
    return copyright;
};

let formatter = function(name, year) {
    return name + " | " + year;
}

console.log(result("Erik", 2026, formatter));