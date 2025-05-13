import time
import machine
import network
import urequests
import ujson
from machine import Pin, ADC, time_pulse_us
import socket
import select

# Set up ultrasonic sensor
TRIG = Pin(5, Pin.OUT)  # D1
ECHO = Pin(4, Pin.IN)   # D2

# Set up current sensor (connect to A0)
current_sensor = ADC(0)

# Set up GPIO pin for sending signal (+)
signal_pin = Pin(12, Pin.OUT)  # You can use any available GPIO pin, here we use D6 (GPIO12)
battery_pin = Pin(13, Pin.OUT)  # You can use any available GPIO pin, here we use D7 (GPIO12)

# Wi-Fi setup
ssid = 'fusion'
password = '12345678'

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connecting to WiFi...")
        wlan.connect(ssid, password)
        while not wlan.isconnected():
            time.sleep(1)
    print("Connected to WiFi, IP:", wlan.ifconfig()[0])

# Function to measure distance
def measure_distance():
    TRIG.value(0)
    time.sleep_us(2)
    TRIG.value(1)
    time.sleep_us(10)
    TRIG.value(0)

    pulse_duration = time_pulse_us(ECHO, 1)

    if pulse_duration < 0:
        print("Invalid pulse duration")
        return -1
    distance = (pulse_duration * 0.0343) / 2
    return distance

# Function to measure current
def measure_current():
    adc_value = current_sensor.read()
    print("adc_value",adc_value)
    voltage = (adc_value / 1023.0) * 3.3
    voltage_offset = 0 #1.758  # Based on your sensor's actual no-current output
    sensitivity = 0.185     # ACS712-5A sensitivity in V/A

    current = (voltage - voltage_offset) / sensitivity
    return current * 1000  # Return in milliamps

# Function to calculate power
def calculate_power(current_mA):
    voltage = 5.0
    current_A = current_mA / 1000
    power = current_A * voltage
    power_mW = power * 1000
    return power_mW

# Send data to Node.js server
def send_data(battery, current, power):
    url = 'http://192.168.59.55:3000/data'
    headers = {'Content-Type': 'application/json'}
    data = ujson.dumps({'battery': battery, 'current': current, 'power': power})
    try:
        response = urequests.post(url, data=data, headers=headers)
        print("Data Sent:", data)
        print("Response:", response.text)
    except Exception as e:
        print("Error sending data:", e)

# Control GPIO based on battery
def check_battery_and_send_signal(distance):
    battery_percentage = (distance / 85) * 100
    if battery_percentage >= 100:
        battery_pin.value(1)
        return 100
    else:
        battery_pin.value(0)
        return battery_percentage

# Handle HTTP request to trigger signal manually
def handle_request(conn):
    request = conn.recv(1024)
    request = str(request)
    print("Received request:", request)

    if "POST /trigger" in request:
        signal_pin.value(1)
        time.sleep(1)
        signal_pin.value(0)
        response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nSignal sent"
    else:
        response = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot Found"

    conn.send(response)
    conn.close()

# Main loop without using _thread
def main():
    connect_wifi()

    while True:
        distance = measure_distance()
        if distance == -1:
            print("Invalid distance reading, skipping...")
            continue

        current = measure_current()
        power = calculate_power(current)
        battery = check_battery_and_send_signal(distance)
        send_data(battery, current, power)

        time.sleep(1)

main()


