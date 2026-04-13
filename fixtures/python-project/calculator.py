from math_utils import format_result, add

class Calculator:
    def __init__(self):
        self.history = []

    def compute(self, n):
        result = format_result(n)
        self.history.append(result)
        return result

    def get_history(self):
        return self.history

    def sum(self, a, b):
        return add(a, b)

def run_calculator(n):
    calc = Calculator()
    print(calc.compute(n))
