// Airbitz context stuff:
import { internal, makeContext, PasswordError } from 'airbitz-core-js'
import { makeNodeIo } from 'airbitz-io-node-js'
const { objectAssign, rejectify } = internal

// Commands:
import { command, UsageError } from '../command.js'
import '../commands/all.js'

// Command-line tools:
import chalk from 'chalk'
import fs from 'fs'
import Getopt from 'node-getopt'
import path from 'path'
import sourceMapSupport from 'source-map-support'
import xdgBasedir from 'xdg-basedir'

// Display the original source location for errors:
sourceMapSupport.install()

// Program options:
const getopt = new Getopt([
  ['k', 'api-key=ARG', 'Auth server API key'],
  ['a', 'app-id=ARG', 'appId'],
  ['', 'auth-server=ARG', 'Auth server URI'],
  ['c', 'config=ARG', 'Configuration file'],
  ['d', 'directory=ARG', 'Working directory'],
  ['u', 'username=ARG', 'Username'],
  ['p', 'password=ARG', 'Password'],
  ['w', 'wallet=ARG', 'Wallet ID'],
  ['h', 'help', 'Display options']
])

const helpCommand = command(
  'help',
  {
    usage: '[command]',
    help: 'Displays help for any command'
  },
  function (session, argv) {
    if (argv.length > 1) throw new UsageError(this, 'Too many parameters')

    if (argv.length === 1) {
      // Command help:
      const cmd = command.find(argv[0])
      console.log('Usage: ' + cmd.usage)
      if (cmd.help != null) {
        console.log(cmd.help)
      }
    } else {
      // Program help:
      getopt.showHelp()
      console.log('Available commands:')
      command.list().forEach(name => {
        const cmd = command.find(name)
        let line = '  ' + name
        if (cmd.help != null) {
          line += '\t- ' + cmd.help
        }
        console.log(line)
      })
    }
  }
)

/**
 * Loads the config file,
 * and returns its contents merged with the command-line options.
 */
function loadConfig (options) {
  // Locate all config files:
  const configPaths = xdgBasedir.configDirs
    .reverse()
    .map(dir => path.join(dir, '/airbitz/airbitz.conf'))
    .filter(path => fs.existsSync(path))
  if (options.config != null) {
    configPaths.push(options.config)
  }

  // Load and merge the config files:
  const configFiles = configPaths.map(path => {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf8'))
    } catch (x) {
      const e = new Error(`Cannot load config file "${options.config}"`)
      e.type = 'ConfigError'
      throw e
    }
  })
  const config = objectAssign({}, ...configFiles)

  // Calculate the active settings:
  return {
    appId: options['app-id'] || config['appId'],
    apiKey: options['api-key'] || config['apiKey'],
    authServer: options['auth-server'] || config['authServer'],
    directory: options['directory'] || config['workingDir'],
    username: options['username'] || config['username'],
    password: options['password'] || config['password']
  }
}

/**
 * Sets up a session object with the Airbitz objects
 * needed by the command.
 * @return a promise
 */
function makeSession (config, cmd) {
  const session = {}
  let out = Promise.resolve(session)

  // Create a context if we need one:
  if (cmd.needsContext) {
    // API key:
    if (config.apiKey == null) {
      throw new UsageError(cmd, 'No API key')
    }
    session.context = makeContext({
      appId: config.appId,
      apiKey: config.apiKey,
      authServer: config.authServer,
      io: makeNodeIo(config.directory || './.cli')
    })
  }

  // Create a login if we need one:
  if (cmd.needsLogin) {
    out = out.then(session => {
      if (config.username == null || config.password == null) {
        throw new UsageError(cmd, 'No login credentials')
      }

      return session.context
        .loginWithPassword(config.username, config.password, null, {})
        .then(account => {
          session.account = account
          session.login = account.login
          return session
        })
    })
  }

  return out
}

/**
 * Parses the options and invokes the requested command.
 */
function main () {
  const opt = getopt.parseSystem()

  // Look up the command:
  const cmd = opt.options['help'] || !opt.argv.length
    ? helpCommand
    : command.find(opt.argv.shift())

  // Load the config file:
  const config = loadConfig(opt.options)

  // Set up the session:
  return makeSession(config, cmd).then(session => {
    // Invoke the command:
    return cmd.invoke(session, opt.argv)
  })
}

// Invoke the main function with error reporting:
rejectify(main)().catch(e => {
  if (e.type != null) {
    // This is a known error, so just show the message:
    console.error(chalk.red(e.message))

    // Special handling for particular error types:
    switch (e.type) {
      case UsageError.type:
        if (e.command != null) {
          console.error(`Usage: ${e.command.usage}`)
        }
        break
      case PasswordError.name:
        if (e.wait) {
          console.error(`Please try again in ${e.wait} seconds`)
        }
        break
    }
  } else {
    // This is an unexpected crash error, so show a stack trace:
    console.error(chalk.red('Unexpected error'))
    console.error(e)
  }
  process.exit(1)
})
