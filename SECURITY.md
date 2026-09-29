# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

Use **Security → Report a vulnerability** on this repository's GitHub page. Include what you found, how to reproduce it, and whether it affects the Node server, the Cloudflare Worker, or both.

You should get a first answer within a week.

## Scope

In scope: the bawksync server in this repository.

For the bawkterm app, report to [bawkterm](https://github.com/juddisjudd/bawkterm).

By design, the server never sees decrypted data. A report that someone holding a valid token can overwrite or delete records in that token's space is expected behavior. See "What the server can and cannot do" in the [README](README.md).

## Supported versions

Only the latest commit on `main` gets security fixes.
