from lib.base.modules import *
from flask import Flask, jsonify, make_response, abort, request
from lib.base.general import ConfigItemReader, ConfigBaseReader
import time
import logging
import threading


class Rest(Basemodule):
    # ################################################################################
    # initialization of module and optional load of config files
    # ################################################################################
    def __init__(self, instance_queue, global_queue):

        self.logger = logging.getLogger('Hasip.rest')
        self.queue_identifier = 'rest'  # this is the 'module address'
        self.instance_queue = instance_queue  # worker queue to receive jobs
        self.global_queue = global_queue  # queue to communicate back to main thread
        self.items = ConfigItemReader()  # config item reader
        self.config = ConfigBaseReader().get_values()  # base config reader
        self.reply_cache = {}  # cache dictionary for catching replies to status requests of modules

        # ################################################################################
        # This method is for controlling all modules that are based on the switch template.
        # Only actions that are supported by the target module can be taken.
        # Takes the variables 'modname' and 'action' from the URL call and creates
        # a queue message out of it and sends it to the respective module.
        # In case the "get_status" action has been called the method waits for an answer of
        # the asked module and returns the payload from the "opt_args" part of the answer.
        #
        # Note: To get a match for the answer the replying module need fill out the "module_from"
        #       parameter with its own name including port!!!!  e.g. gpio1
        #
        # @return:     command confirmation or payload of "opt_args" from response in cas of "get_status".
        # ################################################################################


    # ################################################################################
    # main thread of this module file which runs in background and constantly
    # checks working queue for new tasks.
    # ################################################################################
    def worker(self):

        app = Flask(__name__)

        @app.route('/modules', methods=['GET'])
        def get_modules():
            mod_list = self.items.get_items_dict()
            dict1 = {}
            string = []
            for module in mod_list.keys():
                dict1['name'] = module
                try:
                    dict1['module_name'] = mod_list[module][0]
                    dict1['module_addr'] = mod_list[module][1]
                    dict1['type'] = mod_list[module][2]
                    dict1['cat'] = 'switches'#mod_list[module][3]
                except Exception as e:
                    self.logger.debug(e)
                string.append(dict1.copy())
                dict1.clear()
            return jsonify({'modules': string})


        @app.route('/modules/<string:module>', methods=['GET'])
        def get_module(module):
            mod_list = self.items.get_items_dict()  # getting module list from item file
            if module in mod_list.keys():
                rcpt = mod_list[module][0]  # setting receiving module from item file
                mid = mod_list[module][1]  # setting module id from item file
                msg = {  # creating queue message
                    'module_from_port': 0,
                    'module_from': 'rest',
                    'module_rcpt': rcpt,
                    'module_addr': mid,
                    'cmd': 'get_status',
                    'opt_args': ''
                }
                self.global_queue.put(msg)
                esc = 0
                self.logger.debug("Waiting for module answer")
                while not (rcpt + str(mid) in self.reply_cache.keys()):  # waiting until target module answer appears in worker queue
                    time.sleep(0.05)  # small break
                    esc = esc + 1
                    if esc == 20:
                        self.logger.error('No answer from module ' + str(rcpt) + ' received!')
                        abort(404)
                self.logger.debug("Module answer received")  #
                val = self.reply_cache[rcpt + str(mid)]  # storing answer from target
                del self.reply_cache[rcpt + str(mid)]  # removing answer from reply_cache
                return jsonify({'status': val})
            abort(404)


        @app.route('/modules/<string:module>/<string:action>', methods = ['PUT'])
        def update_module(module, action):
            mod_list = self.items.get_items_dict()  # getting module list from item file
            if module in mod_list.keys():
                rcpt = mod_list[module][0]  # setting receiving module from item file
                mid = mod_list[module][1]  # setting module id from item file
                msg = {  # creating queue message
                    'module_from_port': 0,
                    'module_from': 'rest',
                    'module_rcpt': rcpt,
                    'module_addr': mid,
                    'cmd': action,
                    'opt_args': ''
                }
                self.global_queue.put(msg)
                return jsonify( { rcpt: 'something happened ...... maybe?' } )
            abort(404)


        @app.route('/jobs', methods=['GET'])
        def get_jobs():
            rcpt = 'sched'  # setting receiving module from item file
            mid = 0  # setting module id from item file
            msg = {  # creating queue message
                'module_from_port': 0,
                'module_from': 'rest',
                'module_rcpt': rcpt,
                'module_addr': mid,
                'cmd': 'list_jobs',
                'opt_args': ''
            }
            self.global_queue.put(msg)
            esc = 0
            self.logger.debug(msg)
            self.logger.debug("Waiting for module answer")
            while not (rcpt + str(mid) in self.reply_cache.keys()):  # waiting until target module answer appears in worker queue
                time.sleep(0.05)  # small break
                esc = esc + 1
                if esc == 20:
                    self.logger.error('No answer from module ' + str(rcpt) + ' received!')
                    abort(404)
            self.logger.debug("Module answer received")  #
            val = self.reply_cache[rcpt + str(mid)]  # storing answer from target
            del self.reply_cache[rcpt + str(mid)]  # removing answer from reply_cache
            return jsonify({'status': val})


        @app.route('/jobs/create/<string:name>', methods = ['POST'])
        @app.route('/jobs/update/<string:name>', methods = ['POST'])
        def make_job(name):
            seconds = 10
            module = 'Pumpe1'
            action = 'set_on'
            string = {
                'module': module,
                'action': action,
                'name': name,
                'year': None,
                'month': None,
                'week': None,
                'day': None,
                'day_of_week': None,
                'hour': None,
                'minute': None,
                'second': seconds}

            mod_list = self.items.get_items_dict()  # getting module list from item file
            if module in mod_list.keys():
                rcpt = 'sched'   # setting receiving module from item file
                mid = mod_list[module][1]  # setting module id from item file
                msg = {  # creating queue message
                    'module_from_port': 0,
                    'module_from': 'rest',
                    'module_rcpt': rcpt,
                    'module_addr': mid,
                    'cmd': 'create',
                    'opt_args': string
                }
                self.global_queue.put(msg)
                self.logger.debug(msg)
            return "test"


        @app.route('/jobs/delete/<string:name>', methods = ['DELETE'])
        def delete_job(name):
            rcpt = 'sched'   # setting receiving module from item file
            mid = 0  # setting module id from item file
            msg = {  # creating queue message
                'module_from_port': 0,
                'module_from': 'rest',
                'module_rcpt': rcpt,
                'module_addr': mid,
                'cmd': 'delete',
                'opt_args': name
            }
            self.global_queue.put(msg)
            self.logger.debug(msg)
            return "test"


        @app.errorhandler(404)
        def not_found(error):
            return make_response(jsonify( { 'error': 'Not found' } ), 404)


        # ##############################################################################
        # Starting rest webserver in own thread otherwise it will block the
        # whole application
        # ##############################################################################

        t = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=80, debug=None))
        t.daemon = True
        t.start()

        while True:
            instance_queue_element = self.instance_queue.get(True)
            _senderport = instance_queue_element.get("module_from_port")
            _sender = instance_queue_element.get("module_from")
            _port = instance_queue_element.get("module_addr")
            _action = instance_queue_element.get("cmd")
            _optargs = instance_queue_element.get("opt_args")

            self.reply_cache[_sender + str(_senderport)] = _optargs
