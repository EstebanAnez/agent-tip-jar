/**
 * Devnet tip jar: npm run tip <handle> <amountSol> "<memo>"
 * Handles live in tips.json. Sender keypair: ./devnet-keypair.json
 */
import { explorerTx, loadTips, sendSolWithMemo } from './solana.ts';

const [handle, amountSol, ...memoParts] = process.argv.slice(2);
// Joined + unquoted because Windows cmd.exe doesn't treat 'single quotes' as quoting.
const memo = memoParts.join(' ').replace(/^['"]|['"]$/g, '');

const tips = loadTips();
const amount = Number(amountSol);
if (!handle || !(amount > 0)) {
    console.error('Usage: npm run tip <handle> <amountSol> "<memo>"');
    process.exit(1);
}
if (!tips[handle]) {
    console.error(`Unknown handle "${handle}". Known: ${Object.keys(tips).join(', ')}`);
    process.exit(1);
}

const signature = await sendSolWithMemo(tips[handle], amount, memo || undefined);
console.log(`💸 Tipped ${handle} ${amountSol} SOL${memo ? `: "${memo}"` : ''}`);
console.log(`🔎 ${explorerTx(signature)}`);
