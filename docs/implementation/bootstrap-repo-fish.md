# Bootstrap repo with fish

Example only; adjust owner/name as needed.

```fish
set repo tabby-agent-control
gh repo create $repo --private --clone
cd $repo

mkdir -p packages/cli/src docs .github/ISSUE_TEMPLATE
cp -R /path/to/docs-bundle/* .

git add .
git commit -m "docs: add initial product and implementation plan"
git push -u origin main
```

Suggested Node setup:

```fish
npm init -y
npm install -D typescript tsx vitest @types/node
npm install commander zod toml
```

Add scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```
