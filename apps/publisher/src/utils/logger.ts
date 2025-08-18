import chalk from 'chalk';

export class Logger {
  private static isVerbose(): boolean {
    return process.env.VERBOSE === 'true';
  }

  private static isQuiet(): boolean {
    return process.env.QUIET === 'true';
  }

  static log(message: string): void {
    if (!this.isQuiet()) {
      console.log(message);
    }
  }

  static info(message: string): void {
    if (!this.isQuiet()) {
      console.log(chalk.blue('ℹ'), message);
    }
  }

  static success(message: string): void {
    if (!this.isQuiet()) {
      console.log(chalk.green('✓'), message);
    }
  }

  static warning(message: string): void {
    // Warnings are shown even in quiet mode
    console.log(chalk.yellow('⚠'), message);
  }

  static error(message: string, error?: any): void {
    // Errors are always shown
    console.error(chalk.red('✗'), message);
    if (this.isVerbose() && error) {
      console.error(chalk.gray('Stack trace:'));
      console.error(error);
    }
  }

  static debug(message: string): void {
    if (this.isVerbose()) {
      console.log(chalk.gray('[DEBUG]'), message);
    }
  }

  static verbose(message: string): void {
    if (this.isVerbose()) {
      console.log(chalk.gray(message));
    }
  }

  static table(data: any[]): void {
    if (!this.isQuiet()) {
      console.table(data);
    }
  }

  static json(data: any): void {
    // JSON output ignores quiet mode for piping
    console.log(JSON.stringify(data, null, 2));
  }
}