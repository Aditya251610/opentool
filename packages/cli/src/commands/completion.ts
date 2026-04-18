// Shell completion script generation — `opentool completion`
// Supports bash, zsh, and fish.

import type { Command } from 'commander'
import { c, emitOk, emitErr, sym } from '../lib/format.js'

export type CompletionShell = 'bash' | 'zsh' | 'fish'

const SUPPORTED_SHELLS: CompletionShell[] = ['bash', 'zsh', 'fish']

function detectShell(): CompletionShell {
  const shell = process.env.SHELL ?? ''
  if (shell.includes('zsh')) return 'zsh'
  if (shell.includes('fish')) return 'fish'
  return 'bash'
}

function generateBashCompletion(program: Command): string {
  const name = program.name()
  const commands = program.commands.map((c) => c.name())
  const globalOpts = program.options.map((o) => o.long ?? o.short ?? '').filter(Boolean)

  return `# bash completion for ${name}
# Add to ~/.bashrc: eval "$(${name} completion --shell bash)"

_${name}_completions() {
  local cur prev commands opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${commands.join(' ')}"
  opts="${globalOpts.join(' ')}"

  case "\${prev}" in
${program.commands
  .map((cmd) => {
    const subOpts = cmd.options.map((o) => o.long ?? o.short ?? '').filter(Boolean)
    return `    ${cmd.name()})
      COMPREPLY=( $(compgen -W "${subOpts.join(' ')}" -- "\${cur}") )
      return 0
      ;;`
  })
  .join('\n')}
  esac

  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
    return 0
  fi

  COMPREPLY=( $(compgen -W "\${commands} \${opts}" -- "\${cur}") )
}

complete -o default -F _${name}_completions ${name}
`
}

function generateZshCompletion(program: Command): string {
  const name = program.name()

  const subcommands = program.commands
    .map((cmd) => {
      const desc = cmd.description().replace(/'/g, "\\'")
      return `'${cmd.name()}:${desc}'`
    })
    .join('\n      ')

  const subFunctions = program.commands
    .map((cmd) => {
      const opts = cmd.options
        .map((o) => {
          const flag = o.long ?? o.short ?? ''
          const desc = o.description
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
          return `'${flag}[${desc}]'`
        })
        .join('\n      ')
      return `(${cmd.name()})
      _arguments -s \\
        ${opts || "'*:'"} ;;`
    })
    .join('\n    ')

  return `#compdef ${name}
# zsh completion for ${name}
# Add to ~/.zshrc: eval "$(${name} completion --shell zsh)"

_${name}() {
  local -a commands
  commands=(
    ${subcommands}
  )

  _arguments -C \\
    '1:command:->cmds' \\
    '*::arg:->args'

  case $state in
    cmds)
      _describe 'command' commands ;;
    args)
      case $words[1] in
        ${subFunctions}
      esac ;;
  esac
}

compdef _${name} ${name}
`
}

function generateFishCompletion(program: Command): string {
  const name = program.name()
  const lines: string[] = [
    `# fish completion for ${name}`,
    `# Add to ~/.config/fish/completions/${name}.fish`,
    '',
  ]

  // Root subcommands
  for (const cmd of program.commands) {
    const desc = cmd.description().replace(/'/g, "\\'")
    lines.push(`complete -c ${name} -n "__fish_use_subcommand" -a "${cmd.name()}" -d '${desc}'`)
  }

  // Root global options
  for (const opt of program.options) {
    const flag = opt.long?.replace(/^--/, '') ?? opt.short?.replace(/^-/, '') ?? ''
    const desc = opt.description.replace(/'/g, "\\'")
    if (opt.long) {
      lines.push(`complete -c ${name} -n "__fish_use_subcommand" -l "${flag}" -d '${desc}'`)
    }
  }

  // Subcommand options
  for (const cmd of program.commands) {
    for (const opt of cmd.options) {
      const flag = opt.long?.replace(/^--/, '') ?? opt.short?.replace(/^-/, '') ?? ''
      const desc = opt.description.replace(/'/g, "\\'")
      if (opt.long) {
        lines.push(
          `complete -c ${name} -n "__fish_seen_subcommand_from ${cmd.name()}" -l "${flag}" -d '${desc}'`,
        )
      }
      if (opt.short && opt.short !== opt.long) {
        const shortFlag = opt.short.replace(/^-/, '')
        lines.push(
          `complete -c ${name} -n "__fish_seen_subcommand_from ${cmd.name()}" -s "${shortFlag}" -d '${desc}'`,
        )
      }
    }
  }

  return lines.join('\n') + '\n'
}

export function generateCompletion(program: Command, shell?: string): string {
  const resolved = (shell as CompletionShell) ?? detectShell()
  switch (resolved) {
    case 'zsh':
      return generateZshCompletion(program)
    case 'fish':
      return generateFishCompletion(program)
    case 'bash':
    default:
      return generateBashCompletion(program)
  }
}

export function registerCompletionCommand(program: Command): void {
  program
    .command('completion')
    .description('generate shell completion script (bash, zsh, fish)')
    .option('-s, --shell <shell>', 'target shell (bash, zsh, fish)')
    .option('--install', 'print installation instructions')
    .action((opts) => {
      const shell = (opts.shell as CompletionShell) ?? detectShell()

      if (!SUPPORTED_SHELLS.includes(shell)) {
        emitErr(`Unsupported shell: ${shell}`, `Supported: ${SUPPORTED_SHELLS.join(', ')}`)
        process.exit(1)
      }

      if (opts.install) {
        const name = program.name()
        process.stdout.write(`\n  ${c.bold('Shell completion setup')}\n\n`)
        switch (shell) {
          case 'bash':
            process.stdout.write(
              `  Add to ${c.cyan('~/.bashrc')}:\n` +
                `  ${c.gray(`eval "$(${name} completion --shell bash)"`)}\n\n`,
            )
            break
          case 'zsh':
            process.stdout.write(
              `  Add to ${c.cyan('~/.zshrc')}:\n` +
                `  ${c.gray(`eval "$(${name} completion --shell zsh)"`)}\n\n`,
            )
            break
          case 'fish':
            process.stdout.write(
              `  Run once:\n` +
                `  ${c.gray(`${name} completion --shell fish > ~/.config/fish/completions/${name}.fish`)}\n\n`,
            )
            break
        }
        emitOk(`Shell: ${c.cyan(shell)}`)
        return
      }

      const script = generateCompletion(program, shell)
      process.stdout.write(script)
    })
}
