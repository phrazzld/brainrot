# Security Guidelines and Best Practices

## Overview

This document outlines security best practices for the Brainrot Publishing House platform, with a focus on preventing command injection vulnerabilities and maintaining secure code patterns throughout the codebase.

## Command Injection Prevention

### Background

Command injection vulnerabilities occur when user-controlled input is passed directly to system commands without proper sanitization. In our platform, the primary risk was in the pandoc converters that transform Markdown to various output formats (PDF, EPUB).

### The Vulnerability

The original implementation used dangerous patterns that could allow arbitrary command execution:

```typescript
// ❌ UNSAFE: Never use exec() with string concatenation
import { exec } from "child_process";

const metadata = {
  title: userInput.title, // Could contain: "; rm -rf /"
  author: userInput.author, // Could contain: "| cat /etc/passwd"
};

exec(`pandoc --metadata title="${metadata.title}" input.md -o output.pdf`);
```

### The Fix

We implemented multiple layers of defense to prevent command injection:

#### 1. Use spawn() Instead of exec()

```typescript
// ✅ SAFE: Use spawn() with argument arrays
import { spawn } from "child_process";

const args = [
  "--sandbox", // Security flag
  "--metadata",
  `title=${title}`, // Arguments as array elements
  "--metadata",
  `author=${author}`,
  "-o",
  outputPath,
  inputPath,
];

const pandoc = spawn("pandoc", args, { shell: false }); // Never use shell
```

#### 2. Metadata Sanitization

```typescript
// ✅ SAFE: Strict allowlist and validation
const METADATA_ALLOWLIST = ["title", "author", "date", "language", "publisher"];
const SAFE_CHAR_REGEX = /^[a-zA-Z0-9\s\-_.,'"()!?:;/@#&]+$/;

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Only allow whitelisted fields
    if (!METADATA_ALLOWLIST.includes(key)) {
      console.error(
        `[SECURITY] Rejected metadata field not in allowlist: ${key}`,
      );
      continue;
    }

    // Convert to string and validate
    const strValue = String(value || "").trim();

    // Reject values with dangerous characters
    if (!SAFE_CHAR_REGEX.test(strValue)) {
      console.error(
        `[SECURITY] Rejected metadata value with unsafe characters: ${key}="${strValue}"`,
      );
      continue;
    }

    sanitized[key] = strValue;
  }

  return sanitized;
}
```

#### 3. Sandbox Mode

All pandoc executions now run with the `--sandbox` flag as the first argument:

```typescript
const args = [
  "--sandbox", // CRITICAL: Always first argument
  // ... other arguments
];
```

This prevents pandoc from:

- Reading files outside the working directory
- Making network requests
- Executing external programs
- Using Lua filters that could be malicious

## Safe vs Unsafe Patterns

### Process Execution

```typescript
// ❌ UNSAFE PATTERNS - NEVER USE THESE:

// 1. Using exec() with string concatenation
exec(`command ${userInput}`);

// 2. Using shell: true
spawn("command", args, { shell: true });

// 3. Building command strings
const cmd = `pandoc ${options} ${input}`;
exec(cmd);

// 4. Template literals with user input
exec(`convert "${fileName}" output.pdf`);
```

```typescript
// ✅ SAFE PATTERNS - ALWAYS USE THESE:

// 1. spawn() with argument arrays
spawn("command", ["--option", value], { shell: false });

// 2. execFile() for known executables
execFile("/usr/bin/pandoc", args);

// 3. Validate all inputs
if (VALID_OPTIONS.includes(option)) {
  args.push("--" + option);
}

// 4. Use absolute paths when possible
const pandocPath = "/usr/local/bin/pandoc";
spawn(pandocPath, args);
```

### Input Validation

```typescript
// ❌ UNSAFE: Accepting any input
function processFile(filename: string) {
  return spawn("cat", [filename]); // Could read /etc/passwd
}

// ✅ SAFE: Validate and restrict paths
function processFile(filename: string) {
  // Validate filename format
  if (!/^[a-zA-Z0-9-_]+\.(md|txt)$/.test(filename)) {
    throw new Error("Invalid filename");
  }

  // Ensure file is in allowed directory
  const safePath = path.join(ALLOWED_DIR, path.basename(filename));

  // Verify resolved path is still in allowed directory
  if (!safePath.startsWith(ALLOWED_DIR)) {
    throw new Error("Path traversal detected");
  }

  return spawn("cat", [safePath]);
}
```

