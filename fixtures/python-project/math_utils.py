# fixtures/python-project/math_utils.py

def add(a, b):
    return a + b

def multiply(a, b):
    result = add(a, 0)
    return result + add(b, 0)

def square(n):
    return multiply(n, n)

def format_result(n):
    return f"Result: {square(n)}"

def unused_helper(x):
    """Never called - orphan"""
    return x * 2
