/**
 * Devnet tip jar: npm run tip <handle> <amountSol> "<memo>"
 * Handles live in tips.json. Sender keypair: ./devnet-keypair.json
 */
import { readFileSync } from 'node:fs';
import { address, createClient, lamports } from '@solana/kit';
import { solanaDevnetRpc } from '@solana/kit-plugin-rpc';
import { signerFromFile } from '@solana/kit-plugin-signer';
import { systemProgram } from '@solana-program/system';
import { getAddMemoInstruction } from '@solana-program/memo';

const [handle, amountSol, ...memoParts] = process.argv.slice(2);
// Joined + unquoted because Windows cmd.exe doesn't treat 'single quotes' as quoting.
const memo = memoParts.join(' ').replace(/^['"]|['"]$/g, '');

const tips: Record<string, string> = JSON.parse(readFileSync('./tips.json', 'utf8'));
const amount = Number(amountSol);
if (!handle || !(amount > 0)) {
    console.error('Usage: npm run tip <handle> <amountSol> "<memo>"');
    process.exit(1);
}
if (!tips[handle]) {
    console.error(`Unknown handle "${handle}". Known: ${Object.keys(tips).join(', ')}`);
    process.exit(1);
}

const client = await createClient()
    .use(signerFromFile('./devnet-keypair.json'))
    .use(solanaDevnetRpc())
    .use(systemProgram());

const { context } = await client.sendTransaction([
    client.system.instructions.transferSol({
        source: client.payer,
        destination: address(tips[handle]),
        amount: lamports(BigInt(Math.round(amount * 1e9))),
    }),
    ...(memo ? [getAddMemoInstruction({ memo, signers: [client.payer] })] : []),
]);

console.log(`💸 Tipped ${handle} ${amountSol} SOL${memo ? `: "${memo}"` : ''}`);
console.log(`🔎 https://explorer.solana.com/tx/${context.signature}?cluster=devnet`);
