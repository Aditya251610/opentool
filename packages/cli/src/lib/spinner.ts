// Non-interactive terminal spinner with elapsed time display.

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const isTTY = process.stderr.isTTY && !process.env.NO_COLOR

export interface SpinnerHandle {
  update(text: string): void
  stop(finalText?: string): void
}

export function createSpinner(text: string): SpinnerHandle {
  if (!isTTY) {
    process.stderr.write(`  ${text}…\n`)
    return {
      update(_t: string) {},
      stop() {},
    }
  }

  const start = Date.now()
  let frame = 0
  let label = text

  const render = () => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const f = FRAMES[frame % FRAMES.length]
    process.stderr.write(`\r\x1b[K  \x1b[33m${f}\x1b[0m ${label}\x1b[2m (${elapsed}s)\x1b[0m`)
    frame++
  }

  const timer = setInterval(render, 80)
  render()

  return {
    update(t: string) {
      label = t
    },
    stop(finalText?: string) {
      clearInterval(timer)
      process.stderr.write('\r\x1b[K')
      if (finalText) {
        process.stderr.write(`${finalText}\n`)
      }
    },
  }
}

/**
 * Run an async function with a spinner.
 * Returns the result and elapsed time in ms.
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
): Promise<{ result: T; elapsedMs: number }> {
  const spinner = createSpinner(text)
  const start = Date.now()
  try {
    const result = await fn()
    const elapsedMs = Date.now() - start
    spinner.stop()
    return { result, elapsedMs }
  } catch (err) {
    spinner.stop()
    throw err
  }
}
