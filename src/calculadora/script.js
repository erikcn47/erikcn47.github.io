const display = document.getElementById("display");

function appendNumber(number) {
  display.value += number;
}

function appendOperator(operator) {
  if (display.value === "") return;
  const lastChar = display.value.slice(-1);
  if ("+-*/".includes(lastChar)) return;
  display.value += operator;
}

function appendDot() {
  const lastNumber = display.value.split(/[\+\-\*\/]/).pop();
  if (!lastNumber.includes('.')) display.value += '.';
}

function clearDisplay() {
  display.value = "";
}

function deleteLast() {
  display.value = display.value.slice(0, -1);
}

function calculate() {
  try {
    display.value = eval(display.value);
  } catch {
    display.value = "Error";
  }
}