from ConfigParser import ConfigParser
from lib.base.modules import *
import threading
import time, os
from apscheduler.scheduler import Scheduler
#from apscheduler.jobstores.shelve_store import ShelveJobStore
import logging
from lib.base.general import ConfigItemReader, ConfigJobReader


class Sched(Basemodule):
    # ################################################################################
    # initialization of module and optional load of config files
    # ################################################################################
    def __init__(self, instance_queue, global_queue):
        #
        # "sched|port|command or action"
        #
        self.logger = logging.getLogger('Hasip.sched')
        self.sched = Scheduler()
        self.items = ConfigItemReader()
        self.jobs_config = ConfigJobReader()
        self.mod_list = self.items.get_items_dict()  # getting module list from item file
        self.queue_identifier = 'sched'  # this is the 'module address'
        self.instance_queue = instance_queue  # worker queue to receive jobs
        self.global_queue = global_queue  # queue to communicate back to main thread
        self.jobstore = {}
        self.sched.start()

        # read jobs configuration
        self.jobstore = self.jobs_config.get_jobs_dict()
        for job in self.jobstore.keys():
            self.logger.debug(self.jobstore[job][2])
            self.sched.add_cron_job(self.send_msg,
                                    name=job,
                                    year=self.jobstore[job][2],
                                    month=self.jobstore[job][3],
                                    day=self.jobstore[job][4],
                                    week=self.jobstore[job][5],
                                    day_of_week=self.jobstore[job][6],
                                    hour=self.jobstore[job][7],
                                    minute=self.jobstore[job][8],
                                    second=self.jobstore[job][9],
                                    args=(self.jobstore[job][0], self.jobstore[job][1]))

    # ################################################################################
    # main thread of this module file which runs in background and constantly checks working queue for new tasks.
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
                "create": self.create,
                "delete": self.delete,
                "list_jobs": self.list_jobs
            }
            options[_action](_sender, _senderport, _port, _optargs)

    # ################################################################################
    #
    # "private" methods from here on...
    #
    # ################################################################################
    #Function to put jobs in the running scheduler job queue and store them persistent

    def create(self, sender, senderport, port, optargs):
        if optargs.get('name') in self.jobstore:
            self.delete(sender, senderport, port, optargs.get('name'))
        self.sched.add_cron_job(self.send_msg,
                                name=optargs.get('name'),
                                year=optargs.get('year'),
                                month=optargs.get('month'),
                                day=optargs.get('day'),
                                week=optargs.get('week'),
                                day_of_week=optargs.get('day_of_week'),
                                hour=optargs.get('hour'),
                                minute=optargs.get('minute'),
                                second=optargs.get('second'),
                                args=(optargs.get('module'), optargs.get('action')))
        self.jobstore.update(
            {
                optargs.get('name'): [
                    optargs.get('module'),
                    optargs.get('action'),
                    optargs.get('year'),
                    optargs.get('month'),
                    optargs.get('day'),
                    optargs.get('week'),
                    optargs.get('day_of_week'),
                    optargs.get('hour'),
                    optargs.get('minute'),
                    optargs.get('second')
                ]
            }
        )
        self.write_to_config()

    def delete(self, sender, senderport, port, optargs):
        for job in self.sched.get_jobs():
            if job.name == optargs:
                self.sched.unschedule_job(job)
                del self.jobstore[job.name]
                self.write_to_config()

    def list_jobs(self, sender, senderport, port, optargs):
        dict1 = {}
        string = []
        for job in self.jobstore.keys():
            dict1['jobname'] = job
            dict1['device'] = self.jobstore[job][0]
            dict1['action'] = self.jobstore[job][1]
            dict1['year'] = self.jobstore[job][2]
            dict1['month'] = self.jobstore[job][3]
            dict1['day'] = self.jobstore[job][4]
            dict1['week'] = self.jobstore[job][5]
            dict1['day_of_week'] = self.jobstore[job][6]
            dict1['hour'] = self.jobstore[job][7]
            dict1['min'] = self.jobstore[job][8]
            dict1['sec'] = self.jobstore[job][9]
            string.append(dict1.copy())
            dict1.clear()
        self.logger.debug("help")
        queue_msg = {
            'module_from_port': str(port),
            'module_from': self.queue_identifier,
            'module_rcpt': sender,
            'module_addr': senderport,
            'cmd': 'reply',
            'opt_args': string
        }
        self.global_queue.put(queue_msg)

    def send_msg(self, module, action):  # ########################################
        if module in self.mod_list.keys():  # checking existence of requested module
            rcpt = self.mod_list[module][0]  # setting receiving module from item file
            mid = self.mod_list[module][1]  # setting module id from item file
            msg = {  # creating queue message
                     'module_from_port': 0,  # ########################################
                     'module_from': 'sched',
                     'module_rcpt': rcpt,
                     'module_addr': mid,
                     'cmd': action,
                     'opt_args': ''
            }
            self.global_queue.put(msg)
    
    def write_to_config(self):
        with open('/home/hasip/hasip/config/jobs/example.jobs', 'w') as f:
            conf = ConfigParser()
            for job in self.jobstore.keys():
                try:
                    conf.add_section(job)
                except Exception:
                    pass
                conf.set(job.upper(), 'module', self.jobstore[job][0])
                conf.set(job.upper(), 'action', self.jobstore[job][1])
                conf.set(job.upper(), 'year', self.jobstore[job][2])
                conf.set(job.upper(), 'month', self.jobstore[job][3])
                conf.set(job.upper(), 'week', self.jobstore[job][4])
                conf.set(job.upper(), 'day', self.jobstore[job][5])
                conf.set(job.upper(), 'day_of_week', self.jobstore[job][6])
                conf.set(job.upper(), 'hour', self.jobstore[job][7])
                conf.set(job.upper(), 'minute', self.jobstore[job][8])
                conf.set(job.upper(), 'second', self.jobstore[job][9])
            conf.write(f)
