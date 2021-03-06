#!/usr/bin/env python

# import of standard libs
import time
import Queue
import threading
import logging


# import of project specific libs
from lib.base.general import ConfigItemReader, ConfigBaseReader, Log
import lib.modules

class Hasip(object):

  def __init__(self):

    self.config_items = ConfigItemReader()
    self.config_hasip = ConfigBaseReader()

    self.global_queue = Queue.Queue()

    self.log = Log()
    self.logger = logging.getLogger('Hasip.main')

    # dynamically creation of communication queues and instances of all used
    # modules. Afterwards a worker of each module is started in background and
    # is waiting for jobs on the incomming queue.
    #
    # (1) create a temp dictionary
    # (2) add a module specific communication queue
    # (3) capitalize & create instance for used module
    # (4) as params we give: "global_queue" and the previously created queue
    # (5) start "worker" of each module in background
    #

    # list of 'modules' to start
    modules_to_start =  []
    modules_to_start += self.config_items.modules_items()
    modules_to_start += self.config_hasip.modules_services()

    self.modules = {}
    for module_name in modules_to_start:
      self.modules[module_name] = {}                                      # (1)
      self.modules[module_name]["instance_queue"] = Queue.Queue()         # (2)
      self.modules[module_name]["instance_object"] = eval(
        "lib.modules." + module_name.capitalize()                         # (3)
      ) (self.modules[module_name]["instance_queue"], self.global_queue)  # (4)

      t = threading.Thread(                                               # (5)
        target = self.modules[module_name]["instance_object"].worker
      )

      self.logger.debug('Loaded Module %s', str(module_name))
      t.daemon = True
      t.start()

  # If there are new jobs in the global_queue a new message is generated and
  # sent to the instance queue
  def run(self):
    while True:

        # (1) get last job from global_queue
        # (2) create new message for addressed module
        # (3) get addresed queue object from modules dictonary
        # (4) put instance_queue_element which was generated before (2) to the
        #     instance_queue of module

        global_queue_element = self.global_queue.get(True) # (1)

        # (2)
        instance_queue_element = {
          'module_from_port':  global_queue_element.get('module_from_port'),
          'module_from':  global_queue_element.get('module_from'),
          'module_rcpt':  global_queue_element.get('module_rcpt'),
          'module_addr':  global_queue_element.get('module_addr'),
          'cmd':          global_queue_element.get('cmd'),
          'opt_args':     global_queue_element.get('opt_args')
        }

        module_rcpt = instance_queue_element.get('module_rcpt') # (3)
        self.logger.debug("Message from " + str(global_queue_element.get('module_from')) + " to " + str(global_queue_element.get('module_rcpt')) + " transmitted")
        self.modules[ module_rcpt ]["instance_queue"].put( instance_queue_element ) # (4)



#
# This starts the hole stuff ;)
#
if __name__ == '__main__':
  m = Hasip()
  m.run()
