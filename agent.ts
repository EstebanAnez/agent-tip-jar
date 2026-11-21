/**
 * Agent flow: npm run agent (start the API first with npm run server)
 * 1. Call the paid API and get a 402 challenge.
 * 2. Pay it on devnet (transfer + memo nonce in one tx) and retry with X-Payment.
 * 3. Tip "test" 0.01 SOL with an onchain memo.
 */
import { explorerTx, loadTips, sendSolWithMemo } from './solana.ts';

const API = process.env.API_URL ?? 'http://localhost:4021/fortune';
const MAX_PRICE_SOL = 0.01; // never auto-pay more than this

type Challenge = { price: number; currency: string; network: string; payTo: string; memo: string };

const first = await fetch(API);
if (first.status !== 402) throw new Error(`Expected 402, got ${first.status}: ${await first.text()}`);
const challenge = (await first.json()) as Challenge;
console.log(`🧾 402 Payment Required: ${challenge.price} ${challenge.currency} to ${challenge.payTo} (memo ${challenge.memo})`);

if (challenge.currency !== 'SOL' || challenge.network !== 'solana-devnet') throw new Error('Refusing: not SOL on devnet');
if (!(challenge.price > 0 && challenge.price <= MAX_PRICE_SOL)) throw new Error(`Refusing: price ${challenge.price} over cap ${MAX_PRICE_SOL}`);

const paymentSig = await sendSolWithMemo(challenge.payTo, challenge.price, challenge.memo);
console.log(`💳 Paid ${challenge.price} SOL`);

const paid = await fetch(API, { headers: { 'X-Payment': paymentSig } });
const body = await paid.json();
if (paid.status !== 200) throw new Error(`Payment not accepted (${paid.status}): ${JSON.stringify(body)}`);
console.log(`🔮 Paid answer: ${body.fortune}`);

const tipMemo = 'paid via x402 + tipped onchain';
const tipSig = await sendSolWithMemo(loadTips().test, 0.01, tipMemo);
console.log(`💸 Tipped test 0.01 SOL: "${tipMemo}"`);

console.log('\nReceipts');
console.log(`  API payment: ${explorerTx(paymentSig)}`);
console.log(`  Tip:         ${explorerTx(tipSig)}`);
