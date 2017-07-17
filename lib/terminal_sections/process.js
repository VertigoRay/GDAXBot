/**
 *
 * Process monitor sensor
 *
 * (c) 2014 James Hall
 */
'use strict'

const os = require('os')

const plugin = {
  /**
   * * This appears in the title of the graph
   */
  title: 'Process List',
  description: `
    This returns a process list, grouped by executable name. CPU % is divided by the number of cores.
    100% CPU Usage is all cores being maxed out. Unlike other tools that define the maximum as 800% for 8 cores for example.`,
  /**
   * The type of sensor
   * @type {String}
   */
  type: 'table',
  /**
   * The default interval time in ms that this plugin should be polled.
   * More costly benchmarks should be polled less frequently.
   */
  interval: 2000,

  initialized: false,

  sort: 'cpu',

  columns: ['Command', 'CPU %', 'Count', 'Memory %'],
  currentValue: [{
    'Command': 'Google Chrome',
    'Count': '4',
    'CPU %': '0.4',
    'Memory %': '1'
  }, {
    'Command': 'Sublime Text 2',
    'Count': '1',
    'CPU %': '0.1',
    'Memory': '5'
  }],

  /**
   * Grab the current value for the table
   */
  poll () {
    const stats = {}
    // @todo If you can think of a better way of getting process stats,
    // then please feel free to send me a pull request. This is version 0.1
    // and needs some love.
  }
}
module.exports = exports = plugin