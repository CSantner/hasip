from lib.base.modules import *
import RPi.GPIO
import os
import time
import logging


class Gpio(Basemodule, Switch):
    # ################################################################################
    # initialization of module and optional load of config files
    # ################################################################################
    def __init__(self, instance_queue, global_queue):
        #
        # uncomment block below on a pi as it only works there. Otherwise you will get errors
        #
        self.GPIO = RPi.GPIO
        self.GPIO.setwarnings(False)
        self.GPIO.setmode(self.GPIO.BOARD)

        self.logger = logging.getLogger('Hasip.gpio')
        self.queue_identifier = 'gpio'  # this is the 'module address'
        self.instance_queue = instance_queue  # worker queue to receive jobs
        self.global_queue = global_queue  # queue to communicate back to main thread
        self.ports = [  # internal port names
                        {
                            'id': 0,
                            'status': 'off',
                            'pin': 3,
                            'mode': 'out'
                        }, {
                            'id': 1,
                            'status': 'off',
                            'pin': 5,
                            'mode': 'out'
                        }, {
                            'id': 2,
                            'status': 'off',
                            'pin': 7,
                            'mode': 'out'
                        }, {
                            'id': 3,
                            'status': 'off',
                            'pin': 8,
                            'mode': 'out'
                        }, {
                            'id': 4,
                            'status': 'off',
                            'pin': 10,
                            'mode': 'out'
                        }, {
                            'id': 5,
                            'status': 'off',
                            'pin': 11,
                            'mode': 'out'
                        }, {
                            'id': 6,
                            'status': 'off',
                            'pin': 12,
                            'mode': 'out'
                        }, {
                            'id': 7,
                            'status': 'off',
                            'pin': 13,
                            'mode': 'out'
                        }, {
                            'id': 8,
                            'status': 'off',
                            'pin': 15,
                            'mode': 'out'
                        }, {
                            'id': 9,
                            'status': 'off',
                            'pin': 16,
                            'mode': 'out'
                        }, {
                            'id': 10,
                            'status': 'off',
                            'pin': 18,
                            'mode': 'out'
                        }, {
                            'id': 11,
                            'status': 'off',
                            'pin': 19,
                            'mode': 'out'
                        }, {
                            'id': 12,
                            'status': 'off',
                            'pin': 21,
                            'mode': 'out'
                        }, {
                            'id': 13,
                            'status': 'off',
                            'pin': 22,
                            'mode': 'out'
                        }, {
                            'id': 14,
                            'status': 'off',
                            'pin': 23,
                            'mode': 'out'
                        }, {
                            'id': 15,
                            'status': 'off',
                            'pin': 24,
                            'mode': 'out'
                        }, {
                            'id': 16,
                            'status': 'off',
                            'pin': 26,
                            'mode': 'out'
                        }, {}]  # defining internal ports here (...)


    # ################################################################################
    # main thread of this module file which runs in background and constanly
    # checks working queue for new tasks.
    # ################################################################################
    def worker(self):
        while True:
            instance_queue_element = self.instance_queue.get(True)

            _senderport = instance_queue_element.get("module_from_port")
            _sender = instance_queue_element.get("module_from")
            _port = instance_queue_element.get("module_addr")
            _action = instance_queue_element.get("cmd")
            _optargs = instance_queue_element.get("opt_args")

            options = {
                "get_status": self.get_status,
                "set_on": self.set_on,
                "set_off": self.set_off,
                "sensor_data": self.sensor_data
            }

            options[_action](_sender, _senderport, _port, _optargs)

    # ################################################################################
    #
    # "private" methods from here on...
    #
    # ################################################################################

    # ################################################################################
    # shows status of port provided by argument and replies with a queue message
    # to the requesting module
    # @arguments:  port, sender
    # @return:     -
    # ################################################################################
    def get_status(self, sender, senderport, port, optargs):
        args = str(self.ports[port]['status'])
        queue_msg = {
            'module_from_port': str(port),
            'module_from': self.queue_identifier,
            'module_rcpt': sender,
            'module_addr': senderport,
            'cmd': 'reply',
            'opt_args': args
        }
        self.global_queue.put(queue_msg)

    # ################################################################################
    # sets the port provided by @argument to on
    #
    # @arguments:  port, sender
    # @return:     -
    # ################################################################################
    def set_on(self, sender, senderport, port, optargs):

        if self.ports[port]['mode'] == 'out':
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.OUT)
            self.GPIO.output(self.ports[port]['pin'], self.GPIO.HIGH)

        if self.ports[port]['mode'] == 'in':
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.IN)
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.HIGH)

        self.logger.debug("GPIO Port (" + str(port) + ") set to on")
        self.ports[port]['status'] = 'on'


    # ################################################################################
    # sets the port provided by @agrument to off
    #
    # @arguments:  port, sender
    # @return:     -
    # ################################################################################
    def set_off(self, sender, senderport, port, optargs):

        if self.ports[port]['mode'] == 'out':
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.OUT)
            self.GPIO.output(self.ports[port]['pin'], self.GPIO.LOW)

        if self.ports[port]['mode'] == 'in':
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.IN)
            self.GPIO.setup(self.ports[port]['pin'], self.GPIO.LOW)

        self.logger.debug("GPIO Port (" + str(port) + ") set to off")
        self.ports[port]['status'] = 'off'


    def sensor_data(self, sender, senderport, port, optargs):
        value = False
        while value == False:
            i = 0
            f = os.popen('/home/Adafruit-Raspberry-Pi-Python-Code/Adafruit_DHT_Driver/Adafruit_DHT 11 4')

            while i < 3:
                line = f.readline()
                i += 1
            temperature = line[line.find("Temp")+7:line.find(" *C")]
            humidity = line[line.find("Hum")+6:line.find(" %")]
	    self.logger.debug("Temperature: " + temperature)
	    self.logger.debug("Humidity: " + humidity)
            if temperature != '':
                value = True
        args = {
            'Temperature': temperature,
            'Humidity': humidity
        }
        queue_msg = {
            'module_from_port': str(port),
            'module_from': self.queue_identifier,
            'module_rcpt': sender,
            'module_addr': senderport,
            'cmd': 'reply',
            'opt_args': args
        }
        self.global_queue.put(queue_msg)
