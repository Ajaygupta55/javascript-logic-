class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.clear();
    }

    clear() {
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = undefined;
    }

    delete() {
        this.currentOperand = this.currentOperand.toString().slice(0, -1);
    }

    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        this.currentOperand = this.currentOperand.toString() + number.toString();
    }

    chooseOperation(operation) {
        if (this.currentOperand === '') return;
        if (this.previousOperand !== '') {
            this.compute();
        }
        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '';
    }

    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;

        switch (this.operation) {
            case '+': computation = prev + current; break;
            case '-': computation = prev - current; break;
            case '×': computation = prev * current; break;
            case '÷': computation = prev / current; break;
            default: return;
        }
        this.currentOperand = computation;
        this.operation = undefined;
        this.previousOperand = '';
    }
    
    handlePercentage() {
        if (this.currentOperand === '') return;
        this.currentOperand = parseFloat(this.currentOperand) / 100;
    }

    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;
        if (isNaN(integerDigits)) {
            integerDisplay = '';
        } else {
            integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
        }
        if (decimalDigits != null) {
            return `${integerDisplay}.${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
        if (this.operation != null) {
            this.previousOperandTextElement.innerText = 
                `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
        } else {
            this.previousOperandTextElement.innerText = '';
        }
    }
}

// HTML elements ko select karna
const previousOperandTextElement = document.querySelector('[data-previous-operand]');
const currentOperandTextElement = document.querySelector('[data-current-operand]');
const buttons = document.querySelectorAll('button');

const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement);

// Sabhi buttons par event listener lagana
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const buttonText = button.innerText;

        if (!isNaN(parseInt(buttonText)) || buttonText === '.' || buttonText === '00') {
            if (buttonText === '00') {
                calculator.appendNumber('0');
                calculator.appendNumber('0');
            } else {
                calculator.appendNumber(buttonText);
            }
        } else if (buttonText === 'AC') {
            calculator.clear();
        } else if (buttonText === '⌫') {
            calculator.delete();
        } else if (buttonText === '=') {
            calculator.compute();
        } else if (buttonText === '%') {
            calculator.handlePercentage();
        } else {
            calculator.chooseOperation(buttonText);
        }
        
        calculator.updateDisplay(); // Har click ke baad display update karo
    });
});