### Dangerous Characters to Block

Always reject or escape these characters in user input that will be used in commands:

```typescript
const DANGEROUS_CHARS = [
  ";", // Command separator
  "|", // Pipe
  "&", // Background/chain commands
  "$", // Variable expansion
  "`", // Command substitution (backticks)
  "\\", // Escape character
  "\n", // Newline (can break out of quotes)
  "\r", // Carriage return
  ">", // Redirect output
  "<", // Redirect input
  "(", // Subshell
  ")", // Subshell
  "{", // Brace expansion
  "}", // Brace expansion
  "[", // Glob pattern
  "]", // Glob pattern
  "*", // Wildcard
  "?", // Wildcard
  "~", // Home directory expansion
  "!", // History expansion (in some shells)
];
```

## Security Checklist

Use this checklist when reviewing code changes that involve:

- External process execution
- File system operations
- User input processing

### Pre-Commit Checklist

- [ ] **No exec() or execSync()** - Use spawn() or execFile() instead
- [ ] **No shell: true** - Always use `{ shell: false }` with spawn()
- [ ] **Input validation** - All user inputs validated against allowlists
- [ ] **No string concatenation** - Command arguments passed as arrays
- [ ] **Path validation** - File paths restricted to allowed directories
- [ ] **Metadata sanitization** - All metadata fields sanitized before use
- [ ] **Dangerous character blocking** - Shell metacharacters rejected
- [ ] **Sandbox mode** - External tools run in restricted mode when available
- [ ] **Absolute paths** - Use absolute paths for executables when possible
- [ ] **Error logging** - Security rejections logged for monitoring

### Code Review Checklist

- [ ] **Verify spawn() usage** - Check all process spawning uses safe patterns
- [ ] **Check argument construction** - Ensure no string interpolation in arguments
- [ ] **Review validation logic** - Confirm allowlists are comprehensive
- [ ] **Test with malicious input** - Try injection attempts in test suite
- [ ] **Verify sandbox flags** - Confirm security flags are present
- [ ] **Check error handling** - Ensure errors don't leak sensitive info
- [ ] **Review logging** - Confirm security events are logged
- [ ] **Dependency audit** - Run `npm audit` to check for vulnerable packages

### Testing Security

```typescript
// Example security test cases
describe("Security Tests", () => {
  const dangerousInputs = [
    "; rm -rf /",
    "| cat /etc/passwd",
    "$(whoami)",
    "`ls -la`",
    "../../../etc/passwd",
    "test && echo hacked",
    "test || echo failed",
    "test; echo done",
  ];

  test.each(dangerousInputs)(
    "should reject dangerous input: %s",
    async (input) => {
      await expect(processUserInput(input)).rejects.toThrow(/unsafe|invalid/i);
    },
  );
});
```

## Security Tools and Resources

### Automated Security Scanning

1. **npm audit** - Run regularly to check for vulnerable dependencies

   ```bash
   npm audit
   npm audit fix  # Auto-fix when safe
   ```

2. **Semgrep** - Static analysis for security patterns

   ```bash
   semgrep --config=auto .
   ```

3. **GitHub Security** - Enable Dependabot and code scanning
   - Dependabot alerts for vulnerable dependencies
   - Secret scanning to prevent credential leaks
   - Code scanning with CodeQL

### Security Headers

For web applications, implement security headers:

```typescript
// Next.js security headers example
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';",
  },
];
```

## Incident Response

If a security vulnerability is discovered:

1. **Immediate Actions**
   - Assess the severity and potential impact
   - If critical, consider taking affected services offline
   - Begin working on a patch immediately

2. **Communication**
   - Notify the security team
   - Document the vulnerability and fix
   - Prepare disclosure timeline if needed

3. **Remediation**
   - Deploy the security patch
   - Audit logs for exploitation attempts
   - Review similar code for the same vulnerability

4. **Post-Incident**
   - Update this security document
   - Add test cases to prevent regression
   - Consider security training if needed

## Security Contacts

- Security Team: security@brainrotpublishing.com
- Bug Bounty Program: bounty@brainrotpublishing.com
- Security Advisories: https://github.com/phrazzld/brainrot/security/advisories

## Further Reading

- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [GitHub Security Features](https://docs.github.com/en/code-security)

---

_Last Updated: 2025-08-27_  
_Version: 1.0_
