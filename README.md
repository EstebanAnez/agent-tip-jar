# Agent Tip Jar

**Tell Claude who to tip in plain English. It sends SOL with an onchain memo and hands you the receipt.**

Runs on Solana devnet. No real funds involved.

## Demo

A real devnet tip of 0.01 SOL to `test` with the memo "thanks for the workshop":

[View the transaction on Solana Explorer](https://explorer.solana.com/tx/3rjySbBGocuFV9xqUsHbCxyt9WUHFhCmUDxcvGQw2fSfL17axDLgse7fUGWnDW56rpr9ycUQeCGqkxxX9auR3PG2?cluster=devnet)

The transfer and the memo land in a single transaction, so the message is permanently attached to the payment.

## How it works

1. **Ask.** Tell Claude Code something like "tip test 0.01 SOL and say thanks for the workshop".
2. **Claude Code + Solana MCP.** Claude uses the Solana Developer MCP for current docs and turns your request into a `npm run tip` command.
3. **One transaction.** `tip.ts` looks up the handle in `tips.json`, then sends a System program transfer plus a Memo program instruction in one transaction.
4. **Receipt.** The script prints a Solana Explorer link so you can verify the tip and memo onchain.

## Quick start

Requires Node.js 22.6 or newer (Node 24 recommended) so `.ts` files run directly.

```bash
git clone https://github.com/EstebanAnez/agent-tip-jar.git
cd agent-tip-jar
npm install
```

Create and fund your sender wallet:

```bash
npm run keygen
```

This writes `devnet-keypair.json` and prints its address. Paste that address into [faucet.solana.com](https://faucet.solana.com) and request devnet SOL.

Send a tip:

```bash
npm run tip test 0.01 "thanks"
```

Add your own handles by copying `tips.example.json` to `tips.json` and filling in devnet addresses.

> `devnet-keypair.json` holds your private key and is git-ignored. Never commit it.

## Tech stack

- [@solana/kit](https://github.com/anza-xyz/kit) 8 with plugin clients (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`)
- `@solana-program/system` for the SOL transfer
- `@solana-program/memo` for the onchain message (Memo program)
- [Solana Developer MCP](https://mcp.solana.com) for up-to-date docs inside the agent
- [Claude Code](https://claude.com/claude-code) as the agent
- [pay.sh](https://pay.sh) x402 / MPP payments (in progress)

## Roadmap

- **pay.sh paid API calls:** let the agent pay for an API call over HTTP 402, then tip onchain in the same flow.
- **Pay per answer API:** charge a small amount per answer through x402 and route tips to contributors.

## Built at

- UBC 2026
- UT Austin
- Solana workshop by [brimigs](https://github.com/brimigs/workshop)

## License

[MIT](LICENSE)
