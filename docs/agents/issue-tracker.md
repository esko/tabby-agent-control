# Issue tracker

This repository tracks implementation work in GitHub Issues for `esko/tabby-agent-control`.

Use the `gh` CLI from the repository root when creating or reading issues:

```bash
gh issue list --repo esko/tabby-agent-control
gh issue view <number> --repo esko/tabby-agent-control
gh issue create --repo esko/tabby-agent-control --title "<title>" --body-file <file> --label "<label>"
```

Implementation issues should be small vertical slices, link back to the parent PRD issue when there is one, and include acceptance criteria that an AFK agent can verify.

Pull requests should reference the issue they close and keep feature work scoped to that issue.
